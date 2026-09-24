<template>
  <div class="header-bar">
    <!-- 左：局名 -->
    <span class="header-brand">{{ 纪元名称 }}</span>

    <!-- 中：只读状态（时间 · 地点 · 天气），不放按钮 -->
    <div class="header-status">
      <span class="header-item">
        <i class="ti ti-clock"></i>
        {{ 当前时间 }}
      </span>
      <span class="header-sep"></span>
      <span class="header-item">
        <i class="ti ti-map-pin"></i>
        {{ 当前地点 }}
      </span>
      <span class="header-sep"></span>
      <span class="header-item weather-item">
        <i :class="天气图标"></i>
        {{ 当前天气 }}
      </span>
    </div>

    <!-- 右：功能区 -->
    <div ref="headerActionsRef" class="header-actions">
      <!-- 货币显示 -->
      <span class="header-currency">
        <i class="ti ti-coins" style="color: var(--accent-success)"></i>
        <span class="stat-label">{{ 主货币名称 }}</span>
        <span class="stat-value positive">{{ 主货币数量 }}</span>
      </span>

      <!-- 三点菜单：合并原有刷新/存档/全屏按钮 -->
      <div class="header-action-menu">
        <button
          class="icon-btn primary header-btn header-menu-trigger"
          :title="t('header.moreActions')"
          aria-haspopup="menu"
          :aria-expanded="isActionMenuOpen"
          @click="toggleActionMenu"
        >
          <i class="ti ti-dots"></i>
        </button>

        <div v-if="isActionMenuOpen" class="header-dropdown" role="menu" :aria-label="t('header.topActionMenu')">
          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isRefreshing"
            :title="isRefreshing ? t('header.refreshing') : t('header.refreshVariables')"
            @click="runMenuAction(handleRefreshApi)"
          >
            <i class="ti ti-wand" :class="{ 'ti-spin': isRefreshing }"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isArchiving"
            :title="isArchiving ? t('header.archiving') : t('header.archiveAndDownload')"
            @click="runMenuAction(handleArchive)"
          >
            <i :class="isArchiving ? 'ti ti-loader-2 ti-spin' : 'ti ti-device-floppy'"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isResetting"
            :title="isResetting ? t('header.resettingGame') : t('header.resetGame')"
            @click="runMenuAction(handleResetGame)"
          >
            <i :class="isResetting ? 'ti ti-loader-2 ti-spin' : 'ti ti-rotate'"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :title="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
            @click="runMenuAction(toggleFullscreen)"
          >
            <i :class="isFullscreen ? 'ti ti-arrows-minimize' : 'ti ti-arrows-maximize'"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMessageActions } from '../../composables/useMessageActions';
import { useI18n } from '../../i18n';
import { useFullscreen } from '../../composables/useFullscreen';
import { useMessagesStore } from '../../stores/messages';
import { useNotificationStore } from '../../stores/notification';
import { useSetupStore } from '../../stores/setup';
import { useStatDataStore } from '../../stores/statData';
import { clearPendingStandaloneArchiveResume } from '../../utils/archive';
import { clearLocalGameState } from '../../utils/localGameState';
import { saveCurrentArchive } from '../../utils/archive';
import { getWeatherIcon } from '../../utils/weatherFamily';

const emit = defineEmits<{
  (event: 'reset-game'): void;
}>();

const store = useStatDataStore();
const { data } = storeToRefs(store);
const messagesStore = useMessagesStore();
const notificationStore = useNotificationStore();
const setupStore = useSetupStore();
const messageActions = useMessageActions();
const { t } = useI18n();

// 计算属性
const 纪元名称 = computed(() => data.value.世界?.时间系统?.纪元名称 || t('header.defaultEraName'));
const 当前时间 = computed(() => data.value.世界?.时间系统?.当前时间 || '--');
const 当前天气 = computed(() => data.value.世界?.时间系统?.当前天气 || t('header.defaultWeather'));
const 当前地点 = computed(() => data.value.世界?.空间定位?.当前位置 || '--');
const 主货币名称 = computed(() => data.value.玩家?.货币资源?.主货币?.名称 || t('header.defaultCurrencyName'));
const 主货币数量 = computed(() => Math.floor(data.value.玩家?.货币资源?.主货币?.数量 || 0));

// 天气图标：走共用词表（weatherFamily.ts），顶栏和场景横幅共用一份判定
const 天气图标 = computed(() => getWeatherIcon(当前天气.value));

// 状态
const isRefreshing = ref(false);

// 全屏功能
const { isFullscreen, toggleFullscreen } = useFullscreen();

const isArchiving = ref(false);
const isResetting = ref(false);
const headerActionsRef = ref<HTMLElement | null>(null);
const isActionMenuOpen = ref(false);

function closeActionMenu() {
  isActionMenuOpen.value = false;
}

function toggleActionMenu() {
  isActionMenuOpen.value = !isActionMenuOpen.value;
}

function handleActionMenuClickOutside(event: MouseEvent) {
  const root = headerActionsRef.value;
  if (!root) return;
  if (!root.contains(event.target as Node)) {
    closeActionMenu();
  }
}

function handleActionMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeActionMenu();
  }
}

function runMenuAction(action: () => void) {
  closeActionMenu();
  action();
}

onMounted(() => {
  document.addEventListener('mousedown', handleActionMenuClickOutside);
  document.addEventListener('keydown', handleActionMenuKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleActionMenuClickOutside);
  document.removeEventListener('keydown', handleActionMenuKeydown);
});

async function handleArchive() {
  if (isArchiving.value) {
    return;
  }

  const confirmed = await notificationStore.confirm({
    title: t('header.archiveConfirmTitle'),
    message: t('header.archiveConfirmMessage'),
    type: 'info',
    confirmText: t('header.continueArchive'),
  });

  if (!confirmed) {
    return;
  }

  isArchiving.value = true;

  try {
    await saveCurrentArchive();
    notificationStore.success(t('header.archiveSuccess'));
  } catch (error) {
    console.error('[HeaderBar] 存档失败:', error);
    notificationStore.error(
      t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isArchiving.value = false;
  }
}

async function handleResetGame() {
  if (isResetting.value) {
    return;
  }

  const confirmed = await notificationStore.confirm({
    title: t('header.resetGameConfirmTitle'),
    message: t('header.resetGameConfirmMessage'),
    type: 'danger',
    confirmText: t('header.continueResetGame'),
  });

  if (!confirmed) {
    return;
  }

  isResetting.value = true;

  try {
    clearPendingStandaloneArchiveResume();
    clearLocalGameState();
    setupStore.reset();
    messagesStore.clearMessages();
    emit('reset-game');

    notificationStore.success(t('header.resetGameSuccess'));
  } catch (error) {
    console.error('[HeaderBar] 回到首页失败:', error);
    notificationStore.error(
      t('header.resetGameFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isResetting.value = false;
  }
}

// 手动重跑最近一条 AI 回复的变量更新
async function handleRefreshApi() {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  try {
    await messageActions.refreshLatestAssistantVariableUpdate('header_manual_variable_refresh');
  } catch (error) {
    console.error('[HeaderBar] 刷新失败:', error);
    notificationStore.error(
      t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isRefreshing.value = false;
  }
}

// toggleFullscreen 和 isFullscreen 已从 useFullscreen composable 导入
</script>

<style scoped>
/* ===== HeaderBar · 阶段2：极简状态带 =====
   分区照参照站：左局名 / 中只读状态 / 右图标按钮。
   颜色一律走皮肤变量（ui-tokens.css），换主题自动跟着变。
   去掉了原来的渐变装饰线、圆角、阴影和实心按钮底。 */

/* ⚠️ 扁平化改版：顶栏已整体隐藏 ——
   局名 / 时间·地点·天气 / 货币 / 三点菜单 全部并入 SceneBanner。
   这里结构原样保留、只隐藏（以后可能还要用，不删）。
   要恢复顶栏：把下面 display 改回 flex，并把 MainLayout 的
   grid-template-rows 首行从 0 改回 var(--ui-topbar-h)。 */
.header-bar {
  display: none;
  align-items: center;
  gap: 14px;
  min-height: var(--ui-topbar-h, 46px);
  padding: 0 18px;
  background: transparent;
  border-bottom: 1px solid var(--ui-line-soft);
  font-size: var(--text-xs);
  position: relative;
  z-index: 10;
}

/* 左：局名 */
.header-brand {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-size: calc(11px * var(--ui-font-scale));
  letter-spacing: 0.34em;
  color: var(--ui-muted);
  white-space: nowrap;
  max-width: 26vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 中：只读状态 */
.header-status {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}

.header-sep {
  flex: 0 0 auto;
  width: 1px;
  height: 10px;
  background: var(--ui-line-soft);
}

/* 信息项 */
.header-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: calc(11px * var(--ui-font-scale));
  letter-spacing: 0.18em;
  color: var(--ui-text);
  transition: color var(--transition-fast);
}

.header-item i {
  width: 13px;
  min-width: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1;
  color: var(--ui-accent);
  opacity: 0.72;
  transition: opacity var(--transition-fast);
}

.header-item:hover {
  color: var(--ui-accent);
}

.header-item:hover i {
  opacity: 1;
}

/* 右：功能区 */
.header-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 货币：直角细线小牌 */
.header-currency {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--ui-line-soft);
  background: transparent;
  border-radius: 0;
  font-family: var(--font-mono);
  font-size: calc(11px * var(--ui-font-scale));
  letter-spacing: 0.14em;
  color: var(--ui-muted);
  white-space: nowrap;
}

.header-currency .stat-label {
  font-weight: 400;
}

.header-currency .stat-value {
  color: var(--ui-text);
}

/* 图标按钮：32×26 直角细线 */
.header-btn {
  width: 32px;
  height: 26px;
  padding: 0;
  min-width: 32px;
  border-radius: 0;
  background: transparent;
  border: 1px solid var(--ui-line-soft);
  color: var(--ui-muted);
  box-shadow: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.header-btn:hover {
  color: var(--ui-accent);
  border-color: var(--ui-accent);
}

.header-btn i {
  font-size: calc(13px * var(--ui-font-scale));
}

/* 三点菜单容器 */
.header-action-menu {
  position: relative;
}

.header-menu-trigger i {
  font-size: calc(15px * var(--ui-font-scale));
}

.header-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  padding: 4px;
  border-radius: 0;
  border: 1px solid var(--ui-line-soft);
  background: var(--ui-panel);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  box-shadow: none;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 20;
}

.header-dropdown-item {
  width: 32px;
  height: 26px;
  min-width: 32px;
}

/* ===== 天气图标颜色 + 微动画（与主题无关，保留原样） ===== */
.weather-item i {
  transform: translateY(0.5px);
  transition:
    transform var(--transition-normal),
    color var(--transition-normal);
}

.weather-item:hover i {
  transform: translateY(0.5px) scale(1.2);
}

.weather-item i.ti-sun {
  color: hsl(38, 92%, 50%);
  animation: float 3s ease-in-out infinite;
}

.weather-item i.ti-moon {
  color: hsl(265, 60%, 72%);
}

.weather-item i.ti-star {
  color: hsl(45, 93%, 55%);
}

.weather-item i.ti-snowflake {
  color: hsl(217, 92%, 68%);
  animation: float 2.5s ease-in-out infinite;
}

.weather-item i.ti-cloud-bolt {
  color: hsl(265, 83%, 57%);
}

.weather-item i.ti-cloud-rain,
.weather-item i.ti-cloud-storm,
.weather-item i.ti-cloud-rain {
  color: hsl(220, 10%, 46%);
}

.weather-item i.ti-rainbow {
  color: hsl(330, 80%, 60%);
}

.weather-item i.ti-temperature-sun {
  color: hsl(0, 84%, 60%);
}

.weather-item i.ti-temperature-snow,
.weather-item i.ti-snowflake {
  color: hsl(199, 89%, 60%);
}

/* ===== 响应式 ===== */
@media (max-width: 1023px) {
  .header-bar {
    padding: 0 12px;
    gap: 10px;
  }

  .header-status {
    gap: 8px;
  }

  .header-brand {
    max-width: 20vw;
    letter-spacing: 0.24em;
  }
}

@media (max-width: 768px) {
  .header-bar {
    padding: 0 8px;
    gap: 8px;
  }

  .header-status {
    gap: 6px;
    justify-content: flex-start;
  }

  .header-item {
    gap: 4px;
    font-size: calc(10px * var(--ui-font-scale));
    letter-spacing: 0.12em;
  }

  .header-item i {
    width: 12px;
    min-width: 12px;
    font-size: calc(10px * var(--ui-font-scale));
  }

  .header-brand {
    max-width: 16vw;
  }

  .header-currency .stat-label {
    display: none;
  }
}

@media (max-width: 480px) {
  .header-brand {
    display: none;
  }

  .header-item i {
    width: 11px;
    min-width: 11px;
  }

  .header-sep {
    display: none;
  }
}
</style>
