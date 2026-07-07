import type { PresetConfig } from '../presets/types';
import type { StandaloneLocalContentSettings } from '../stores/settings';
import { createStandaloneRuntimeWorldbookContext } from './standaloneLocalContent';
import {
  StandaloneRuntimeMessagesSchema,
  StandaloneRuntimeSessionSchema,
  type StandaloneRuntimeMessages,
  type StandaloneRuntimeSession,
} from './standaloneRuntimeSchemas';
import { createStandaloneRuntimePromptAssetSnapshot } from './standaloneTavernPreset';

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

  return {
    worldbook_context: createStandaloneRuntimeWorldbookContext({
      preset,
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

  return persistStandaloneRuntimePayload({
    session,
    messages,
  });
}

export function createStandaloneRuntimeBaselineFromStores(seedStatData: unknown): RuntimeBootstrapPayload {
  return createStandaloneRuntimeBaseline(seedStatData, getStandaloneRuntimeStoreContextInput());
}

export function commitStandaloneRuntimeState(input: StandaloneRuntimeCommitInput = {}): RuntimeBootstrapPayload {
  const parsedStatData =
    typeof input.statData === 'undefined' ? undefined : getStandaloneStatSchema().parse(input.statData);
  const currentSession = loadStandaloneRuntimeSession() ?? createSeededStandaloneRuntimeSession(parsedStatData ?? {});
  const session = StandaloneRuntimeSessionSchema.parse({
    ...currentSession,
    ...(input.contentContext ? buildStandaloneRuntimeContentContext(input.contentContext) : {}),
    ...(parsedStatData ? { stat_data: parsedStatData } : {}),
    updatedAt: new Date().toISOString(),
  });
  const messages = normalizeStandaloneRuntimeMessagesForSession(session.id, input.messages);

  return persistStandaloneRuntimePayload({
    session,
    messages,
  });
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
    const stored = localStorage.getItem(STANDALONE_RUNTIME_SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return StandaloneRuntimeSessionSchema.parse(JSON.parse(stored));
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
  localStorage.setItem(
    STANDALONE_RUNTIME_SESSION_STORAGE_KEY,
    JSON.stringify(StandaloneRuntimeSessionSchema.parse(session)),
  );
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

export function loadStandaloneRuntimeMessages(): StandaloneRuntimeMessages | null {
  try {
    const stored = localStorage.getItem(STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return StandaloneRuntimeMessagesSchema.parse(JSON.parse(stored));
  } catch (error) {
    console.warn('[1980s-standalone] 读取本地 runtime messages 失败，已回退为空消息集:', error);
    return null;
  }
}

export function persistStandaloneRuntimeMessages(messages: StandaloneRuntimeMessages): void {
  localStorage.setItem(
    STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY,
    JSON.stringify(StandaloneRuntimeMessagesSchema.parse(messages)),
  );
}

export function clearStandaloneRuntimeMessages(): void {
  localStorage.removeItem(STANDALONE_RUNTIME_MESSAGES_STORAGE_KEY);
}

export function clearStandaloneRuntimeSession(): void {
  localStorage.removeItem(STANDALONE_RUNTIME_SESSION_STORAGE_KEY);
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
  const currentSession = loadStandaloneRuntimeSession() ?? createSeededStandaloneRuntimeSession(parsedSeed);
  const session = StandaloneRuntimeSessionSchema.parse({
    ...currentSession,
    ...(contentContext ? buildStandaloneRuntimeContentContext(contentContext) : {}),
  });
  const messages = normalizeStandaloneRuntimeMessagesForSession(session.id);

  return persistStandaloneRuntimePayload({
    session,
    messages,
  });
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
