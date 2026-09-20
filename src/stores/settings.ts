import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
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

/** 本地 ComfyUI 生图配置 */
export interface ComfyUiSettings {
  /** 功能总开关 */
  enabled: boolean;
  /** 服务地址，形如 http://127.0.0.1:8188 */
  baseUrl: string;
  /** 玩家粘贴的工作流原文（API 格式或 ComfyUI 界面格式都行） */
  workflowJson: string;
  /** 内部用：界面格式转出来的 API 格式，出图时优先用它 */
  workflowApiJson: string;
  /** 接收正向提示词的节点 */
  positiveNodeId: string;
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
    enabled: false,
    baseUrl: DEFAULT_COMFYUI_BASE_URL,
    workflowJson: '',
    workflowApiJson: '',
    positiveNodeId: '',
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
    enabled: Boolean(input?.enabled ?? defaults.enabled),
    baseUrl: typeof input?.baseUrl === 'string' && input.baseUrl.trim() ? input.baseUrl.trim() : defaults.baseUrl,
    workflowJson: typeof input?.workflowJson === 'string' ? input.workflowJson : '',
    workflowApiJson: typeof input?.workflowApiJson === 'string' ? input.workflowApiJson : '',
    positiveNodeId: typeof input?.positiveNodeId === 'string' ? input.positiveNodeId : '',
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

export function resolveStoredStandaloneLocalContentSettings(input: {
  storedSettings?: Partial<StandaloneLocalContentSettings> | null;
  /** 是否让 AI 在正文里写生图提示词（现在由「本地 ComfyUI 生图」开关统一决定） */
  imagePromptEnabled?: boolean;
  onlineModeEnabled?: boolean;
}): StandaloneLocalContentSettings {
  let enabledAssets = applyFixedVariableUpdateStandaloneLocalContent({
    ...getStandaloneLocalContentDefaultEnabledMap(),
    ...(input.storedSettings?.enabledAssets || {}),
  });

  enabledAssets = applyTextToImageToStandaloneLocalContent(enabledAssets, input.imagePromptEnabled ?? false);
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

  const mainApi = ref<ApiConfig>(
    hasValidApiContent(stored.mainApi)
      ? normalizeApiConfig(stored.mainApi as Partial<ApiConfig>)
      : normalizeApiConfig(),
  );

  const assistantApis = ref<ApiConfig[]>(
    Array.isArray(stored.assistantApis) && stored.assistantApis.length > 0
      ? stored.assistantApis.map((item: ApiConfig) => normalizeApiConfig(item))
      : [createDefaultApiConfig()],
  );

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

  // 本地 ComfyUI 生图配置（它的开关同时决定 AI 要不要在正文里写生图提示词）
  const comfyUi = ref<ComfyUiSettings>(normalizeComfyUiSettings(stored.comfyUi));

  const standaloneLocalContent = ref<StandaloneLocalContentSettings>(
    resolveStoredStandaloneLocalContentSettings({
      storedSettings: stored.standaloneLocalContent,
      imagePromptEnabled: comfyUi.value.enabled,
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

  const getNormalizedAssistantApis = () => assistantApis.value.map(item => normalizeApiConfig(item));

  // 自动保存非 API 设置；辅助 API 改为显式保存
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
      backgroundImage: backgroundImage.value,
      standaloneLocalContent: standaloneLocalContent.value,
      comfyUi: comfyUi.value,
    });
  };

  const persistMainApi = () => {
    mainApi.value = normalizeApiConfig(mainApi.value);
    return saveStoragePatch({
      mainApi: mainApi.value,
    });
  };

  const persistAssistantApis = () => {
    const normalizedApis = getNormalizedAssistantApis();
    assistantApis.value = normalizedApis;
    return saveStoragePatch({
      assistantApis: normalizedApis,
      customApis: undefined,
      customApi: undefined,
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
      backgroundImage,
      standaloneLocalContent,
      comfyUi,
    ],
    saveBasicSettingsToStorage,
    {
      deep: true,
    },
  );

  // 「本地 ComfyUI 生图」开关一开，AI 就开始在正文里写生图提示词；一关就停
  watch(
    () => comfyUi.value.enabled,
    enabled => {
      standaloneLocalContent.value = {
        ...standaloneLocalContent.value,
        enabledAssets: applyTextToImageToStandaloneLocalContent(standaloneLocalContent.value.enabledAssets, enabled),
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
    [theme, fontFamily, fontSize, contentFontSize, lineHeight],
    () => {
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.setAttribute('data-theme', theme.value);
        appContainer.setAttribute('data-font', fontFamily.value);
        appContainer.setAttribute('data-size', String(fontSize.value));
        appContainer.setAttribute('data-content-size', String(contentFontSize.value));
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
    mainApi,
    assistantApis,
    backgroundImage,
    standaloneLocalContent,
    comfyUi,
    persistMainApi,
    persistAssistantApis,
  };
});
