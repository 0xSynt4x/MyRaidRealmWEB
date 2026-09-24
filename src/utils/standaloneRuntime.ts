import type { LocalContentEntryConfig, PresetConfig } from '../presets/types';
import type { StandaloneLocalContentSettings } from '../stores/settings';
import { createStandaloneRuntimeWorldbookContext } from './standaloneLocalContent';
import {
  StandaloneRuntimeMessagesSchema,
  StandaloneRuntimeSessionSchema,
  type StandaloneRuntimeMessages,
  type StandaloneRuntimeSession,
} from './standaloneRuntimeSchemas';
import { createStandaloneRuntimePromptAssetSnapshot } from './standaloneTavernPreset';
import { readStorageSync, removeStorageSync, writeStorageSync } from './standaloneStorage';

const STANDALONE_RUNTIME_SESSION_STORAGE_KEY = 'th1980s:standalone-runtime-session';
const STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY = 'th1980s:standalone-runtime-messages';

type RuntimeBootstrapPayload = {
  session: StandaloneRuntimeSession;
  messages: StandaloneRuntimeMessages;
};

type StandaloneRuntimeCommitInput = {
  statData?: unknown;
  messages?: StandaloneRuntimeMessages | null;
  contentContext?: StandaloneRuntimeContentContextInput;
};

type StandaloneRuntimeRestoreInput = {
  session: StandaloneRuntimeSession;
  messages: StandaloneRuntimeMessages;
};

type StandaloneRuntimeContentContextInput = {
  preset?: PresetConfig | null;
  /** 玩家手填的世界书条目（存在会话里，没预设时靠它把内容送进提示词） */
  customEntries?: LocalContentEntryConfig[] | null;
  standaloneLocalContent?: StandaloneLocalContentSettings | null;
  sendFullPreset?: boolean;
};

function getStandaloneRuntimeStoreContextInput(): StandaloneRuntimeContentContextInput {
  const { useSetupStore } = require('../stores/setup') as typeof import('../stores/setup');
  const { useSettingsStore } = require('../stores/settings') as typeof import('../stores/settings');

  const setupStore = useSetupStore();
  const settingsStore = useSettingsStore();

  return {
    preset: setupStore.selectedPreset,
    customEntries: setupStore.customWorldbookEntries,
    standaloneLocalContent: settingsStore.standaloneLocalContent,
    sendFullPreset: true,
  };
}

function getStandaloneStatSchema() {
  return (require('../../schema/schema.ts') as typeof import('../../schema/schema')).Schema;
}

function createRuntimeId(prefix: 'session'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSeededStandaloneRuntimeSession(seedStatData: unknown): StandaloneRuntimeSession {
  const timestamp = new Date().toISOString();
  const parsedSeed = getStandaloneStatSchema().parse(seedStatData);
  return StandaloneRuntimeSessionSchema.parse({
    id: createRuntimeId('session'),
    createdAt: timestamp,
    updatedAt: timestamp,
    browser_owner: 'standalone-app',
    stat_data: parsedSeed,
    initial_stat_data: parsedSeed,
    worldbook_context: [],
    custom_worldbook_entries: [],
    prompt_assets: null,
    preset_meta: null,
  });
}

function buildStandaloneRuntimePresetMeta(preset: PresetConfig | null | undefined) {
  if (!preset) {
    return null;
  }

  return {
    id: preset.id,
    name: preset.name,
    icon: preset.icon,
    category: preset.category,
    tags: [...preset.tags],
    description: preset.description,
    localContentEntryCount: Array.isArray(preset.localContentEntries) ? preset.localContentEntries.length : 0,
  };
}

function buildStandaloneRuntimeContentContext(input: StandaloneRuntimeContentContextInput) {
  const preset = input.preset ?? null;
  const enabledAssets = input.standaloneLocalContent?.enabledAssets ?? {};
  const builtinAssetRouteOverrides = input.standaloneLocalContent?.builtinAssetRouteOverrides ?? {};
  const customEntries = input.customEntries ?? [];

  return {
    worldbook_context: createStandaloneRuntimeWorldbookContext({
      preset,
      customEntries,
      enabledMap: enabledAssets,
      builtinRouteOverrides: builtinAssetRouteOverrides,
    }),
    prompt_assets: createStandaloneRuntimePromptAssetSnapshot(Boolean(input.sendFullPreset)),
    preset_meta: buildStandaloneRuntimePresetMeta(preset),
  };
}

export function createSeededStandaloneRuntimeMessages(sessionId: string): StandaloneRuntimeMessages {
  return StandaloneRuntimeMessagesSchema.parse({
    session_id: sessionId,
    next_message_id: 0,
    records: [],
  });
}

function normalizeStandaloneRuntimeMessagesForSession(
  sessionId: string,
  messages?: StandaloneRuntimeMessages | null,
): StandaloneRuntimeMessages {
  const parsedMessages = messages ? StandaloneRuntimeMessagesSchema.parse(messages) : loadStandaloneRuntimeMessages();

  if (!parsedMessages || parsedMessages.session_id !== sessionId) {
    return createSeededStandaloneRuntimeMessages(sessionId);
  }

  return parsedMessages;
}

function persistStandaloneRuntimePayload(payload: RuntimeBootstrapPayload): RuntimeBootstrapPayload {
  const session = StandaloneRuntimeSessionSchema.parse(payload.session);
  const messages = StandaloneRuntimeMessagesSchema.parse(payload.messages);

  if (messages.session_id !== session.id) {
    throw new Error('standalone runtime session 与 messages 不匹配，无法提交运行时状态');
  }

  persistStandaloneRuntimeSession(session);
  persistStandaloneRuntimeMessages(messages);

  return {
    session,
    messages,
  };
}

/**
 * 会话建立后，把只留在内存里的「预设记忆」补写到会话作用域下。
 *
 * 「选中预设」发生在会话建立之前（会话是点「开始游戏」才建的），
 * 那时只能留在内存；这里补写一次，刷新后才读得回来。
 */
function flushSetupStateToCurrentSession(): void {
  try {
    const { useSetupStore } = require('../stores/setup') as typeof import('../stores/setup');
    const setupStore = useSetupStore();
    setupStore.flushSelectedPresetToStorage();
    setupStore.flushCustomWorldbookEntriesToStorage();
  } catch (error) {
    console.warn('[1980s-standalone] 会话建立后补写开局状态失败:', error);
  }
}

export function createStandaloneRuntimeBaseline(
  seedStatData: unknown,
  contentContext?: StandaloneRuntimeContentContextInput,
): RuntimeBootstrapPayload {
  const parsedSeed = getStandaloneStatSchema().parse(seedStatData);
  const seededSession = createSeededStandaloneRuntimeSession(parsedSeed);
  const session = StandaloneRuntimeSessionSchema.parse({
    ...seededSession,
    ...(contentContext ? buildStandaloneRuntimeContentContext(contentContext) : {}),
    stat_data: parsedSeed,
    initial_stat_data: parsedSeed,
  });
  const messages = createSeededStandaloneRuntimeMessages(session.id);

  const payload = persistStandaloneRuntimePayload({
    session,
    messages,
  });

  // 会话到这里才算建立，补写之前写不进去的预设记忆
  flushSetupStateToCurrentSession();

  return payload;
}

export function createStandaloneRuntimeBaselineFromStores(seedStatData: unknown): RuntimeBootstrapPayload {
  return createStandaloneRuntimeBaseline(seedStatData, getStandaloneRuntimeStoreContextInput());
}

export function commitStandaloneRuntimeState(input: StandaloneRuntimeCommitInput = {}): RuntimeBootstrapPayload {
  const parsedStatData =
    typeof input.statData === 'undefined' ? undefined : getStandaloneStatSchema().parse(input.statData);
  const storedSession = loadStandaloneRuntimeSession();
  const currentSession = storedSession ?? createSeededStandaloneRuntimeSession(parsedStatData ?? {});
  const session = StandaloneRuntimeSessionSchema.parse({
    ...currentSession,
    ...(input.contentContext ? buildStandaloneRuntimeContentContext(input.contentContext) : {}),
    ...(parsedStatData ? { stat_data: parsedStatData } : {}),
    updatedAt: new Date().toISOString(),
  });
  const messages = normalizeStandaloneRuntimeMessagesForSession(session.id, input.messages);

  const payload = persistStandaloneRuntimePayload({
    session,
    messages,
  });

  // 这里也可能第一次建立会话（会话丢失后重建），同样要补写预设记忆
  if (!storedSession) {
    flushSetupStateToCurrentSession();
  }

  return payload;
}

export function commitStandaloneRuntimeStateFromStores(
  input: Omit<StandaloneRuntimeCommitInput, 'contentContext'> = {},
): RuntimeBootstrapPayload {
  return commitStandaloneRuntimeState({
    ...input,
    contentContext: getStandaloneRuntimeStoreContextInput(),
  });
}

export function restoreStandaloneRuntimeState(input: StandaloneRuntimeRestoreInput): RuntimeBootstrapPayload {
  return persistStandaloneRuntimePayload({
    session: input.session,
    messages: input.messages,
  });
}

export function loadStandaloneRuntimeSession(): StandaloneRuntimeSession | null {
  try {
    const stored = readStorageSync<unknown>(STANDALONE_RUNTIME_SESSION_STORAGE_KEY);
    if (stored === null) {
      return null;
    }

    return StandaloneRuntimeSessionSchema.parse(stored);
  } catch (error) {
    console.warn('[1980s-standalone] 读取本地 runtime session 失败，已回退为新会话:', error);
    return null;
  }
}

export function resolveStandaloneRuntimeSessionStatData(): ReturnType<
  ReturnType<typeof getStandaloneStatSchema>['parse']
> | null {
  const session = loadStandaloneRuntimeSession();
  if (!session) {
    return null;
  }

  return getStandaloneStatSchema().parse(session.stat_data);
}

export function persistStandaloneRuntimeSession(session: StandaloneRuntimeSession): void {
  writeStorageSync(STANDALONE_RUNTIME_SESSION_STORAGE_KEY, StandaloneRuntimeSessionSchema.parse(session));
}

export function patchStandaloneRuntimeSessionContext(
  input: StandaloneRuntimeContentContextInput,
): StandaloneRuntimeSession {
  return commitStandaloneRuntimeState({
    contentContext: input,
  }).session;
}

export function patchStandaloneRuntimeSessionContextFromStores(): StandaloneRuntimeSession {
  return patchStandaloneRuntimeSessionContext(getStandaloneRuntimeStoreContextInput());
}

/** 阶段总结 + 归档水位线：跟着会话存，读档时一起回来 */
export type StandaloneStageSummaryState = {
  /** 已经压好的整体剧情摘要，空串＝还没归档过 */
  stageSummary: string;
  /** message_id 小于等于它的回合已被上面那段覆盖，不再单独进提示词 */
  archivedUntilMessageId: number;
};

export function resolveStandaloneStageSummaryState(): StandaloneStageSummaryState {
  const session = loadStandaloneRuntimeSession();

  return {
    stageSummary: session?.stage_summary ?? '',
    archivedUntilMessageId: session?.stage_summary_archived_until_message_id ?? -1,
  };
}

export function persistStandaloneStageSummary(input: StandaloneStageSummaryState): StandaloneStageSummaryState {
  const session = loadStandaloneRuntimeSession();

  if (!session) {
    throw new Error('当前没有可写入的会话，无法归档阶段总结');
  }

  const nextSession = StandaloneRuntimeSessionSchema.parse({
    ...session,
    stage_summary: input.stageSummary,
    stage_summary_archived_until_message_id: input.archivedUntilMessageId,
    updatedAt: new Date().toISOString(),
  });

  persistStandaloneRuntimeSession(nextSession);

  return {
    stageSummary: nextSession.stage_summary,
    archivedUntilMessageId: nextSession.stage_summary_archived_until_message_id,
  };
}

export function loadStandaloneRuntimeMessages(): StandaloneRuntimeMessages | null {
  try {
    const stored = readStorageSync<unknown>(STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY);
    if (stored === null) {
      return null;
    }

    return StandaloneRuntimeMessagesSchema.parse(stored);
  } catch (error) {
    console.warn('[1980s-standalone] 读取本地 runtime messages 失败，已回退为空消息集:', error);
    return null;
  }
}

export function persistStandaloneRuntimeMessages(messages: StandaloneRuntimeMessages): void {
  writeStorageSync(STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY, StandaloneRuntimeMessagesSchema.parse(messages));
}

export function clearStandaloneRuntimeMessages(): void {
  removeStorageSync(STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY);
}

export function clearStandaloneRuntimeSession(): void {
  removeStorageSync(STANDALONE_RUNTIME_SESSION_STORAGE_KEY);
}

export function clearStandaloneRuntimeState(): void {
  clearStandaloneRuntimeSession();
  clearStandaloneRuntimeMessages();
}

export function ensureStandaloneRuntimeBootstrap(
  seedStatData: unknown,
  contentContext?: StandaloneRuntimeContentContextInput,
): RuntimeBootstrapPayload {
  const parsedSeed = getStandaloneStatSchema().parse(seedStatData);
  const storedSession = loadStandaloneRuntimeSession();
  const currentSession = storedSession ?? createSeededStandaloneRuntimeSession(parsedSeed);
  const session = StandaloneRuntimeSessionSchema.parse({
    ...currentSession,
    ...(contentContext ? buildStandaloneRuntimeContentContext(contentContext) : {}),
  });
  const messages = normalizeStandaloneRuntimeMessagesForSession(session.id);

  const payload = persistStandaloneRuntimePayload({
    session,
    messages,
  });

  // 🔴 会话真正的建立点就在这（选预设时消息落盘会走到这）。
  // 会话一建立，立刻把之前写不进去的预设记忆 / 手填条目补写到会话作用域下。
  if (!storedSession) {
    flushSetupStateToCurrentSession();
  }

  return payload;
}

export function ensureStandaloneRuntimeBootstrapFromStores(seedStatData: unknown): RuntimeBootstrapPayload {
  return ensureStandaloneRuntimeBootstrap(seedStatData, getStandaloneRuntimeStoreContextInput());
}

export function ensureStandaloneRuntimeBaseline(
  seedStatData: unknown,
  contentContext?: StandaloneRuntimeContentContextInput,
): RuntimeBootstrapPayload {
  return ensureStandaloneRuntimeBootstrap(seedStatData, contentContext);
}

export function ensureStandaloneRuntimeBaselineFromStores(seedStatData: unknown): RuntimeBootstrapPayload {
  return ensureStandaloneRuntimeBootstrapFromStores(seedStatData);
}

export function syncStandaloneRuntimeSessionStatData(
  nextStatData: unknown,
  contentContext?: StandaloneRuntimeContentContextInput,
): StandaloneRuntimeSession {
  return commitStandaloneRuntimeState({
    statData: nextStatData,
    contentContext,
  }).session;
}

export function syncStandaloneRuntimeSessionStatDataFromStores(nextStatData: unknown): StandaloneRuntimeSession {
  return syncStandaloneRuntimeSessionStatData(nextStatData, getStandaloneRuntimeStoreContextInput());
}

export function getStandaloneRuntimeSessionStorageKey(): string {
  return STANDALONE_RUNTIME_SESSION_STORAGE_KEY;
}

export function getStandaloneRuntimeMessagesStorageKey(): string {
  return STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY;
}

export function getStandaloneRuntimeInitialStatData(): ReturnType<ReturnType<typeof getStandaloneStatSchema>['parse']> {
  const session = loadStandaloneRuntimeSession();
  return getStandaloneStatSchema().parse(session?.initial_stat_data ?? session?.stat_data ?? {});
}

export function getStandaloneRuntimeContentContext() {
  const session = loadStandaloneRuntimeSession();
  return {
    worldbookContext: session?.worldbook_context ?? [],
    promptAssets: session?.prompt_assets ?? null,
    presetMeta: session?.preset_meta ?? null,
  };
}
