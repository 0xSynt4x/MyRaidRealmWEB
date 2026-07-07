<template>
  <div class="config-dashboard">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <h2>{{ t('dashboard.worldConfig') }}</h2>
      <div class="toolbar-actions">
        <button
          class="icon-btn primary fullscreen-btn"
          :title="isFullscreen ? t('dashboard.exitFullscreen') : t('dashboard.enterFullscreen')"
          @click="toggleFullscreen"
        >
          <i :class="isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
        </button>
        <button class="start-game-btn" :disabled="isStarting" @click="startGame">
          {{ isStarting ? t('dashboard.starting') : t('dashboard.startGame') }}
        </button>
      </div>
    </div>

    <!-- 预设条(始终显示) -->
    <div class="presets-bar">
      <span class="preset-hint">{{ t('dashboard.presetHint') }}</span>
      <button
        v-for="preset in presets"
        :key="preset.id"
        :class="{ active: currentPresetId === preset.id }"
        :title="`${preset.name} - ${preset.description}`"
        @click="loadPreset(preset)"
      >
        {{ preset.icon }}
      </button>
    </div>

    <!-- 配置区块 -->
    <div class="sections">
      <ConfigSection v-model:expanded="expanded.player" icon="👤" title="dashboard.playerSetup" :hint="playerHint">
        <PlayerConfigCompact v-model:config="config" />
      </ConfigSection>

      <ConfigSection v-model:expanded="expanded.world" icon="🌍" title="dashboard.worldview" :hint="worldHint">
        <WorldConfigCompact v-model:config="config" />
      </ConfigSection>

      <ConfigSection v-model:expanded="expanded.factions" icon="🤝" title="dashboard.factions" :hint="factionsHint">
        <FactionsConfigCompact :config="config" />
      </ConfigSection>

      <ConfigSection
        v-model:expanded="expanded.business"
        icon="🏪"
        title="dashboard.businessAssets"
        :hint="businessHint"
      >
        <BusinessConfigCompact v-model:config="config" />
      </ConfigSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Schema } from '../../../schema/schema';
import { useMessageActions } from '../../composables/useMessageActions';
import { useFullscreen } from '../../composables/useFullscreen';
import { useI18n } from '../../i18n';
import type { PresetConfig } from '../../presets/types';
import { useSetupStore } from '../../stores/setup';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { loadPresetsBundle } from '../../utils/preset-loader';
import { markSetupCompleted } from '../../utils/setupProgress';
import { writeSetupConfigToCurrentMessage } from '../../utils/setupStartGame';
import type { LocalContentEntryConfig } from '../../presets/types';
import ConfigSection from '../common/ConfigSection.vue';
import BusinessConfigCompact from '../config/BusinessConfigCompact.vue';
import FactionsConfigCompact from '../config/FactionsConfigCompact.vue';
import PlayerConfigCompact from '../config/PlayerConfigCompact.vue';
import WorldConfigCompact from '../config/WorldConfigCompact.vue';

const emit = defineEmits<{ complete: [] }>();

const setupStore = useSetupStore();
const statDataStore = useStatDataStore();
const messageActions = useMessageActions();
const { t, locale } = useI18n();

const currentPresetId = ref<string | null>('default');
const isStarting = ref(false);
const presets = ref<PresetConfig[]>([]);
const expanded = reactive({
  world: false,
  player: true,
  factions: false,
  business: false,
});

// 全屏功能
const { isFullscreen, toggleFullscreen } = useFullscreen();

// 配置数据：默认使用 schema 预设值初始化，预设包加载后再覆盖
const config = reactive(Schema.parse({}));

function syncSelectedPresetMeta(preset: PresetConfig) {
  setupStore.selectedPreset = {
    ...preset,
    config: _.cloneDeep(config),
    localContentEntries: ((preset.localContentEntries ?? []) as LocalContentEntryConfig[]).map(entry => ({ ...entry })),
    legacyMigrationWarnings: [...(preset.legacyMigrationWarnings ?? [])],
  };
}

(async () => {
  try {
    const loaded = await loadPresetsBundle();
    presets.value = loaded;

    if (loaded.length === 0) {
      console.warn(`[WorldConfigDashboard] ${t('dashboard.noPresetConfig')}`);
      return;
    }

    const defaultPreset = loaded.find(p => p.id === 'default') || loaded[0];
    if (!defaultPreset) {
      return;
    }

    const parsedDefault = Schema.parse(_.cloneDeep(defaultPreset.config));
    Object.assign(config, parsedDefault);
    currentPresetId.value = defaultPreset.id;
    syncSelectedPresetMeta(defaultPreset);
  } catch (error) {
    console.error('[WorldConfigDashboard] 加载预设包失败:', error);
    toastr.error(t('dashboard.loadPresetFailed'));
  }
})();

// 提示信息
const worldHint = computed(() => `${config.世界.力量体系} · ${config.世界.时间系统.纪元名称}`);
const playerHint = computed(
  () => `${config.玩家.身份信息.职业} · ${config.玩家.货币资源.主货币.名称}${config.玩家.货币资源.主货币.数量}`,
);
const factionsHint = computed(() => {
  const count = Object.keys(config.世界?.势力网络 || {}).length;
  return count > 0 ? t('dashboard.factionsCount', { count }) : t('dashboard.notConfigured');
});
const businessHint = computed(() => {
  const count = Object.keys(config.玩家?.经营实体 || {}).length;
  return count > 0 ? t('dashboard.businessCount', { count }) : t('dashboard.notConfigured');
});

// 加载预设
function loadPreset(preset: PresetConfig) {
  // 使用 Schema.parse 确保配置被正确解析，包括 设置.积分系统._兑换比例 等字段
  const parsedConfig = Schema.parse(_.cloneDeep(preset.config));
  Object.assign(config, parsedConfig);
  currentPresetId.value = preset.id;
  syncSelectedPresetMeta(preset);
  expanded.world = false;
  expanded.player = true;
  expanded.factions = false;
  expanded.business = false;
  toastr.success(t('dashboard.loadedPreset', { name: preset.name }));
}

// 将当前配置同步到开局草稿；正式写回只发生在明确开始游戏时
function syncConfigToDraft() {
  Object.assign(setupStore.config, _.cloneDeep(config));
}

function buildOpeningPrompt() {
  const backgroundInfo = config.玩家.身份信息.背景信息 ? `玩家背景:${config.玩家.身份信息.背景信息}.` : '';

  return locale.value === 'en'
    ? `Based on the context above, generate a fitting opening scene for the story.${backgroundInfo} Requirements: naturally introduce the player character's identity and background within the opening narrative. (response in English for all subsequent replies))`
    : `根据上文,生成相应的开局剧情.${backgroundInfo}要求:在剧情中自然地引出玩家角色的身份和背景.`;
}

watch(
  config,
  _.debounce(() => {
    syncConfigToDraft();
  }, 1000),
  { deep: true },
);

// 开始游戏
async function startGame() {
  if (isStarting.value) return; // 防止重复调用

  try {
    // 验证玩家姓名是否已填写
    if (!config.玩家.姓名 || config.玩家.姓名.trim() === '') {
      toastr.warning(t('dashboard.playerNameRequired'));
      // 自动展开玩家设定区块
      expanded.player = true;
      return;
    }

    isStarting.value = true; // 设置为启动中状态

    // 每次点击“开始游戏”都强制刷新预设包脚本，确保 index.js 热更新可见
    try {
      await loadPresetsBundle(true);
      const refreshedPresets = await loadPresetsBundle();
      const refreshedCurrentPreset = refreshedPresets.find(preset => preset.id === currentPresetId.value);
      if (refreshedCurrentPreset) {
        syncSelectedPresetMeta(refreshedCurrentPreset);
      }
    } catch (reloadError) {
      console.warn('[WorldConfigDashboard] 开始游戏前强制刷新预设包失败，继续使用当前配置:', reloadError);
    }

    // 确保配置已同步到开局草稿，并在明确开始游戏时正式提交
    syncConfigToDraft();
    await writeSetupConfigToCurrentMessage(_.cloneDeep(config), 'world-config.apply');
    statDataStore.refreshData('world-config.apply');

    markSetupCompleted();

    // 先切到主游戏界面，再继续等待开场消息生成
    emit('complete');

    // 等待一小段时间，确保 pinia store 的 watch 已经触发并将数据写入酒馆变量
    await new Promise(resolve => setTimeout(resolve, 500));

    const openingPrompt = buildOpeningPrompt();

    const openingTriggered = await messageActions.sendStandaloneUserMessage(
      openingPrompt,
      'world_config_dashboard_opening',
    );

    if (!openingTriggered) {
      toastr.warning(t('setup.standalone.openingReplyPending'));
    }
  } catch (error) {
    console.error('开始游戏失败:', error);
    toastr.error(t('dashboard.startGameFailed'));
  } finally {
    isStarting.value = false;
  }
}

// toggleFullscreen 和 isFullscreen 已从 useFullscreen composable 导入
</script>

<style scoped>
.config-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fullscreen-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  min-width: 32px;
}

.fullscreen-btn i {
  font-size: 14px;
}

.toolbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.start-game-btn {
  padding: 6px 16px;
  border: none;
  background: var(--accent-success);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
}

.start-game-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.start-game-btn:disabled {
  background: var(--text-tertiary, #9ca3af);
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
}

.start-game-btn:disabled:hover {
  opacity: 0.7;
  transform: none;
}

.presets-bar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  overflow-x: auto;
}

.presets-bar button {
  height: 36px;
  flex-shrink: 0;
  border: 1px solid var(--border-light);
  background: transparent;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  transition: all 150ms;
  padding: 0 8px;
  min-width: 36px;
}

.preset-hint {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  padding: 0 8px;
  display: flex;
  align-items: center;
}

.presets-bar button:hover {
  border-color: var(--accent-primary);
  background: var(--bg-card);
  transform: translateY(-2px);
}

.presets-bar button.active {
  border-color: var(--accent-primary);
  background: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.sections {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

/* ===== 响应式适配 ===== */

@media (max-width: 1023px) {
  .toolbar h2 {
    font-size: 15px;
  }

  .start-game-btn {
    padding: 5px 12px;
    font-size: 13px;
  }

  .fullscreen-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .fullscreen-btn i {
    font-size: 13px;
  }

  .presets-bar {
    padding: 6px 10px;
  }

  .preset-hint {
    font-size: 12px;
  }

  .presets-bar button {
    height: 32px;
    min-width: 32px;
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .toolbar {
    padding: 6px 8px;
  }

  .toolbar h2 {
    font-size: 14px;
    flex: 1;
    min-width: 120px;
  }

  .toolbar-actions {
    gap: 6px;
  }

  .start-game-btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .fullscreen-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .fullscreen-btn i {
    font-size: 12px;
  }

  .presets-bar {
    padding: 6px 8px;
    gap: 3px;
  }

  .preset-hint {
    font-size: 11px;
    padding: 0 4px;
  }

  .presets-bar button {
    height: 30px;
    min-width: 30px;
    padding: 0 6px;
    font-size: 16px;
  }

  .sections {
    padding: 0 2px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 6px;
  }

  .toolbar h2 {
    font-size: 13px;
  }

  .start-game-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .fullscreen-btn {
    width: 26px;
    height: 26px;
    min-width: 26px;
  }

  .fullscreen-btn i {
    font-size: 11px;
  }

  .presets-bar {
    padding: 4px 6px;
    gap: 2px;
  }

  .preset-hint {
    font-size: 10px;
    padding: 0 2px;
  }

  .presets-bar button {
    height: 28px;
    min-width: 28px;
    padding: 0 4px;
    font-size: 15px;
  }
}
</style>
