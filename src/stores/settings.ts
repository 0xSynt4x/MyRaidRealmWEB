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

export function resolveStoredStandaloneLocalContentSettings(input: {
  storedSettings?: Partial<StandaloneLocalContentSettings> | null;
  textToImageEnabled?: boolean;
  onlineModeEnabled?: boolean;
}): StandaloneLocalContentSettings {
  let enabledAssets = applyFixedVariableUpdateStandaloneLocalContent({
    ...getStandaloneLocalContentDefaultEnabledMap(),
    ...(input.storedSettings?.enabledAssets || {}),
  });

  enabledAssets = applyTextToImageToStandaloneLocalContent(enabledAssets, input.textToImageEnabled ?? false);
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

  // 文生图功能
  const textToImageEnabled = ref<boolean>(stored.textToImageEnabled ?? false);

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

  const standaloneLocalContent = ref<StandaloneLocalContentSettings>(
    resolveStoredStandaloneLocalContentSettings({
      storedSettings: stored.standaloneLocalContent,
      textToImageEnabled: textToImageEnabled.value,
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
      textToImageEnabled: textToImageEnabled.value,
      onlineModeEnabled: onlineModeEnabled.value,
      worldDifficulty: worldDifficulty.value,
      backgroundImage: backgroundImage.value,
      standaloneLocalContent: standaloneLocalContent.value,
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
      textToImageEnabled,
      onlineModeEnabled,
      worldDifficulty,
      backgroundImage,
      standaloneLocalContent,
    ],
    saveBasicSettingsToStorage,
    {
      deep: true,
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
    textToImageEnabled,
    onlineModeEnabled,
    worldDifficulty,
    mainApi,
    assistantApis,
    backgroundImage,
    standaloneLocalContent,
    persistMainApi,
    persistAssistantApis,
  };
});
