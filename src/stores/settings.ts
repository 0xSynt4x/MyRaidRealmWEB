import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { DEFAULT_LOCALE, isLocale, setCurrentLocale, syncDocumentLocale, type Locale } from '../i18n';
import {
  normalizeOpenAiCompatibleApiUrl,
  normalizeOpenAiCompatibleChatCompletionsApiUrl,
  normalizeOpenAiCompatibleModelsApiUrl,
} from '../../runtime/openAiCompatibleApiUrl';
import {
  applyOnlineModeToStandaloneLocalContent,
  applyTextToImageToStandaloneLocalContent,
  applyFixedVariableUpdateStandaloneLocalContent,
  applyWorldDifficultyToStandaloneLocalContent,
  getStandaloneLocalContentDefaultEnabledMap,
  getStandaloneLocalContentBuiltinRouteOverrides,
  normalizeStandaloneBuiltinAssetRouteOverrides,
  type StandaloneBuiltinAssetRouteOverrideMap,
} from '../utils/standaloneLocalContent';
import {
  COMFYUI_STYLE_PRESETS,
  CUSTOM_STYLE_PRESET_ID,
  NO_STYLE_PRESET_ID,
  findStylePreset,
} from '../utils/comfyuiStylePresets';
import { findImageStylePreset } from '../utils/imageStylePresets';
import { DEFAULT_STAGE_SUMMARY_THRESHOLD, normalizeStageSummaryThreshold } from '../utils/stageSummaryThreshold';

export type Theme = 'light' | 'dark' | 'steelcool' | 'solarized' | 'everforest1980s' | 'wuxia';
export type FontFamily = 'yahei' | 'source-han-sans' | 'lxgw-hazy' | 'hanchan' | 'shanggu';
export type FontSize = 1 | 2 | 3 | 4 | 5; // 1=小, 2=中, 3=大, 4=特大, 5=超大
export type LineHeight = 1 | 2 | 3 | 4 | 5; // 1=紧凑, 2=正常, 3=舒适, 4=宽松, 5=超宽松
export type SurvivalMode = '关闭' | '基础模式' | '生存模式';
export type ActionOptionBehavior = 'replace' | 'append';
export type WorldDifficulty = '最简单' | '简单' | '普通' | '困难' | '地狱';
export type ApiSource = 'openai_compatible';

export interface BackgroundImageConfig {
  imageUrl: string; // 图片 base64 或 URL
  opacity: number; // 不透明度 0-100
  position: 'center' | 'top' | 'bottom' | 'left' | 'right'; // 位置
  size: 'cover' | 'contain' | 'auto'; // 尺寸模式
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'; // 重复模式
  attachment: 'scroll' | 'fixed'; // 滚动行为
}

export interface ApiConfig {
  id: string;
  apiurl: string;
  key: string;
  model: string;
  source: ApiSource;
  availableModels: string[];
  collapsed: boolean; // 卡片是否折叠
  saved: boolean; // 是否已保存过（用于默认折叠策略）
}

export interface StandaloneLocalContentSettings {
  enabledAssets: Record<string, boolean>;
  builtinAssetRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
}

/** 本地 ComfyUI 生图配置（开关已上移到「生图总开关」，这里只剩后端自己的参数） */
export interface ComfyUiSettings {
  /** 服务地址，形如 http://127.0.0.1:8188 */
  baseUrl: string;
  /** 玩家粘贴的工作流原文（API 格式或 ComfyUI 界面格式都行） */
  workflowJson: string;
  /** 内部用：界面格式转出来的 API 格式，出图时优先用它 */
  workflowApiJson: string;
  /** 接收正向提示词的节点 */
  positiveNodeId: string;
  /** 正向节点是不是玩家自己选的：是的话重新解析也不覆盖他的选择 */
  positiveNodeManual: boolean;
  /** 接收负向提示词的节点，可为空 */
  negativeNodeId: string;
  /** 是否用下面的宽高覆盖工作流里的画布尺寸 */
  overrideSize: boolean;
  width: number;
  height: number;
  /** 每次出图随机种子 */
  randomSeed: boolean;
  /** 画风预置 id：内置预置 / custom（自定义）/ none（不拼画风） */
  stylePresetId: string;
  /** 实际拼在提示词前面的画风内容 */
  stylePrompt: string;
  /** 负向提示词；留空表示沿用工作流里自带的那个 */
  negativePrompt: string;
}

export const DEFAULT_COMFYUI_BASE_URL = 'http://127.0.0.1:8188';

export function createDefaultComfyUiSettings(): ComfyUiSettings {
  const defaultPreset = COMFYUI_STYLE_PRESETS[0];
  return {
    baseUrl: DEFAULT_COMFYUI_BASE_URL,
    workflowJson: '',
    workflowApiJson: '',
    positiveNodeId: '',
    positiveNodeManual: false,
    negativeNodeId: '',
    overrideSize: false,
    width: 1024,
    height: 1024,
    randomSeed: true,
    stylePresetId: defaultPreset.id,
    stylePrompt: defaultPreset.prompt,
    negativePrompt: '',
  };
}

function normalizeComfyUiSize(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(4096, Math.max(64, Math.round(numeric)));
}

export function normalizeComfyUiSettings(input?: Partial<ComfyUiSettings> | null): ComfyUiSettings {
  const defaults = createDefaultComfyUiSettings();
  return {
    baseUrl: typeof input?.baseUrl === 'string' && input.baseUrl.trim() ? input.baseUrl.trim() : defaults.baseUrl,
    workflowJson: typeof input?.workflowJson === 'string' ? input.workflowJson : '',
    workflowApiJson: typeof input?.workflowApiJson === 'string' ? input.workflowApiJson : '',
    positiveNodeId: typeof input?.positiveNodeId === 'string' ? input.positiveNodeId : '',
    positiveNodeManual: Boolean(input?.positiveNodeManual ?? defaults.positiveNodeManual),
    negativeNodeId: typeof input?.negativeNodeId === 'string' ? input.negativeNodeId : '',
    overrideSize: Boolean(input?.overrideSize ?? defaults.overrideSize),
    width: normalizeComfyUiSize(input?.width, defaults.width),
    height: normalizeComfyUiSize(input?.height, defaults.height),
    randomSeed: Boolean(input?.randomSeed ?? defaults.randomSeed),
    stylePresetId: normalizeStylePresetId(input?.stylePresetId, defaults.stylePresetId),
    stylePrompt: typeof input?.stylePrompt === 'string' ? input.stylePrompt : defaults.stylePrompt,
    negativePrompt: typeof input?.negativePrompt === 'string' ? input.negativePrompt : defaults.negativePrompt,
  };
}

/** 只认已知的预置 id；旧数据里没有这个字段时落到默认预置 */
function normalizeStylePresetId(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value) return fallback;
  if (value === NO_STYLE_PRESET_ID || value === CUSTOM_STYLE_PRESET_ID) return value;
  return findStylePreset(value) ? value : fallback;
}

/** 生图后端：本地 ComfyUI 走本机服务，NovelAI 走云端兼容接口 */
export type ImageBackend = 'comfyui' | 'novelai';

/** 生图总开关 + 当前生效的后端 */
export interface ImageGenerationSettings {
  /** 关掉后 AI 不写生图提示词，消息里也不显示出图按钮 */
  enabled: boolean;
  backend: ImageBackend;
}

export function createDefaultImageGenerationSettings(): ImageGenerationSettings {
  return { enabled: false, backend: 'comfyui' };
}

export function normalizeImageBackend(value: unknown): ImageBackend {
  return value === 'novelai' ? 'novelai' : 'comfyui';
}

/**
 * 老配置迁移：早期版本没有「生图总开关 + 后端」这一层，
 * 那时 ComfyUI 的开关就是生图总开关 —— 开着就迁成「总开关开 + 后端 ComfyUI」，玩家无感。
 */
export function resolveStoredImageGenerationSettings(
  stored: Record<string, any> | null | undefined,
): ImageGenerationSettings {
  const raw = stored?.imageGeneration;
  if (raw && typeof raw === 'object') {
    return {
      enabled: Boolean(raw.enabled ?? false),
      backend: normalizeImageBackend(raw.backend),
    };
  }

  return {
    enabled: Boolean(stored?.comfyUi?.enabled ?? false),
    backend: 'comfyui',
  };
}

/** NovelAI 尺寸只有三档：实测兼容站按宽高比自动归类，填别的会被悄悄换成这三档之一 */
export type NovelAiSizeId = 'square' | 'portrait' | 'landscape';

export interface NovelAiSizeOption {
  id: NovelAiSizeId;
  width: number;
  height: number;
}

export const NOVELAI_SIZE_OPTIONS: NovelAiSizeOption[] = [
  { id: 'square', width: 1024, height: 1024 },
  { id: 'portrait', width: 920, height: 1536 },
  { id: 'landscape', width: 1536, height: 920 },
];

/** 负面提示词预设档位：0 重 / 1 轻 / 2 Furry / 3 Human / 4 无 */
export type NovelAiUcPreset = 0 | 1 | 2 | 3 | 4;

export const NOVELAI_UC_PRESET_VALUES: NovelAiUcPreset[] = [0, 1, 2, 3, 4];

/** NovelAI 出图参数（地址既能填官方，也能填兼容站） */
export interface NovelAiSettings {
  /** 接口地址，填到路径前缀为止；程序只补 /ai/generate-image */
  baseUrl: string;
  /** API Key，只存本机 localStorage，不进存档 */
  apiKey: string;
  model: string;
  sizeId: NovelAiSizeId;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  ucPreset: NovelAiUcPreset;
  qualityToggle: boolean;
  cfgRescale: number;
  /** 负向提示词；留空表示只用 ucPreset 那套内置负面 */
  negativePrompt: string;
  /** 画风预置 id：内置预置 / custom（自定义）/ none（不拼画风） */
  stylePresetId: string;
  /** 实际拼在提示词前面的画风内容 */
  stylePrompt: string;
}

export const DEFAULT_NOVELAI_MODEL = 'nai-diffusion-4-5-full';
export const DEFAULT_NOVELAI_SAMPLER = 'k_euler_ancestral';
export const DEFAULT_NOVELAI_NOISE_SCHEDULE = 'karras';

export function createDefaultNovelAiSettings(): NovelAiSettings {
  return {
    baseUrl: '',
    apiKey: '',
    model: DEFAULT_NOVELAI_MODEL,
    sizeId: 'portrait',
    steps: 28,
    scale: 5,
    sampler: DEFAULT_NOVELAI_SAMPLER,
    noiseSchedule: DEFAULT_NOVELAI_NOISE_SCHEDULE,
    ucPreset: 0,
    qualityToggle: true,
    cfgRescale: 0,
    negativePrompt: '',
    stylePresetId: NO_STYLE_PRESET_ID,
    stylePrompt: '',
  };
}

/** 把数字夹进区间；非数字或 NaN 时落回默认值 */
function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeNovelAiSizeId(value: unknown): NovelAiSizeId {
  return NOVELAI_SIZE_OPTIONS.some(option => option.id === value) ? (value as NovelAiSizeId) : 'portrait';
}

function normalizeNovelAiUcPreset(value: unknown): NovelAiUcPreset {
  const numeric = clampNumber(value, 0, 0, 4);
  return Math.round(numeric) as NovelAiUcPreset;
}

/** 只认 NovelAI 那组已知预置 id；未知或空值落到「不用画风」 */
function normalizeNovelAiStylePresetId(value: unknown): string {
  if (typeof value !== 'string' || !value) return NO_STYLE_PRESET_ID;
  if (value === NO_STYLE_PRESET_ID || value === CUSTOM_STYLE_PRESET_ID) return value;
  return findImageStylePreset('novelai', value) ? value : NO_STYLE_PRESET_ID;
}

/**
 * 画风内容取哪一份。
 *
 * 选中内置预置时**以代码里的文本为准** —— 预置文本改了（比如去掉 `1980s (style)` 这类
 * 硬写的标签），老玩家下次进来就跟着更新，不会被存在设置里的旧文本一直压着。
 * 只有「自定义 / 不用」才用玩家自己存的那份。
 */
function resolveNovelAiStylePrompt(presetId: string, stored: unknown, fallback: string): string {
  if (presetId !== NO_STYLE_PRESET_ID && presetId !== CUSTOM_STYLE_PRESET_ID) {
    const preset = findImageStylePreset('novelai', presetId);
    if (preset) return preset.prompt;
  }
  return typeof stored === 'string' ? stored : fallback;
}

export function normalizeNovelAiSettings(input?: Partial<NovelAiSettings> | null): NovelAiSettings {
  const defaults = createDefaultNovelAiSettings();
  const stylePresetId = normalizeNovelAiStylePresetId(input?.stylePresetId);
  return {
    baseUrl: typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : defaults.baseUrl,
    apiKey: typeof input?.apiKey === 'string' ? input.apiKey : defaults.apiKey,
    model: typeof input?.model === 'string' && input.model.trim() ? input.model.trim() : defaults.model,
    sizeId: normalizeNovelAiSizeId(input?.sizeId),
    // 步数范围给宽（1–50）：不同站、不同模型代次的可选范围不一样，别写死 8–12
    steps: Math.round(clampNumber(input?.steps, defaults.steps, 1, 50)),
    scale: clampNumber(input?.scale, defaults.scale, 0, 20),
    sampler: typeof input?.sampler === 'string' && input.sampler.trim() ? input.sampler.trim() : defaults.sampler,
    noiseSchedule:
      typeof input?.noiseSchedule === 'string' && input.noiseSchedule.trim()
        ? input.noiseSchedule.trim()
        : defaults.noiseSchedule,
    ucPreset: normalizeNovelAiUcPreset(input?.ucPreset),
    qualityToggle: Boolean(input?.qualityToggle ?? defaults.qualityToggle),
    cfgRescale: clampNumber(input?.cfgRescale, defaults.cfgRescale, 0, 1),
    negativePrompt: typeof input?.negativePrompt === 'string' ? input.negativePrompt : defaults.negativePrompt,
    stylePresetId,
    stylePrompt: resolveNovelAiStylePrompt(stylePresetId, input?.stylePrompt, defaults.stylePrompt),
  };
}

/** 按尺寸档位取实际宽高 */
export function resolveNovelAiSize(sizeId: string): NovelAiSizeOption {
  return NOVELAI_SIZE_OPTIONS.find(option => option.id === sizeId) ?? NOVELAI_SIZE_OPTIONS[1];
}

export function resolveStoredStandaloneLocalContentSettings(input: {
  storedSettings?: Partial<StandaloneLocalContentSettings> | null;
  /** 是否让 AI 在正文里写生图提示词（由「生图总开关」统一决定） */
  imagePromptEnabled?: boolean;
  /** 当前后端 —— 决定开哪一条生图提示词规则（两条互斥） */
  imageBackend?: ImageBackend;
  onlineModeEnabled?: boolean;
}): StandaloneLocalContentSettings {
  let enabledAssets = applyFixedVariableUpdateStandaloneLocalContent({
    ...getStandaloneLocalContentDefaultEnabledMap(),
    ...(input.storedSettings?.enabledAssets || {}),
  });

  enabledAssets = applyTextToImageToStandaloneLocalContent(
    enabledAssets,
    input.imagePromptEnabled ?? false,
    input.imageBackend ?? 'comfyui',
  );
  enabledAssets = applyOnlineModeToStandaloneLocalContent(enabledAssets, input.onlineModeEnabled ?? false);
  enabledAssets = applyWorldDifficultyToStandaloneLocalContent(enabledAssets);
  const builtinAssetRouteOverrides = normalizeStandaloneBuiltinAssetRouteOverrides(
    input.storedSettings?.builtinAssetRouteOverrides ?? getStandaloneLocalContentBuiltinRouteOverrides(),
  );

  return {
    enabledAssets,
    builtinAssetRouteOverrides,
  };
}

// 存储 key - 使用固定名称，避免版本号变化导致设置丢失
const STORAGE_KEY = 'tavern_helper_settings_诸界穿越模拟器_NW';

function createAssistantApiId() {
  return `assistant-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultApiConfig(): ApiConfig {
  return {
    id: createAssistantApiId(),
    apiurl: '',
    key: '',
    model: '',
    source: 'openai_compatible',
    availableModels: [],
    collapsed: false,
    saved: false,
  };
}

export function normalizeApiConfig(input?: Partial<ApiConfig>): ApiConfig {
  const normalized: ApiConfig = {
    id: (input as ApiConfig | undefined)?.id || createAssistantApiId(),
    apiurl: normalizeOpenAiCompatibleApiUrl(input?.apiurl),
    key: input?.key || '',
    model: input?.model || '',
    source: 'openai_compatible',
    availableModels: Array.isArray(input?.availableModels) ? input!.availableModels : [],
    collapsed: (input as ApiConfig | undefined)?.collapsed ?? false,
    saved: (input as ApiConfig | undefined)?.saved ?? false,
  };

  return normalized;
}

export function normalizeStandaloneOpenAiApiUrl(rawUrl: string | undefined): string {
  return normalizeOpenAiCompatibleApiUrl(rawUrl);
}

export function normalizeStandaloneOpenAiChatCompletionsApiUrl(rawUrl: string | undefined): string {
  return normalizeOpenAiCompatibleChatCompletionsApiUrl(rawUrl);
}

export function normalizeStandaloneOpenAiModelsApiUrl(rawUrl: string | undefined): string {
  return normalizeOpenAiCompatibleModelsApiUrl(rawUrl);
}

function hasValidApiContent(config: Partial<ApiConfig> | ApiConfig | undefined): boolean {
  if (!config) return false;
  return Boolean(config.apiurl || config.key || config.model);
}

/**
 * 统一 API 池：主 API 与辅助 API 都从同一个列表里挑，配置只存一份。
 *
 * 老版本是「一条主 API + 一个辅助 API 列表」两份互不相干的配置，
 * 迁移时合并进池，再分别记下两处各选中了谁。
 */
export interface ApiPoolSettings {
  apiPool: ApiConfig[];
  /** 主 API 选中项，按尝试顺序排列 */
  mainApiIds: string[];
  /** 辅助 API 选中项，按尝试顺序排列 */
  assistantApiIds: string[];
  /** 前一个失败时是否自动试下一个 */
  autoRetry: boolean;
}

/** 主 API 一条都没选中时对外给出的空配置；模块级常量，保证引用稳定 */
export const EMPTY_API_CONFIG: ApiConfig = {
  id: 'standalone-empty-api',
  apiurl: '',
  key: '',
  model: '',
  source: 'openai_compatible',
  availableModels: [],
  collapsed: false,
  saved: false,
};

function normalizeApiIdList(input: unknown, pool: ApiConfig[]): string[] {
  if (!Array.isArray(input)) return [];

  const availableIds = new Set(pool.map(api => api.id));
  const result: string[] = [];

  input.forEach(value => {
    if (typeof value !== 'string') return;
    if (!availableIds.has(value)) return;
    if (result.includes(value)) return;
    result.push(value);
  });

  return result;
}

export function resolveStoredApiPoolSettings(stored: Record<string, any> | null | undefined): ApiPoolSettings {
  const pool: ApiConfig[] = [];
  const seenIds = new Set<string>();

  const adopt = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null;
    const normalized = normalizeApiConfig(raw as Partial<ApiConfig>);
    if (!hasValidApiContent(normalized)) return null;
    if (seenIds.has(normalized.id)) return normalized.id;
    seenIds.add(normalized.id);
    pool.push(normalized);
    return normalized.id;
  };

  const hasStoredPool = Array.isArray(stored?.apiPool);
  if (hasStoredPool) {
    stored!.apiPool.forEach((item: unknown) => adopt(item));
  }

  let mainApiIds = normalizeApiIdList(stored?.mainApiIds, pool);
  let assistantApiIds = normalizeApiIdList(stored?.assistantApiIds, pool);

  // 池字段不存在 → 说明还是老结构，把老的两份配置搬进来
  if (!hasStoredPool) {
    const legacyMainId = adopt(stored?.mainApi);
    const legacyAssistantIds = (Array.isArray(stored?.assistantApis) ? stored!.assistantApis : [])
      .map((item: unknown) => adopt(item))
      .filter((id: string | null): id is string => Boolean(id));

    if (mainApiIds.length === 0 && legacyMainId) {
      mainApiIds = [legacyMainId];
    }
    if (assistantApiIds.length === 0 && legacyAssistantIds.length > 0) {
      assistantApiIds = legacyAssistantIds;
    }
  }

  // 池至少留一条空卡，界面上才有东西可编辑
  if (pool.length === 0) {
    pool.push(createDefaultApiConfig());
  }

  return {
    apiPool: pool,
    mainApiIds,
    assistantApiIds,
    autoRetry: stored?.apiAutoRetry !== false,
  };
}

export const useSettingsStore = defineStore('settings', () => {
  // 从 localStorage 加载初始设置
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('[Settings] 加载 localStorage 失败:', error);
      return {};
    }
  };

  const stored = loadFromStorage();

  const locale = ref<Locale>(isLocale(stored.locale) ? stored.locale : DEFAULT_LOCALE);
  setCurrentLocale(locale.value);

  const theme = ref<Theme>(stored.theme || 'light');
  const fontFamily = ref<FontFamily>(stored.fontFamily || 'yahei');
  // 兼容旧版字符串类型的 fontSize
  const parseFontSize = (value: any): FontSize => {
    if (typeof value === 'number' && value >= 1 && value <= 5) return value as FontSize;
    if (value === 'small') return 1;
    if (value === 'medium') return 2;
    if (value === 'large') return 3;
    return 2; // 默认中号
  };
  const fontSize = ref<FontSize>(parseFontSize(stored.fontSize));
  const contentFontSize = ref<FontSize>(parseFontSize(stored.contentFontSize ?? stored.fontSize));

  // 行距
  const lineHeight = ref<LineHeight>(stored.lineHeight || 3); // 默认舒适

  // 右侧边栏折叠状态
  const rightCollapsed = ref<boolean>(stored.rightCollapsed ?? false);

  // 正文区域自动滚动
  const autoScroll = ref<boolean>(stored.autoScroll ?? true);

  // 选项点击行为
  const actionOptionBehavior = ref<ActionOptionBehavior>(stored.actionOptionBehavior || 'append');

  const onlineModeEnabled = ref<boolean>(stored.onlineModeEnabled ?? false);

  // 世界难度仅作为前端本地设置保存，不直接写入 schema。
  const worldDifficulty = ref<WorldDifficulty>(stored.worldDifficulty || '最简单');

  // 「攒够多少条小总结才提示归档阶段总结」，只影响提示时机，不限制玩家手动归档。
  const stageSummaryThreshold = ref<number>(
    typeof stored.stageSummaryThreshold === 'undefined'
      ? DEFAULT_STAGE_SUMMARY_THRESHOLD
      : normalizeStageSummaryThreshold(stored.stageSummaryThreshold),
  );

  const initialApiPoolSettings = resolveStoredApiPoolSettings(stored);

  /** 唯一的 API 配置列表：主 API 与辅助 API 都从这里挑 */
  const apiPool = ref<ApiConfig[]>(initialApiPoolSettings.apiPool);
  /** 主 API 选中项（按尝试顺序） */
  const mainApiIds = ref<string[]>(initialApiPoolSettings.mainApiIds);
  /** 辅助 API 选中项（按尝试顺序） */
  const assistantApiIds = ref<string[]>(initialApiPoolSettings.assistantApiIds);
  /** 前一个失败时是否自动试下一个 */
  const apiAutoRetry = ref<boolean>(initialApiPoolSettings.autoRetry);

  const pickApisFromPool = (ids: string[]): ApiConfig[] => {
    const byId = new Map(apiPool.value.map(api => [api.id, api]));
    return ids.map(id => byId.get(id)).filter((api): api is ApiConfig => Boolean(api));
  };

  /** 主 API 候选列表；运行时按顺序尝试 */
  const mainApis = computed(() => pickApisFromPool(mainApiIds.value));

  /**
   * 辅助 API 候选列表。
   * 赋值时把内容写回池并重设勾选，兼容「给列表整体赋值」的旧写法。
   */
  const assistantApis = computed<ApiConfig[]>({
    get: () => pickApisFromPool(assistantApiIds.value),
    set: values => {
      const nextPool = [...apiPool.value];
      const nextIds: string[] = [];

      values.forEach(value => {
        const normalized = normalizeApiConfig(value);
        const index = nextPool.findIndex(api => api.id === normalized.id);
        if (index >= 0) {
          nextPool[index] = normalized;
        } else {
          nextPool.push(normalized);
        }
        nextIds.push(normalized.id);
      });

      apiPool.value = nextPool;
      assistantApiIds.value = nextIds;
    },
  });

  /**
   * 主 API 第一条的兼容读法。
   * 赋值时写回池并把它设成唯一的主 API，兼容「给主 API 整体赋值」的旧写法。
   */
  const mainApi = computed<ApiConfig>({
    get: () => mainApis.value[0] ?? EMPTY_API_CONFIG,
    set: value => {
      const normalized = normalizeApiConfig(value);
      const index = apiPool.value.findIndex(api => api.id === normalized.id);

      if (index >= 0) {
        apiPool.value[index] = normalized;
      } else {
        apiPool.value = [...apiPool.value, normalized];
      }

      mainApiIds.value = [normalized.id];
    },
  });

  // 背景图片配置 - 确保合并默认值，防止旧数据缺少字段
  const defaultBackgroundImage: BackgroundImageConfig = {
    imageUrl: '',
    opacity: 30, // 默认30%透明度，保证文字可读性
    position: 'center',
    size: 'cover',
    repeat: 'no-repeat',
    attachment: 'scroll',
  };
  const backgroundImage = ref<BackgroundImageConfig>({
    ...defaultBackgroundImage,
    ...(stored.backgroundImage || {}),
  });

  // 生图总开关与后端选择（两条后端二选一，配置各自保留）
  const imageGeneration = ref<ImageGenerationSettings>(resolveStoredImageGenerationSettings(stored));

  // 本地 ComfyUI 生图配置
  const comfyUi = ref<ComfyUiSettings>(normalizeComfyUiSettings(stored.comfyUi));

  // NovelAI 兼容接口配置（Key 与地址只在本机，不进存档）
  const novelAi = ref<NovelAiSettings>(normalizeNovelAiSettings(stored.novelAi));

  const standaloneLocalContent = ref<StandaloneLocalContentSettings>(
    resolveStoredStandaloneLocalContentSettings({
      storedSettings: stored.standaloneLocalContent,
      imagePromptEnabled: imageGeneration.value.enabled,
      imageBackend: imageGeneration.value.backend,
      onlineModeEnabled: onlineModeEnabled.value,
    }),
  );

  const saveStoragePatch = (patch: Record<string, unknown>) => {
    try {
      const current = loadFromStorage();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...current,
          ...patch,
        }),
      );
      return true;
    } catch (error) {
      console.warn('[Settings] 保存到 localStorage 失败:', error);
      return false;
    }
  };

  const getNormalizedApiPool = () => apiPool.value.map(item => normalizeApiConfig(item));

  // 自动保存非 API 设置；API 池内容改为显式保存
  const saveBasicSettingsToStorage = () => {
    saveStoragePatch({
      locale: locale.value,
      theme: theme.value,
      fontFamily: fontFamily.value,
      fontSize: fontSize.value,
      contentFontSize: contentFontSize.value,
      lineHeight: lineHeight.value,
      rightCollapsed: rightCollapsed.value,
      autoScroll: autoScroll.value,
      actionOptionBehavior: actionOptionBehavior.value,
      onlineModeEnabled: onlineModeEnabled.value,
      worldDifficulty: worldDifficulty.value,
      stageSummaryThreshold: stageSummaryThreshold.value,
      backgroundImage: backgroundImage.value,
      standaloneLocalContent: standaloneLocalContent.value,
      imageGeneration: imageGeneration.value,
      comfyUi: comfyUi.value,
      novelAi: novelAi.value,
    });
  };

  /** 保存 API 池内容（点每张卡片的「保存」时调用），顺带把两处选择一起落盘 */
  const persistApiPool = () => {
    apiPool.value = getNormalizedApiPool();
    return saveStoragePatch({
      apiPool: apiPool.value,
      mainApiIds: mainApiIds.value,
      assistantApiIds: assistantApiIds.value,
      apiAutoRetry: apiAutoRetry.value,
      // 老字段清掉，避免下次启动又走一遍迁移
      mainApi: undefined,
      assistantApis: undefined,
      customApis: undefined,
      customApi: undefined,
    });
  };

  /** 只保存「谁当主 API / 谁当辅助 API / 要不要自动重试」，不动池里正在编辑的内容 */
  const persistApiSelection = () => {
    return saveStoragePatch({
      mainApiIds: mainApiIds.value,
      assistantApiIds: assistantApiIds.value,
      apiAutoRetry: apiAutoRetry.value,
    });
  };

  // 监听非 API 设置变化并保存
  watch(
    [
      theme,
      locale,
      fontFamily,
      fontSize,
      contentFontSize,
      lineHeight,
      rightCollapsed,
      autoScroll,
      actionOptionBehavior,
      onlineModeEnabled,
      worldDifficulty,
      stageSummaryThreshold,
      backgroundImage,
      standaloneLocalContent,
      imageGeneration,
      comfyUi,
      novelAi,
    ],
    saveBasicSettingsToStorage,
    {
      deep: true,
    },
  );

  // 勾选主 API / 辅助 API、切换自动重试开关 → 立即落盘（池里的编辑内容仍走显式保存）
  watch(
    [mainApiIds, assistantApiIds, apiAutoRetry],
    () => {
      persistApiSelection();
    },
    { deep: true },
  );

  // 生图总开关一开，AI 就开始在正文里写生图提示词；一关就停。
  // 后端切换时两条提示词规则互斥自动切：NAI 用标签流那条，ComfyUI 用自然语言那条。
  watch(
    [() => imageGeneration.value.enabled, () => imageGeneration.value.backend],
    ([enabled, backend]) => {
      standaloneLocalContent.value = {
        ...standaloneLocalContent.value,
        enabledAssets: applyTextToImageToStandaloneLocalContent(
          standaloneLocalContent.value.enabledAssets,
          enabled,
          backend,
        ),
      };
    },
  );

  // 监听主题变化并应用到 DOM
  watch(
    [locale],
    () => {
      syncDocumentLocale(locale.value);
    },
    { immediate: true },
  );

  watch(
    [theme, fontFamily, fontSize, lineHeight],
    () => {
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.setAttribute('data-theme', theme.value);
        appContainer.setAttribute('data-font', fontFamily.value);
        appContainer.setAttribute('data-size', String(fontSize.value));
        appContainer.setAttribute('data-line', String(lineHeight.value));
      }
    },
    { immediate: true },
  );

  return {
    locale,
    theme,
    fontFamily,
    fontSize,
    contentFontSize,
    lineHeight,
    rightCollapsed,
    autoScroll,
    actionOptionBehavior,
    onlineModeEnabled,
    worldDifficulty,
    stageSummaryThreshold,
    mainApi,
    mainApis,
    assistantApis,
    apiPool,
    mainApiIds,
    assistantApiIds,
    apiAutoRetry,
    backgroundImage,
    standaloneLocalContent,
    imageGeneration,
    comfyUi,
    novelAi,
    persistApiPool,
    persistApiSelection,
  };
});
