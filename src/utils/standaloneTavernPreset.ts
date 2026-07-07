import rawStandaloneMainPreset from '../诸界穿越预设.json?raw';

export type StandaloneTavernPromptDefinition = {
  identifier?: string;
  name?: string;
  enabled?: boolean;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
};

export type StandaloneTavernPromptOrderItem = {
  identifier?: string;
  enabled?: boolean;
};

export type StandaloneTavernPresetDocument = {
  prompts?: StandaloneTavernPromptDefinition[];
  prompt_order?: Array<{
    order?: StandaloneTavernPromptOrderItem[];
  }>;
};

type ResolvedStandaloneTavernPrompt = StandaloneTavernPromptDefinition & {
  enabledInOrder: boolean;
  orderIndex: number;
};

export type StandaloneTavernPromptEntryType = 'marker' | 'system_prompt' | 'prompt';

export type StandaloneTavernPresetPromptView = {
  orderIndex: number;
  identifier: string;
  name: string;
  role: 'system' | 'user' | 'assistant' | 'unknown';
  enabledInOrder: boolean;
  sourceEnabled: boolean;
  systemPrompt: boolean;
  marker: boolean;
  entryType: StandaloneTavernPromptEntryType;
  content: string;
  contentPreview: string;
  hasContent: boolean;
};

export type StandaloneTavernPresetInspection = StandaloneTavernPresetSummary & {
  prompts: StandaloneTavernPresetPromptView[];
  disabledPromptCount: number;
  markerPromptCount: number;
  emptyContentPromptCount: number;
};

export type StandaloneTavernPresetSummary = {
  sourceName: string;
  parseOk: boolean;
  totalPromptCount: number;
  enabledPromptCount: number;
  systemPromptCount: number;
  userPromptCount: number;
  assistantPromptCount: number;
  containsActionOptionsRule: boolean;
};

export type StandaloneRuntimePromptAssetSnapshot = {
  sourceName: string;
  parseOk: boolean;
  mode: 'compact' | 'full';
  totalPromptCount: number;
  enabledPromptCount: number;
  systemPromptCount: number;
  userPromptCount: number;
  assistantPromptCount: number;
  containsActionOptionsRule: boolean;
};

const STANDALONE_TAVERN_PRESET_SOURCE_NAME = '诸界穿越预设.json';
const STANDALONE_TAVERN_PRESET_LIBRARY_STORAGE_KEY = 'th1980s:standalone-tavern-preset-library';
const STANDALONE_TAVERN_PRESET_OVERRIDE_STORAGE_KEY = 'th1980s:standalone-tavern-preset-override';
export const STANDALONE_TAVERN_PRESET_BUILTIN_ID = 'builtin:standalone-main';

const STANDALONE_TAVERN_PRESET_PREVIEW_LENGTH = 160;

export type ImportedStandaloneTavernPreset = {
  id: string;
  sourceName: string;
  importedAt: string;
  document: StandaloneTavernPresetDocument;
};

export type StandaloneTavernPresetLibraryItem = ImportedStandaloneTavernPreset & {
  kind: 'builtin' | 'imported';
};

export type StandaloneTavernPresetLibrary = {
  activePresetId: string;
  importedPresets: ImportedStandaloneTavernPreset[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseStandaloneTavernPresetDocument(
  rawPresetText: string | StandaloneTavernPresetDocument,
): StandaloneTavernPresetDocument {
  if (isRecord(rawPresetText)) {
    return rawPresetText as StandaloneTavernPresetDocument;
  }

  try {
    return JSON.parse(rawPresetText) as StandaloneTavernPresetDocument;
  } catch (error) {
    console.warn('[StandaloneTavernPreset] 解析酒馆预设失败，已回退为空对象:', error);
    return {};
  }
}

export const standaloneTavernPresetDocument = parseStandaloneTavernPresetDocument(rawStandaloneMainPreset);

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined';
}

function createBuiltinStandaloneTavernPresetItem(): StandaloneTavernPresetLibraryItem {
  return {
    id: STANDALONE_TAVERN_PRESET_BUILTIN_ID,
    kind: 'builtin',
    sourceName: STANDALONE_TAVERN_PRESET_SOURCE_NAME,
    importedAt: '',
    document: standaloneTavernPresetDocument,
  };
}

function normalizeImportedPreset(input: unknown): ImportedStandaloneTavernPreset | null {
  if (!isRecord(input) || typeof input.sourceName !== 'string' || !isRecord(input.document)) {
    return null;
  }

  return {
    id: typeof input.id === 'string' && input.id.trim() ? input.id : `imported:${Date.now()}`,
    sourceName: input.sourceName.trim() || '导入的酒馆预设.json',
    importedAt: typeof input.importedAt === 'string' ? input.importedAt : '',
    document: input.document as StandaloneTavernPresetDocument,
  };
}

function createEmptyPresetLibrary(): StandaloneTavernPresetLibrary {
  return {
    activePresetId: STANDALONE_TAVERN_PRESET_BUILTIN_ID,
    importedPresets: [],
  };
}

function cloneTavernPresetDocument(document: StandaloneTavernPresetDocument): StandaloneTavernPresetDocument {
  return JSON.parse(JSON.stringify(document)) as StandaloneTavernPresetDocument;
}

function migrateLegacyImportedPreset(): ImportedStandaloneTavernPreset | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const stored = localStorage.getItem(STANDALONE_TAVERN_PRESET_OVERRIDE_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return normalizeImportedPreset({
      ...JSON.parse(stored),
      id: `imported:legacy:${Date.now()}`,
    });
  } catch (error) {
    console.warn('[StandaloneTavernPreset] 读取导入酒馆预设失败，已使用内置预设:', error);
    return null;
  }
}

function persistStandaloneTavernPresetLibrary(library: StandaloneTavernPresetLibrary): void {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(STANDALONE_TAVERN_PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(library));
  localStorage.removeItem(STANDALONE_TAVERN_PRESET_OVERRIDE_STORAGE_KEY);
}

export function loadStandaloneTavernPresetLibrary(): StandaloneTavernPresetLibrary {
  if (!canUseLocalStorage()) {
    return createEmptyPresetLibrary();
  }

  try {
    const stored = localStorage.getItem(STANDALONE_TAVERN_PRESET_LIBRARY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StandaloneTavernPresetLibrary>;
      const importedPresets = Array.isArray(parsed.importedPresets)
        ? parsed.importedPresets
            .map(normalizeImportedPreset)
            .filter((preset): preset is ImportedStandaloneTavernPreset => Boolean(preset))
        : [];
      const activePresetId =
        typeof parsed.activePresetId === 'string' && parsed.activePresetId.trim()
          ? parsed.activePresetId
          : STANDALONE_TAVERN_PRESET_BUILTIN_ID;
      return {
        activePresetId,
        importedPresets,
      };
    }

    const migratedPreset = migrateLegacyImportedPreset();
    if (migratedPreset) {
      const migratedLibrary = {
        activePresetId: migratedPreset.id,
        importedPresets: [migratedPreset],
      };
      persistStandaloneTavernPresetLibrary(migratedLibrary);
      return migratedLibrary;
    }
  } catch (error) {
    console.warn('[StandaloneTavernPreset] 读取酒馆预设库失败，已使用内置预设:', error);
  }

  return createEmptyPresetLibrary();
}

export function getStandaloneTavernPresetLibraryItems(): StandaloneTavernPresetLibraryItem[] {
  const library = loadStandaloneTavernPresetLibrary();
  return [
    createBuiltinStandaloneTavernPresetItem(),
    ...library.importedPresets.map(preset => ({
      ...preset,
      kind: 'imported' as const,
    })),
  ];
}

export function getActiveStandaloneTavernPresetItem(): StandaloneTavernPresetLibraryItem {
  const library = loadStandaloneTavernPresetLibrary();
  return (
    getStandaloneTavernPresetLibraryItems().find(item => item.id === library.activePresetId) ??
    createBuiltinStandaloneTavernPresetItem()
  );
}

export function getActiveStandaloneTavernPresetDocument(): StandaloneTavernPresetDocument {
  return getActiveStandaloneTavernPresetItem().document;
}

export function getActiveStandaloneTavernPresetSourceName(): string {
  return getActiveStandaloneTavernPresetItem().sourceName;
}

export function saveImportedStandaloneTavernPreset(input: {
  sourceName: string;
  document: StandaloneTavernPresetDocument;
}): ImportedStandaloneTavernPreset {
  const payload: ImportedStandaloneTavernPreset = {
    id: `imported:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    sourceName: input.sourceName.trim() || '导入的酒馆预设.json',
    importedAt: new Date().toISOString(),
    document: input.document,
  };

  const library = loadStandaloneTavernPresetLibrary();
  persistStandaloneTavernPresetLibrary({
    activePresetId: library.activePresetId,
    importedPresets: [...library.importedPresets, payload],
  });

  return payload;
}

export function duplicateActiveStandaloneTavernPresetAsImported(): ImportedStandaloneTavernPreset {
  const activePreset = getActiveStandaloneTavernPresetItem();
  const baseName = activePreset.sourceName.replace(/\.json$/i, '').trim() || '酒馆预设';
  const importedPreset = saveImportedStandaloneTavernPreset({
    sourceName: `${baseName}-可编辑副本.json`,
    document: cloneTavernPresetDocument(activePreset.document),
  });
  selectStandaloneTavernPreset(importedPreset.id);
  return importedPreset;
}

export function updateImportedStandaloneTavernPreset(input: {
  presetId: string;
  sourceName?: string;
  document: StandaloneTavernPresetDocument;
}): void {
  const library = loadStandaloneTavernPresetLibrary();
  const importedPresets = library.importedPresets.map(preset => {
    if (preset.id !== input.presetId) {
      return preset;
    }

    return {
      ...preset,
      sourceName: input.sourceName?.trim() || preset.sourceName,
      document: cloneTavernPresetDocument(input.document),
    };
  });

  persistStandaloneTavernPresetLibrary({
    ...library,
    importedPresets,
  });
}

export function saveImportedStandaloneTavernPresetText(input: {
  sourceName: string;
  rawText: string;
}): ImportedStandaloneTavernPreset {
  const document = parseStandaloneTavernPresetDocument(input.rawText);
  return saveImportedStandaloneTavernPreset({ sourceName: input.sourceName, document });
}

export function clearImportedStandaloneTavernPreset(): void {
  persistStandaloneTavernPresetLibrary(createEmptyPresetLibrary());
}

export function selectStandaloneTavernPreset(presetId: string): void {
  const library = loadStandaloneTavernPresetLibrary();
  const isKnownPreset =
    presetId === STANDALONE_TAVERN_PRESET_BUILTIN_ID || library.importedPresets.some(preset => preset.id === presetId);
  persistStandaloneTavernPresetLibrary({
    ...library,
    activePresetId: isKnownPreset ? presetId : STANDALONE_TAVERN_PRESET_BUILTIN_ID,
  });
}

export function deleteImportedStandaloneTavernPreset(presetId: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const library = loadStandaloneTavernPresetLibrary();
  const importedPresets = library.importedPresets.filter(preset => preset.id !== presetId);
  persistStandaloneTavernPresetLibrary({
    activePresetId:
      library.activePresetId === presetId ? STANDALONE_TAVERN_PRESET_BUILTIN_ID : library.activePresetId,
    importedPresets,
  });
}

export function resolveOrderedStandaloneTavernPrompts(
  presetDocument: StandaloneTavernPresetDocument = standaloneTavernPresetDocument,
): ResolvedStandaloneTavernPrompt[] {
  const promptMap = new Map<string, StandaloneTavernPromptDefinition>();
  const prompts = Array.isArray(presetDocument.prompts) ? presetDocument.prompts : [];

  prompts.forEach(prompt => {
    if (typeof prompt.identifier === 'string' && prompt.identifier.trim()) {
      promptMap.set(prompt.identifier, prompt);
    }
  });

  const orderedItems = presetDocument.prompt_order?.[0]?.order;
  if (!Array.isArray(orderedItems) || orderedItems.length === 0) {
    return prompts
      .filter(prompt => Boolean(prompt.enabled))
      .map<ResolvedStandaloneTavernPrompt>((prompt, index) => ({
        ...prompt,
        enabled: Boolean(prompt.enabled),
        enabledInOrder: Boolean(prompt.enabled),
        orderIndex: index,
      }));
  }

  return orderedItems
    .map<ResolvedStandaloneTavernPrompt | null>(item => {
      if (typeof item?.identifier !== 'string') {
        return null;
      }

      const prompt = promptMap.get(item.identifier);
      if (!prompt) {
        return null;
      }

      const enabledInOrder = item.enabled ?? prompt.enabled ?? false;
      return {
        ...prompt,
        enabled: enabledInOrder,
        enabledInOrder,
        orderIndex: 0,
      };
    })
    .filter((item): item is ResolvedStandaloneTavernPrompt => item !== null)
    .map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
}

function normalizePromptText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function buildPromptPreview(content: string): string {
  const normalized = normalizePromptText(content)
    .replace(/\n{2,}/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= STANDALONE_TAVERN_PRESET_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, STANDALONE_TAVERN_PRESET_PREVIEW_LENGTH).trimEnd()}…`;
}

function resolvePromptRole(role: StandaloneTavernPromptDefinition['role']): StandaloneTavernPresetPromptView['role'] {
  if (role === 'system' || role === 'user' || role === 'assistant') {
    return role;
  }

  return 'unknown';
}

function resolvePromptEntryType(prompt: ResolvedStandaloneTavernPrompt): StandaloneTavernPromptEntryType {
  if (prompt.marker) {
    return 'marker';
  }

  if (prompt.system_prompt) {
    return 'system_prompt';
  }

  return 'prompt';
}

export function getStandaloneTavernPresetPromptViews(
  presetDocument: StandaloneTavernPresetDocument = standaloneTavernPresetDocument,
): StandaloneTavernPresetPromptView[] {
  return resolveOrderedStandaloneTavernPrompts(presetDocument).map(prompt => {
    const content = typeof prompt.content === 'string' ? normalizePromptText(prompt.content) : '';

    return {
      orderIndex: prompt.orderIndex,
      identifier: prompt.identifier?.trim() || `prompt-${prompt.orderIndex + 1}`,
      name: prompt.name?.trim() || prompt.identifier?.trim() || `Prompt ${prompt.orderIndex + 1}`,
      role: resolvePromptRole(prompt.role),
      enabledInOrder: prompt.enabledInOrder,
      sourceEnabled: Boolean(prompt.enabled),
      systemPrompt: Boolean(prompt.system_prompt),
      marker: Boolean(prompt.marker),
      entryType: resolvePromptEntryType(prompt),
      content,
      contentPreview: buildPromptPreview(content),
      hasContent: Boolean(content),
    };
  });
}

function containsActionOptionsRule(prompt: ResolvedStandaloneTavernPrompt): boolean {
  const haystack = [prompt.identifier, prompt.name, prompt.content].filter(
    (value): value is string => typeof value === 'string',
  );
  return haystack.some(value => /action_options|行动选项/.test(value));
}

export function getStandaloneTavernPresetSummary(
  presetDocument: StandaloneTavernPresetDocument = getActiveStandaloneTavernPresetDocument(),
  sourceName: string = getActiveStandaloneTavernPresetSourceName(),
): StandaloneTavernPresetSummary {
  const orderedPrompts = resolveOrderedStandaloneTavernPrompts(presetDocument);

  return {
    sourceName,
    parseOk: orderedPrompts.length > 0,
    totalPromptCount: orderedPrompts.length,
    enabledPromptCount: orderedPrompts.filter(prompt => prompt.enabledInOrder).length,
    systemPromptCount: orderedPrompts.filter(
      prompt => prompt.enabledInOrder && (prompt.role === 'system' || prompt.system_prompt),
    ).length,
    userPromptCount: orderedPrompts.filter(
      prompt => prompt.enabledInOrder && prompt.role === 'user' && !prompt.system_prompt,
    ).length,
    assistantPromptCount: orderedPrompts.filter(prompt => prompt.enabledInOrder && prompt.role === 'assistant').length,
    containsActionOptionsRule: orderedPrompts.some(
      prompt => prompt.enabledInOrder && containsActionOptionsRule(prompt),
    ),
  };
}

export function getStandaloneTavernPresetInspection(
  presetDocument: StandaloneTavernPresetDocument = getActiveStandaloneTavernPresetDocument(),
  sourceName: string = getActiveStandaloneTavernPresetSourceName(),
): StandaloneTavernPresetInspection {
  const prompts = getStandaloneTavernPresetPromptViews(presetDocument);
  const summary = getStandaloneTavernPresetSummary(presetDocument, sourceName);

  return {
    ...summary,
    prompts,
    disabledPromptCount: prompts.filter(prompt => !prompt.enabledInOrder).length,
    markerPromptCount: prompts.filter(prompt => prompt.marker).length,
    emptyContentPromptCount: prompts.filter(prompt => !prompt.hasContent).length,
  };
}

export function createStandaloneRuntimePromptAssetSnapshot(
  sendFullPreset: boolean,
  presetDocument: StandaloneTavernPresetDocument = getActiveStandaloneTavernPresetDocument(),
  sourceName: string = getActiveStandaloneTavernPresetSourceName(),
): StandaloneRuntimePromptAssetSnapshot {
  const summary = getStandaloneTavernPresetSummary(presetDocument, sourceName);
  return {
    sourceName: summary.sourceName,
    parseOk: summary.parseOk,
    mode: sendFullPreset ? 'full' : 'compact',
    totalPromptCount: summary.totalPromptCount,
    enabledPromptCount: summary.enabledPromptCount,
    systemPromptCount: summary.systemPromptCount,
    userPromptCount: summary.userPromptCount,
    assistantPromptCount: summary.assistantPromptCount,
    containsActionOptionsRule: summary.containsActionOptionsRule,
  };
}
