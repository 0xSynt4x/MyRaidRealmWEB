/**
 * 设置向导状态管理
 * 管理0层设置页面的多页面流程
 */

import { klona } from 'klona';
import { notify } from '../utils/notify';
import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import { Schema } from '../../schema/schema';
import { tCurrent } from '../i18n';
import type { LocalContentEntryConfig, PresetConfig, PresetMigrationWarning } from '../presets/types';
import { rehydratePresetWithRegisteredWorldbooks } from '../assets/worldbook-registry';
import { getSafeCurrentChatId, hasStandaloneRuntimeSession } from '../utils/hostEnvironment';
import { loadStandaloneRuntimeSession, persistStandaloneRuntimeSession } from '../utils/standaloneRuntime';
import { normalizeLocalContentEntriesInput } from '../utils/standaloneLocalContent';
import { migrateLegacyPresetLocalContent } from '../utils/legacyPresetCompat';

export type SetupPage = 'home' | 'presets' | 'playerInfo' | 'settings' | 'aiGenerate' | 'workshop';

const SELECTED_PRESET_STORAGE_KEY_PREFIX = 'th1980s:selected-preset';

/**
 * 预设记忆存在哪。
 *
 * 🔴 会话还没建立时返回 null —— 这时候**不能写**。
 * 因为会话是点「开始游戏」才建立的，而选预设更早；写下去会落到兜底作用域，
 * 等会话建立后按会话 id 去读就再也找不回来了（表现为刷新后预设丢失、世界书按钮变灰）。
 * 没会话时先留在内存，等会话建立后由 flushSelectedPresetToStorage() 补写。
 */
function getSelectedPresetStorageKey(): string | null {
  if (!hasStandaloneRuntimeSession()) {
    return null;
  }

  return `${SELECTED_PRESET_STORAGE_KEY_PREFIX}:${getSafeCurrentChatId()}`;
}

function loadStoredSelectedPreset(): PresetConfig | null {
  try {
    const storageKey = getSelectedPresetStorageKey();
    if (!storageKey) {
      return null;
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as PresetConfig;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || typeof parsed.name !== 'string') {
      return null;
    }

    return rehydratePresetWithRegisteredWorldbooks(parsed);
  } catch (error) {
    console.warn('[Setup] 读取本地预设记忆失败:', error);
    return null;
  }
}

function normalizeRegisteredWorldbookNamesInput(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const names = Array.from(
    new Set(
      input
        .filter((name): name is string => typeof name === 'string')
        .map(name => name.trim())
        .filter(Boolean),
    ),
  );

  return names.length > 0 ? names : undefined;
}

function persistSelectedPreset(preset: PresetConfig | null): void {
  try {
    const storageKey = getSelectedPresetStorageKey();
    // 会话还没建立：先留在内存，等会话建立后再补写（见 flushSelectedPresetToStorage）
    if (!storageKey) {
      return;
    }

    if (!preset) {
      localStorage.removeItem(storageKey);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(preset));
  } catch (error) {
    console.warn('[Setup] 写入本地预设记忆失败:', error);
  }
}

/**
 * 清掉旧会话遗留的预设记忆。
 *
 * 预设记忆按会话 id 存（`th1980s:selected-preset:<会话 id>`），换局后旧 key 再没人读，
 * 但会一直占着本地存储。这里只保留当前会话那一份，其余删掉。
 *
 * 没有会话时不动手：那时算不出当前 key，不能判断哪些是过期的。
 */
function pruneStaleSelectedPresetStorage(): void {
  try {
    const currentStorageKey = getSelectedPresetStorageKey();
    if (!currentStorageKey) {
      return;
    }

    const keyPrefix = `${SELECTED_PRESET_STORAGE_KEY_PREFIX}:`;
    const staleKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(keyPrefix) && key !== currentStorageKey) {
        staleKeys.push(key);
      }
    }

    staleKeys.forEach(key => localStorage.removeItem(key));
    if (staleKeys.length > 0) {
      console.info(`[Setup] 已清理旧会话遗留的预设记忆 count=${staleKeys.length}`);
    }
  } catch (error) {
    console.warn('[Setup] 清理旧会话预设记忆失败:', error);
  }
}

export const useSetupStore = defineStore('setup', () => {
  // ===== 页面状态 =====
  const currentPage = ref<SetupPage>('home');
  const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left');

  // ===== 预设状态 =====
  const selectedPreset = ref<PresetConfig | null>(loadStoredSelectedPreset());
  // 启动时顺手清掉旧会话遗留的预设记忆（换局后那些 key 再没人读）
  pruneStaleSelectedPresetStorage();

  // ===== 玩家手填的世界书条目 =====
  // 没选预设时（比如 AI 生成开局）用；存在会话里，跟着存档走，不跨会话串。
  const customWorldbookEntries = ref<LocalContentEntryConfig[]>(loadStoredCustomWorldbookEntries());

  /**
   * 从当前会话里读出手填条目。
   * 会话还没建立时读不到（返回空），此时面板上的编辑只留在内存，等会话建立后补写。
   */
  function loadStoredCustomWorldbookEntries(): LocalContentEntryConfig[] {
    const session = loadStandaloneRuntimeSession();
    const entries = session?.custom_worldbook_entries;
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map(entry => ({ ...entry }));
  }

  /**
   * 把手填条目写回当前会话。
   * 🔴 会话还没建立时直接跳过——写下去会落到兜底位置，等会话建立后就再也读不回来了。
   * 落盘前统一归一化：没名字或没内容的空条目不会存（用户还在编辑的那条留在内存里）。
   */
  function persistCustomWorldbookEntries(): void {
    try {
      const session = loadStandaloneRuntimeSession();
      if (!session) {
        return;
      }

      persistStandaloneRuntimeSession({
        ...session,
        custom_worldbook_entries: normalizeLocalContentEntriesInput(customWorldbookEntries.value),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[Setup] 写入本地世界书条目失败:', error);
    }
  }

  watch(customWorldbookEntries, persistCustomWorldbookEntries, { deep: true });

  // ===== AI生成状态 =====
  const aiGeneratedConfig = ref<string>('');
  const isGenerating = ref(false);
  const generationError = ref('');
  const currentGenerationId = ref('');
  // 标记是否从AI生成页面进入playerInfo，用于返回导航
  const cameFromAiGenerate = ref(false);

  // ===== 配置数据 =====
  // 默认使用 schema 预设值初始化，避免将全部预设打入主包
  const config = reactive(Schema.parse({}));

  if (selectedPreset.value?.config) {
    try {
      Object.assign(config, Schema.parse(klona(selectedPreset.value.config)));
    } catch (error) {
      console.warn('[Setup] 恢复本地预设记忆失败，已回退为空:', error);
      selectedPreset.value = null;
      persistSelectedPreset(null);
    }
  }

  // ===== 页面导航 =====
  function goToPage(page: SetupPage, direction: 'forward' | 'back' = 'forward') {
    slideDirection.value = direction === 'forward' ? 'slide-left' : 'slide-right';
    currentPage.value = page;
  }

  function goBack() {
    switch (currentPage.value) {
      case 'presets':
        goToPage('home', 'back');
        break;
      case 'playerInfo':
        // 如果是从AI生成页面进入的，返回AI生成页面
        if (cameFromAiGenerate.value) {
          cameFromAiGenerate.value = false;
          goToPage('aiGenerate', 'back');
        } else {
          goToPage('presets', 'back');
        }
        break;
      case 'aiGenerate':
        goToPage('presets', 'back');
        break;
      case 'workshop':
        goToPage('presets', 'back');
        break;
      case 'settings':
        goToPage('playerInfo', 'back');
        break;
    }
  }

  // ===== 预设操作 =====
  function notifyLegacyMigrationWarnings(warnings: PresetMigrationWarning[] | undefined) {
    if (!warnings || warnings.length === 0) {
      return;
    }

    const unresolvedEntries = warnings.flatMap(warning => warning.entryNames).filter(Boolean);
    if (unresolvedEntries.length === 0) {
      return;
    }

    notify.warning(
      tCurrent('setup.presetImport.legacyWorldbookEntriesPartial', { names: unresolvedEntries.join('、') }),
    );
  }

  function selectPreset(preset: PresetConfig) {
    const rehydratedPreset = rehydratePresetWithRegisteredWorldbooks(preset);
    selectedPreset.value = rehydratedPreset;
    // 向前兼容：移除旧版本字段
    const cleanedConfig = removeDeprecatedFields(klona(rehydratedPreset.config));
    // 加载预设配置
    Object.assign(config, Schema.parse(cleanedConfig));

    notifyLegacyMigrationWarnings(rehydratedPreset.legacyMigrationWarnings);

    // 进入玩家信息页面
    goToPage('playerInfo', 'forward');
  }

  // ===== AI生成开局 =====
  function startAiGenerate() {
    selectedPreset.value = null;
    // 不清空 aiGeneratedConfig，保留之前的生成结果
    isGenerating.value = false;
    clearGenerationState();
    goToPage('aiGenerate', 'forward');
  }

  function startWorkshop() {
    goToPage('workshop', 'forward');
  }

  function setAiGeneratedConfig(configStr: string) {
    aiGeneratedConfig.value = configStr;
  }

  function setGenerating(value: boolean) {
    isGenerating.value = value;
  }

  function setGenerationError(message: string) {
    generationError.value = message;
  }

  function setCurrentGenerationId(generationId: string) {
    currentGenerationId.value = generationId;
  }

  function clearGenerationState() {
    generationError.value = '';
    currentGenerationId.value = '';
  }

  async function applyAiGeneratedConfig(configStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(configStr);

      // 验证数据结构
      const configData = data.config || data;

      // 向前兼容：移除旧版本字段
      const cleanedConfig = removeDeprecatedFields(configData);

      const migrationResult = migrateLegacyPresetLocalContent({
        localContentEntries: data.localContentEntries,
        worldbookEntries: data.worldbookEntries,
      });
      const registeredWorldbookNames = normalizeRegisteredWorldbookNamesInput(data.registeredWorldbookNames);

      // 使用 Schema 解析和验证
      const parsedConfig = Schema.parse(cleanedConfig);

      // 加载配置
      Object.assign(config, parsedConfig);

      // 如果有预设元信息，创建预设对象
      if (
        data.id ||
        data.name ||
        registeredWorldbookNames?.length ||
        migrationResult.localContentEntries.length > 0 ||
        migrationResult.warnings.length > 0
      ) {
        selectedPreset.value = rehydratePresetWithRegisteredWorldbooks({
          id: data.id || `ai-generated-${Date.now()}`,
          name: data.name || tCurrent('setup.aiGenerate.generatedPresetName'),
          icon: data.icon || '😺',
          category: data.category || tCurrent('setup.aiGenerate.generatedPresetCategory'),
          tags: data.tags || [tCurrent('setup.aiGenerate.generatedPresetTag')],
          description: data.description || tCurrent('setup.aiGenerate.generatedPresetDescription'),
          config: parsedConfig,
          registeredWorldbookNames,
          localContentEntries: migrationResult.localContentEntries,
          legacyMigrationWarnings: migrationResult.warnings,
        });

        notifyLegacyMigrationWarnings(selectedPreset.value.legacyMigrationWarnings);
      }

      notify.success(tCurrent('setup.aiGenerate.applied'));
      return true;
    } catch (error) {
      console.error('[Setup] 应用AI生成配置失败:', error);
      notify.error(
        tCurrent('setup.aiGenerate.invalidJson', { error: error instanceof Error ? error.message : String(error) }),
      );
      return false;
    }
  }

  // ===== 向前兼容处理 =====
  /**
   * 规范化人物档案 key：统一为 NPC_数字
   * 兼容历史键：npc_数字 / 纯数字 / 人名键
   */
  function normalizeNpcArchiveKeys(archive: Record<string, any>): Record<string, any> {
    const oldEntries = Object.entries(archive);
    const upperNpcPattern = /^NPC_(\d+)$/;
    const lowerNpcPattern = /^npc_(\d+)$/;
    const pureNumberPattern = /^\d+$/;

    const normalizedArchive: Record<string, any> = {};
    const usedIds = new Set<number>();
    const pending: Array<{ key: string; value: any; preferredId?: number }> = [];

    // 第一轮：保留合法的 NPC_数字 键
    for (const [key, value] of oldEntries) {
      const upperMatch = key.match(upperNpcPattern);
      if (upperMatch) {
        const id = Number(upperMatch[1]);
        if (id > 0 && Number.isInteger(id) && !usedIds.has(id)) {
          usedIds.add(id);
          normalizedArchive[`NPC_${id}`] = value;
          continue;
        }
      }

      const lowerMatch = key.match(lowerNpcPattern);
      if (lowerMatch) {
        pending.push({ key, value, preferredId: Number(lowerMatch[1]) });
        continue;
      }

      if (pureNumberPattern.test(key)) {
        pending.push({ key, value, preferredId: Number(key) });
        continue;
      }

      // 人名键或其他历史格式
      pending.push({ key, value });
    }

    const maxReservedId = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) : 0;
    let nextId = maxReservedId + 1;

    const allocateNextId = () => {
      while (usedIds.has(nextId)) {
        nextId += 1;
      }
      const allocated = nextId;
      usedIds.add(allocated);
      nextId += 1;
      return allocated;
    };

    // 第二轮：按原顺序稳定分配剩余键
    for (const item of pending) {
      const preferredId = item.preferredId;
      let targetId: number;

      if (
        typeof preferredId === 'number' &&
        Number.isInteger(preferredId) &&
        preferredId > 0 &&
        !usedIds.has(preferredId)
      ) {
        targetId = preferredId;
        usedIds.add(targetId);
        if (targetId >= nextId) {
          nextId = targetId + 1;
        }
      } else {
        targetId = allocateNextId();
      }

      normalizedArchive[`NPC_${targetId}`] = item.value;
    }

    return normalizedArchive;
  }

  /**
   * 移除旧版本中的基础属性字段（六维属性）
   * 规范化人物档案 key：统一为 NPC_数字
   * 确保向前兼容：旧存档导入时自动清理已废弃字段并升级历史键
   */
  function removeDeprecatedFields(config: any): any {
    if (config?.玩家?.基础属性) {
      const { 力量, 体质, 敏捷, 智力, 感知, 魅力, ...rest } = config.玩家.基础属性;

      // 如果删除六维后还有其他字段（如属性说明），保留它们
      if (Object.keys(rest).length > 0) {
        config.玩家.基础属性 = rest;
      } else {
        // 如果基础属性为空对象，直接删除
        delete config.玩家.基础属性;
      }

      console.info('[Setup] 已移除旧版本的六维属性字段');
    }

    // 统一人物档案 ID 为 NPC_数字（兼容旧版 npc_数字 / 纯数字 / 人名键）
    if (config?.人物档案 && typeof config.人物档案 === 'object' && !Array.isArray(config.人物档案)) {
      const oldArchive = config.人物档案 as Record<string, any>;
      const normalizedArchive = normalizeNpcArchiveKeys(oldArchive);
      const oldKeys = Object.keys(oldArchive);
      const newKeys = Object.keys(normalizedArchive);
      const changed = oldKeys.length !== newKeys.length || oldKeys.some((key, idx) => key !== newKeys[idx]);

      if (changed) {
        config.人物档案 = normalizedArchive;
        console.info('[Setup] 已规范化人物档案ID为 NPC_数字（兼容旧键）');
      }
    }

    return config;
  }

  // ===== 预设导入/导出 =====
  async function importPreset(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证数据结构
      if (!data.config) {
        notify.error(tCurrent('setup.presetImport.invalidFileMissingConfig'));
        return false;
      }

      // 向前兼容：移除旧版本字段
      const cleanedConfig = removeDeprecatedFields(data.config);

      // 使用 Schema 解析和验证
      const parsedConfig = Schema.parse(cleanedConfig);

      const migrationResult = migrateLegacyPresetLocalContent({
        localContentEntries: data.localContentEntries,
        worldbookEntries: data.worldbookEntries,
      });
      const registeredWorldbookNames = normalizeRegisteredWorldbookNamesInput(data.registeredWorldbookNames);

      // 创建预设对象
      const importedPreset: PresetConfig = {
        id: data.id || `imported-${Date.now()}`,
        name: data.name || tCurrent('setup.presetImport.importedName'),
        icon: data.icon || '📥',
        category: data.category || tCurrent('setup.presetImport.importedCategory'),
        tags: data.tags || [tCurrent('setup.presetImport.importedTag')],
        description: data.description || tCurrent('setup.presetImport.importedDescription'),
        config: parsedConfig,
        registeredWorldbookNames,
        localContentEntries: migrationResult.localContentEntries,
        legacyMigrationWarnings: migrationResult.warnings,
      };

      // 选择导入的预设
      selectPreset(importedPreset);
      notify.success(tCurrent('setup.presetImport.success', { name: importedPreset.name }));
      return true;
    } catch (error) {
      console.error('[Setup] 导入预设失败:', error);
      notify.error(tCurrent('setup.presetImport.failed'));
      return false;
    }
  }

  // ===== 表单验证 =====
  function validatePlayerInfo(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.玩家?.姓名?.trim()) {
      errors.push(tCurrent('setup.validation.characterNameRequired'));
    }
    return { valid: errors.length === 0, errors };
  }

  // ===== 重置状态 =====
  function reset() {
    currentPage.value = 'home';
    selectedPreset.value = null;
    customWorldbookEntries.value = [];
    aiGeneratedConfig.value = '';
    isGenerating.value = false;
    clearGenerationState();
    cameFromAiGenerate.value = false;
    Object.assign(config, Schema.parse({}));
  }

  watch(
    selectedPreset,
    value => {
      persistSelectedPreset(value ? klona(value) : null);
    },
    { deep: true },
  );

  /**
   * 会话建立后补写一次预设记忆。
   *
   * 「选中预设」比「会话建立」更早，那时写不进去（只能留在内存）。
   * 会话一建立就调这个，把内存里的预设落到会话作用域下，刷新才读得回来。
   */
  function flushSelectedPresetToStorage(): void {
    persistSelectedPreset(selectedPreset.value ? klona(selectedPreset.value) : null);
    // 新会话已建立，上一局那份预设记忆再没人读，顺手清掉
    pruneStaleSelectedPresetStorage();
  }

  /** 同上：会话建立后补写手填的世界书条目 */
  function flushCustomWorldbookEntriesToStorage(): void {
    persistCustomWorldbookEntries();
  }

  /**
   * 会话被整个换掉之后（导入存档、回到首页），把手填条目重新读一遍。
   * 条目存在会话里，会话换了就得跟着换，否则面板还显示上一个存档的条目。
   */
  function syncCustomWorldbookEntriesFromSession(): void {
    customWorldbookEntries.value = loadStoredCustomWorldbookEntries();
  }

  return {
    // 状态
    currentPage,
    slideDirection,
    selectedPreset,
    config,
    aiGeneratedConfig,
    isGenerating,
    generationError,
    currentGenerationId,
    cameFromAiGenerate,

    // 页面导航
    goToPage,
    goBack,

    // 预设操作
    selectPreset,
    importPreset,
    flushSelectedPresetToStorage,
    flushCustomWorldbookEntriesToStorage,

    // 手填世界书条目（跟着会话走）
    customWorldbookEntries,
    syncCustomWorldbookEntriesFromSession,

    // AI生成开局
    startAiGenerate,
    startWorkshop,
    setAiGeneratedConfig,
    setGenerating,
    setGenerationError,
    setCurrentGenerationId,
    clearGenerationState,
    applyAiGeneratedConfig,

    // 验证
    validatePlayerInfo,

    // 重置
    reset,
  };
});
