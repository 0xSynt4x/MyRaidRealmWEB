import { klona } from 'klona';
import { Schema } from '../../schema/schema';
import type { PresetConfig } from '../presets/types';
import { rehydratePresetWithRegisteredWorldbooks } from '../assets/worldbook-registry';
import type { StandaloneLocalContentSettings } from '../stores/settings';
import { resolveStoredStandaloneLocalContentSettings } from '../stores/settings';
import { useMessagesStore } from '../stores/messages';
import { useSettingsStore } from '../stores/settings';
import { useSetupStore } from '../stores/setup';
import { useStatDataStore } from '../stores/statData';
import {
  commitStandaloneRuntimeStateFromStores,
  ensureStandaloneRuntimeBaselineFromStores,
  loadStandaloneRuntimeMessages,
  restoreStandaloneRuntimeState,
} from './standaloneRuntime';
import { hasCompleteStandaloneApiConfig } from './standaloneProviderApi';
import {
  StandaloneRuntimeMessageRecordSchema,
  StandaloneRuntimeSessionSchema,
  type StandaloneRuntimeMessages,
  type StandaloneRuntimeMessageRecord,
  type StandaloneRuntimeSession,
} from './standaloneRuntimeSchemas';
import { loadStandaloneStatData, persistStandaloneStatData } from './standaloneStatData';
import {
  readLargeAsync,
  readStorageSync,
  removeLargeAsync,
  writeLargeAsync,
  writeStorageSync,
} from './standaloneStorage';

const STANDALONE_ARCHIVE_PENDING_RESUME_KEY = 'th1980s:standalone-archive-pending-resume';
const STANDALONE_ARCHIVE_RESTORED_EVENT = 'th1980s:standalone-archive-restored';

export interface StandaloneArchiveFile {
  version: '3.0.0';
  mode: 'standalone-runtime';
  archiveId: string;
  createdAt: string;
  summary: string;
  currentChatId: string;
  currentMessageIds: number[];
  floorSnapshots: StandaloneRuntimeMessageRecord[];
  currentVariableSnapshot: StandaloneRuntimeSession['stat_data'];
  session: StandaloneRuntimeSession;
  selectedPreset: PresetConfig | null;
  standaloneLocalContent: StandaloneLocalContentSettings | null;
  sendFullPreset: boolean;
}

export interface StandaloneArchiveListItem {
  id: string;
  createdAt: string;
  summary: string;
  presetName: string;
  messageCount: number;
  updatedAt: string;
}

export interface PendingStandaloneArchiveResumeState {
  archiveId: string;
  restoredAt: string;
}

export interface StandaloneArchiveRestoreOutcome {
  archiveId: string;
  resumedImmediately: boolean;
  requiresSettingsResume: boolean;
}

export type StandaloneArchiveFeedbackMode = 'restore' | 'import';

function escapeArchiveToastText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatArchiveSummaryForToast(summary: string): string {
  return escapeArchiveToastText((summary ?? '').trim());
}

export function getStandaloneArchiveFeedbackMessageKey(input: {
  scope: 'setup' | 'contentCenter';
  mode: StandaloneArchiveFeedbackMode;
  outcome: StandaloneArchiveRestoreOutcome;
}): string {
  const action = input.mode === 'import' ? 'Import' : 'Restore';
  const state = input.outcome.resumedImmediately ? 'ResumeNow' : 'NeedsSettings';
  const scopePrefix = input.scope === 'setup' ? 'setup.standalone' : 'contentCenter';
  return `${scopePrefix}.archive${action}${state}`;
}

function dispatchStandaloneArchiveRestored(outcome: StandaloneArchiveRestoreOutcome): void {
  window.dispatchEvent(
    new CustomEvent<StandaloneArchiveRestoreOutcome>(STANDALONE_ARCHIVE_RESTORED_EVENT, {
      detail: outcome,
    }),
  );
}

export function getStandaloneArchiveRestoredEventName(): string {
  return STANDALONE_ARCHIVE_RESTORED_EVENT;
}

const STANDALONE_ARCHIVE_INDEX_STORAGE_KEY = 'th1980s:standalone-archive-index';
const STANDALONE_ARCHIVE_STORAGE_KEY_PREFIX = 'th1980s:standalone-archive:';
const STANDALONE_ARCHIVE_DEBUG_PRUNE_FLAG_KEY = 'th1980s:standalone-archive-debug-pruned';

function buildArchiveFileName(date: Date): string {
  const iso = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `MRS-archive-${iso}.json`;
}

function buildStandaloneArchiveStorageKey(id: string): string {
  return `${STANDALONE_ARCHIVE_STORAGE_KEY_PREFIX}${id}`;
}

function hasReadyStandaloneGenerationApis(): boolean {
  const settingsStore = useSettingsStore();
  return (
    hasCompleteStandaloneApiConfig(settingsStore.mainApi) &&
    settingsStore.assistantApis.some(api => hasCompleteStandaloneApiConfig(api))
  );
}

function persistPendingStandaloneArchiveResume(state: PendingStandaloneArchiveResumeState): void {
  localStorage.setItem(STANDALONE_ARCHIVE_PENDING_RESUME_KEY, JSON.stringify(state));
}

export function loadPendingStandaloneArchiveResume(): PendingStandaloneArchiveResumeState | null {
  try {
    const stored = localStorage.getItem(STANDALONE_ARCHIVE_PENDING_RESUME_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<PendingStandaloneArchiveResumeState>;
    if (!parsed || typeof parsed.archiveId !== 'string' || typeof parsed.restoredAt !== 'string') {
      return null;
    }

    return {
      archiveId: parsed.archiveId,
      restoredAt: parsed.restoredAt,
    };
  } catch (error) {
    console.warn('[Archive] 读取待继续存档状态失败:', error);
    return null;
  }
}

export function clearPendingStandaloneArchiveResume(): void {
  localStorage.removeItem(STANDALONE_ARCHIVE_PENDING_RESUME_KEY);
}

function createStandaloneArchiveId(): string {
  return `standalone-archive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function triggerJsonDownload(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function hasSameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertStandaloneArchiveSnapshotConsistency(
  session: StandaloneRuntimeSession,
  messages: StandaloneRuntimeMessages,
): void {
  if (messages.session_id !== session.id) {
    throw new Error('当前消息楼层与当前聊天编号不一致，请先刷新当前局面后再保存');
  }

  const messageIds = messages.records.map(record => record.message_id);
  if (new Set(messageIds).size !== messageIds.length) {
    throw new Error('当前消息楼层编号存在重复，无法生成完整快照');
  }
}

function buildStandaloneRuntimeMessagesFromArchivePayload(payload: StandaloneArchiveFile): StandaloneRuntimeMessages {
  const floorSnapshotsById = new Map<number, StandaloneRuntimeMessageRecord>();
  payload.floorSnapshots.forEach(snapshot => {
    floorSnapshotsById.set(snapshot.message_id, snapshot);
  });

  return {
    session_id: payload.currentChatId,
    next_message_id: payload.currentMessageIds.length > 0 ? Math.max(...payload.currentMessageIds) + 1 : 0,
    records: payload.currentMessageIds.map(messageId => {
      // 旧存档里可能带着调试记录，这里一并丢掉，免得恢复后又把数 MB 的调试信息写回本地
      const record = klona(floorSnapshotsById.get(messageId)!);
      delete record.debug_trace;
      return record;
    }),
  };
}

function isStandaloneArchiveFile(data: unknown): data is StandaloneArchiveFile {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const archive = data as Record<string, unknown>;
  if (
    archive.mode !== 'standalone-runtime' ||
    archive.version !== '3.0.0' ||
    typeof archive.archiveId !== 'string' ||
    typeof archive.createdAt !== 'string' ||
    typeof archive.summary !== 'string' ||
    typeof archive.currentChatId !== 'string' ||
    !Array.isArray(archive.currentMessageIds) ||
    !Array.isArray(archive.floorSnapshots) ||
    !archive.session ||
    typeof archive.session !== 'object' ||
    typeof archive.sendFullPreset !== 'boolean'
  ) {
    return false;
  }

  if (
    typeof archive.selectedPreset !== 'undefined' &&
    archive.selectedPreset !== null &&
    typeof archive.selectedPreset !== 'object'
  ) {
    return false;
  }

  if (
    typeof archive.standaloneLocalContent !== 'undefined' &&
    archive.standaloneLocalContent !== null &&
    typeof archive.standaloneLocalContent !== 'object'
  ) {
    return false;
  }

  try {
    const currentMessageIds = archive.currentMessageIds.map(messageId => {
      if (!Number.isInteger(messageId) || messageId < 0) {
        throw new Error('currentMessageIds must be non-negative integers');
      }

      return messageId;
    });
    const floorSnapshots = archive.floorSnapshots.map(snapshot => StandaloneRuntimeMessageRecordSchema.parse(snapshot));
    const session = StandaloneRuntimeSessionSchema.parse(archive.session);
    const currentVariableSnapshot = Schema.parse(archive.currentVariableSnapshot ?? {});
    const snapshotMessageIds = floorSnapshots.map(snapshot => snapshot.message_id);

    if (new Set(currentMessageIds).size !== currentMessageIds.length) {
      throw new Error('currentMessageIds must be unique');
    }

    if (
      currentMessageIds.length !== snapshotMessageIds.length ||
      currentMessageIds.some((messageId, index) => messageId !== snapshotMessageIds[index])
    ) {
      throw new Error('currentMessageIds must match floorSnapshots in order');
    }

    if (session.id !== archive.currentChatId) {
      throw new Error('currentChatId must match session.id');
    }

    if (!hasSameJsonValue(session.stat_data, currentVariableSnapshot)) {
      throw new Error('currentVariableSnapshot must match session.stat_data');
    }

    return true;
  } catch (error) {
    console.warn('[Archive] 独立模式存档格式无效或版本不受支持:', error);
    return false;
  }
}

function readStandaloneArchiveIndex(): StandaloneArchiveListItem[] {
  try {
    const parsed = readStorageSync<unknown>(STANDALONE_ARCHIVE_INDEX_STORAGE_KEY);
    return Array.isArray(parsed) ? (parsed as StandaloneArchiveListItem[]) : [];
  } catch (error) {
    console.warn('[Archive] 读取独立模式存档目录失败:', error);
    return [];
  }
}

function writeStandaloneArchiveIndex(index: StandaloneArchiveListItem[]): void {
  writeStorageSync(STANDALONE_ARCHIVE_INDEX_STORAGE_KEY, index);
}

async function writeStandaloneArchivePayload(payload: StandaloneArchiveFile): Promise<void> {
  await writeLargeAsync(buildStandaloneArchiveStorageKey(payload.archiveId), payload);
}

/**
 * 剔掉一份存档载荷里的调试记录，返回是否真的动过。
 *
 * 调试记录是排查用的临时信息，跟存档语义无关，老版本会把它一起打包（单条可达数 MB）。
 */
function pruneArchivePayloadDebugTraces(payload: StandaloneArchiveFile): boolean {
  if (!payload || !Array.isArray(payload.floorSnapshots)) {
    return false;
  }

  let changed = false;
  for (const snapshot of payload.floorSnapshots) {
    if (snapshot.debug_trace) {
      delete snapshot.debug_trace;
      changed = true;
    }
  }

  return changed;
}

async function readStandaloneArchivePayload(archiveId: string): Promise<StandaloneArchiveFile | null> {
  try {
    const parsed = await readLargeAsync<unknown>(buildStandaloneArchiveStorageKey(archiveId));
    if (parsed === null) {
      return null;
    }

    if (!isStandaloneArchiveFile(parsed)) {
      console.warn('[Archive] 独立模式存档格式无效，已忽略:', archiveId);
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[Archive] 读取独立模式存档失败:', error);
    return null;
  }
}

function getStandaloneArchiveSummary(
  session: StandaloneRuntimeSession,
  messages: StandaloneRuntimeMessages,
  preset: PresetConfig | null,
): string {
  const lastAssistant = messages.records
    .slice()
    .reverse()
    .find(record => record.role === 'assistant');
  const playerName = session.stat_data?.玩家?.姓名?.trim?.() || '未命名角色';
  const location = session.stat_data?.世界?.空间定位?.当前位置?.trim?.() || '未知地点';
  const worldTime = session.stat_data?.世界?.时间系统?.当前时间?.trim?.() || '未知时间';
  const presetName = preset?.name || session.preset_meta?.name || '未记录预设';
  const preview = lastAssistant?.content_text?.trim() || lastAssistant?.summary_content?.trim() || '';
  const compactPreview = preview.replace(/\s+/g, ' ').slice(0, 80);
  return compactPreview
    ? `${playerName}｜${location}｜${worldTime}｜${presetName}｜${compactPreview}`
    : `${playerName}｜${location}｜${worldTime}｜${presetName}`;
}

function buildStandaloneArchivePayload(): StandaloneArchiveFile {
  const settingsStore = useSettingsStore();
  const setupStore = useSetupStore();
  const bootstrap = ensureStandaloneRuntimeBaselineFromStores(loadStandaloneStatData());
  const runtimeMessages = loadStandaloneRuntimeMessages() ?? bootstrap.messages;
  assertStandaloneArchiveSnapshotConsistency(bootstrap.session, runtimeMessages);
  const floorSnapshots = runtimeMessages.records.map(record => {
    // 🔴 存档不打包调试记录：它是排查用的临时信息，单条可达数 MB，与存档语义无关。
    const parsed = klona(StandaloneRuntimeMessageRecordSchema.parse(record));
    delete parsed.debug_trace;
    return parsed;
  });
  const currentMessageIds = floorSnapshots.map(record => record.message_id);
  const archiveId = createStandaloneArchiveId();
  const createdAt = new Date().toISOString();
  const selectedPreset = setupStore.selectedPreset ? klona(setupStore.selectedPreset) : null;
  const standaloneLocalContent = settingsStore.standaloneLocalContent
    ? klona(settingsStore.standaloneLocalContent)
    : null;

  return {
    version: '3.0.0',
    mode: 'standalone-runtime',
    archiveId,
    createdAt,
    summary: getStandaloneArchiveSummary(bootstrap.session, runtimeMessages, selectedPreset),
    currentChatId: bootstrap.session.id,
    currentMessageIds,
    floorSnapshots,
    currentVariableSnapshot: klona(bootstrap.session.stat_data),
    session: klona(bootstrap.session),
    selectedPreset,
    standaloneLocalContent,
    sendFullPreset: true,
  };
}

function applyStandaloneArchivePayloadToStores(payload: StandaloneArchiveFile): void {
  const settingsStore = useSettingsStore();
  const setupStore = useSetupStore();
  const messagesStore = useMessagesStore();
  const statDataStore = useStatDataStore();
  const normalizedStandaloneLocalContent = resolveStoredStandaloneLocalContentSettings({
    storedSettings: payload.standaloneLocalContent,
    imagePromptEnabled: settingsStore.comfyUi.enabled,
    onlineModeEnabled: settingsStore.onlineModeEnabled,
  });
  const restoredSession = StandaloneRuntimeSessionSchema.parse({
    ...payload.session,
    id: payload.currentChatId,
    stat_data: payload.currentVariableSnapshot,
  });
  const restoredMessages = buildStandaloneRuntimeMessagesFromArchivePayload(payload);

  restoreStandaloneRuntimeState({
    session: restoredSession,
    messages: restoredMessages,
  });

  setupStore.selectedPreset = payload.selectedPreset
    ? rehydratePresetWithRegisteredWorldbooks(klona(payload.selectedPreset))
    : null;
  // 手填的世界书条目存在会话里，会话刚被换掉，重新读一遍
  setupStore.syncCustomWorldbookEntriesFromSession();
  Object.assign(setupStore.config, Schema.parse(klona(payload.currentVariableSnapshot)));

  settingsStore.standaloneLocalContent = klona(normalizedStandaloneLocalContent);
  // API 池与两处选择重新规范化落盘
  void settingsStore.persistApiPool();
  persistStandaloneStatData(payload.currentVariableSnapshot);
  commitStandaloneRuntimeStateFromStores({
    statData: payload.currentVariableSnapshot,
    messages: restoredMessages,
  });

  messagesStore.loadAllMessages();
  statDataStore.refreshData('archive_restore');
}

function buildStandaloneArchiveRestoreOutcome(archiveId: string): StandaloneArchiveRestoreOutcome {
  const resumedImmediately = hasReadyStandaloneGenerationApis();
  return {
    archiveId,
    resumedImmediately,
    requiresSettingsResume: !resumedImmediately,
  };
}

function applyStandaloneArchiveRestoreFlow(outcome: StandaloneArchiveRestoreOutcome): void {
  const setupStore = useSetupStore();

  if (outcome.resumedImmediately) {
    clearPendingStandaloneArchiveResume();
    return;
  }

  persistPendingStandaloneArchiveResume({
    archiveId: outcome.archiveId,
    restoredAt: new Date().toISOString(),
  });
  setupStore.goToPage('settings');
}

function restoreStandaloneArchivePayload(payload: StandaloneArchiveFile): StandaloneArchiveRestoreOutcome {
  applyStandaloneArchivePayloadToStores(payload);
  const outcome = buildStandaloneArchiveRestoreOutcome(payload.archiveId);
  applyStandaloneArchiveRestoreFlow(outcome);

  dispatchStandaloneArchiveRestored(outcome);

  return outcome;
}

function buildStandaloneArchiveListItem(payload: StandaloneArchiveFile): StandaloneArchiveListItem {
  return {
    id: payload.archiveId,
    createdAt: payload.createdAt,
    summary: payload.summary,
    presetName: payload.selectedPreset?.name || payload.session.preset_meta?.name || '未记录预设',
    messageCount: payload.currentMessageIds.length,
    updatedAt: payload.session.updatedAt,
  };
}

export function listStandaloneArchives(): StandaloneArchiveListItem[] {
  return readStandaloneArchiveIndex().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteStandaloneArchive(archiveId: string): Promise<void> {
  await removeLargeAsync(buildStandaloneArchiveStorageKey(archiveId));
  const nextIndex = readStandaloneArchiveIndex().filter(item => item.id !== archiveId);
  writeStandaloneArchiveIndex(nextIndex);
}

/**
 * 一次性自愈：把已经存在盘上的存档里的调试记录剔掉。
 *
 * 新存档本来就不带调试记录（见 buildStandaloneArchivePayload），所以这里只处理历史数据。
 * 处理完写个标记，之后启动直接跳过，不再把所有存档重读一遍。
 */
export async function pruneStandaloneArchiveDebugTraces(): Promise<void> {
  try {
    if (localStorage.getItem(STANDALONE_ARCHIVE_DEBUG_PRUNE_FLAG_KEY)) {
      return;
    }

    let prunedCount = 0;
    for (const item of readStandaloneArchiveIndex()) {
      const storageKey = buildStandaloneArchiveStorageKey(item.id);

      try {
        const payload = await readLargeAsync<StandaloneArchiveFile>(storageKey);
        if (payload && pruneArchivePayloadDebugTraces(payload)) {
          await writeLargeAsync(storageKey, payload);
          prunedCount += 1;
        }
      } catch (error) {
        console.warn('[Archive] 清理该存档的调试记录失败，已跳过:', item.id, error);
      }
    }

    localStorage.setItem(STANDALONE_ARCHIVE_DEBUG_PRUNE_FLAG_KEY, new Date().toISOString());
    if (prunedCount > 0) {
      console.info(`[Archive] 已清理 ${prunedCount} 个历史存档里的调试记录`);
    }
  } catch (error) {
    console.warn('[Archive] 清理历史存档调试记录失败:', error);
  }
}

export async function downloadStandaloneArchiveById(archiveId: string): Promise<void> {
  const payload = await readStandaloneArchivePayload(archiveId);
  if (!payload) {
    throw new Error('未找到对应的本地存档');
  }

  triggerJsonDownload(buildArchiveFileName(new Date(payload.createdAt)), payload);
}

export async function saveStandaloneArchiveSnapshot(): Promise<StandaloneArchiveListItem> {
  const payload = buildStandaloneArchivePayload();
  await writeStandaloneArchivePayload(payload);

  const nextEntry = buildStandaloneArchiveListItem(payload);
  const nextIndex = readStandaloneArchiveIndex().filter(item => item.id !== nextEntry.id);
  nextIndex.push(nextEntry);
  writeStandaloneArchiveIndex(nextIndex);
  return nextEntry;
}

export function exportStandaloneCurrentArchive(): void {
  const payload = buildStandaloneArchivePayload();
  triggerJsonDownload(buildArchiveFileName(new Date(payload.createdAt)), payload);
}

export async function restoreStandaloneArchiveById(archiveId: string): Promise<StandaloneArchiveRestoreOutcome> {
  const payload = await readStandaloneArchivePayload(archiveId);
  if (!payload) {
    throw new Error('未找到对应的本地存档');
  }

  return restoreStandaloneArchivePayload(payload);
}

export async function saveCurrentArchive(): Promise<void> {
  exportStandaloneCurrentArchive();
}

export async function importArchiveFile(file: File): Promise<StandaloneArchiveRestoreOutcome> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;

  if (isStandaloneArchiveFile(parsed)) {
    // 老存档可能带着调试记录，导入时归一化掉，别让它再落盘
    pruneArchivePayloadDebugTraces(parsed);
    await writeStandaloneArchivePayload(parsed);
    const importedEntry = buildStandaloneArchiveListItem(parsed);
    const nextIndex = readStandaloneArchiveIndex().filter(item => item.id !== importedEntry.id);
    nextIndex.push(importedEntry);
    writeStandaloneArchiveIndex(nextIndex);
    return restoreStandaloneArchivePayload(parsed);
  }

  throw new Error('当前仅支持导入这套完整快照归档文件，不支持旧版存档文件');
}
