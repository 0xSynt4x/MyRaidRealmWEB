<template>
  <div class="header-bar">
    <!-- 信息项组 -->
    <div class="header-info-group">
      <span class="header-item era-name">
        <i class="fa-solid fa-calendar-alt"></i>
        {{ 纪元名称 }}
      </span>
      <span class="header-divider">•</span>
      <span class="header-item">
        <i class="fa-regular fa-clock"></i>
        {{ 当前时间 }}
      </span>
      <span class="header-divider">•</span>
      <span class="header-item weather-item">
        <i :class="天气图标"></i>
        {{ 当前天气 }}
      </span>
      <span class="header-divider">•</span>
      <span class="header-item">
        <i class="fa-solid fa-location-dot"></i>
        {{ 当前地点 }}
      </span>
    </div>

    <!-- 右侧功能区：使用 tailwind 工具类 -->
    <div ref="headerActionsRef" class="header-actions shrink-0 gap-2">
      <!-- 货币显示：复用 stat-item 样式 -->
      <span class="stat-item header-currency">
        <i class="fa-solid fa-coins" style="color: var(--accent-success)"></i>
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
          <i class="fa-solid fa-ellipsis"></i>
        </button>

        <div v-if="isActionMenuOpen" class="header-dropdown" role="menu" :aria-label="t('header.topActionMenu')">
          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isRefreshing"
            :title="isRefreshing ? t('header.refreshing') : t('header.refreshVariables')"
            @click="runMenuAction(handleRefreshApi)"
          >
            <i class="fa-solid fa-wand-magic-sparkles" :class="{ 'fa-spin': isRefreshing }"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isArchiving"
            :title="isArchiving ? t('header.archiving') : t('header.archiveAndDownload')"
            @click="runMenuAction(handleArchive)"
          >
            <i :class="isArchiving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :disabled="isResetting"
            :title="isResetting ? t('header.resettingGame') : t('header.resetGame')"
            @click="runMenuAction(handleResetGame)"
          >
            <i :class="isResetting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-rotate-left'"></i>
          </button>

          <button
            class="icon-btn primary header-btn header-dropdown-item"
            role="menuitem"
            :title="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
            @click="runMenuAction(toggleFullscreen)"
          >
            <i :class="isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
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
import { clearSetupCompleted } from '../../utils/setupProgress';
import { saveCurrentArchive } from '../../utils/archive';

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

// 天气图标映射表
const weatherIconMap: Record<string, string> = {
  // ===== 晴天系列 =====
  晴: 'fa-solid fa-sun',
  晴天: 'fa-solid fa-sun',
  晴朗: 'fa-solid fa-sun',
  艳阳: 'fa-solid fa-sun',
  烈日: 'fa-solid fa-sun',
  '晴（夜）': 'fa-solid fa-moon',
  晴夜: 'fa-solid fa-moon',
  月明: 'fa-solid fa-moon',
  星空: 'fa-solid fa-star',

  // ===== 多云系列 =====
  多云: 'fa-solid fa-cloud-sun',
  少云: 'fa-solid fa-cloud-sun',
  晴间多云: 'fa-solid fa-cloud-sun',
  '多云（夜）': 'fa-solid fa-cloud-moon',
  多云夜: 'fa-solid fa-cloud-moon',

  // ===== 阴天系列 =====
  阴: 'fa-solid fa-cloud',
  阴天: 'fa-solid fa-cloud',
  密云: 'fa-solid fa-cloud',
  乌云: 'fa-solid fa-cloud',
  阴沉: 'fa-solid fa-cloud',

  // ===== 雨天系列 =====
  小雨: 'fa-solid fa-cloud-rain',
  细雨: 'fa-solid fa-cloud-rain',
  毛毛雨: 'fa-solid fa-cloud-rain',
  阵雨: 'fa-solid fa-cloud-rain',
  中雨: 'fa-solid fa-cloud-showers-heavy',
  大雨: 'fa-solid fa-cloud-showers-water',
  暴雨: 'fa-solid fa-cloud-showers-water',
  倾盆大雨: 'fa-solid fa-cloud-showers-water',
  雷雨: 'fa-solid fa-cloud-bolt',
  雷暴: 'fa-solid fa-cloud-bolt',
  雷阵雨: 'fa-solid fa-cloud-bolt',
  冰雹: 'fa-solid fa-cloud-meatball',

  // ===== 雪天系列 =====
  雪: 'fa-solid fa-snowflake',
  小雪: 'fa-solid fa-snowflake',
  中雪: 'fa-solid fa-snowflake',
  大雪: 'fa-solid fa-snowflake',
  暴雪: 'fa-solid fa-snowflake',
  雨夹雪: 'fa-solid fa-cloud-rain',
  冻雨: 'fa-solid fa-icicles',

  // ===== 雾霾系列 =====
  雾: 'fa-solid fa-smog',
  薄雾: 'fa-solid fa-smog',
  浓雾: 'fa-solid fa-smog',
  大雾: 'fa-solid fa-smog',
  霾: 'fa-solid fa-smog',
  雾霾: 'fa-solid fa-smog',

  // ===== 风沙系列 =====
  风: 'fa-solid fa-wind',
  大风: 'fa-solid fa-wind',
  狂风: 'fa-solid fa-wind',
  台风: 'fa-solid fa-hurricane',
  飓风: 'fa-solid fa-hurricane',
  龙卷风: 'fa-solid fa-tornado',
  沙尘: 'fa-solid fa-wind',
  沙尘暴: 'fa-solid fa-wind',
  扬沙: 'fa-solid fa-wind',

  // ===== 特殊天气 =====
  彩虹: 'fa-solid fa-rainbow',
  极光: 'fa-solid fa-wand-magic-sparkles',
  流星: 'fa-solid fa-meteor',
  日食: 'fa-solid fa-circle',
  月食: 'fa-solid fa-moon',

  // ===== 温度相关 =====
  酷热: 'fa-solid fa-temperature-high',
  炎热: 'fa-solid fa-temperature-high',
  温暖: 'fa-solid fa-temperature-half',
  凉爽: 'fa-solid fa-temperature-half',
  寒冷: 'fa-solid fa-temperature-low',
  严寒: 'fa-solid fa-temperature-low',
  冰冻: 'fa-solid fa-temperature-arrow-down',
};

// 计算属性
const 纪元名称 = computed(() => data.value.世界?.时间系统?.纪元名称 || t('header.defaultEraName'));
const 当前时间 = computed(() => data.value.世界?.时间系统?.当前时间 || '--');
const 当前天气 = computed(() => data.value.世界?.时间系统?.当前天气 || t('header.defaultWeather'));
const 当前地点 = computed(() => data.value.世界?.空间定位?.当前位置 || '--');
const 主货币名称 = computed(() => data.value.玩家?.货币资源?.主货币?.名称 || t('header.defaultCurrencyName'));
const 主货币数量 = computed(() => Math.floor(data.value.玩家?.货币资源?.主货币?.数量 || 0));

// 天气图标计算
const 天气图标 = computed(() => {
  const weather = 当前天气.value;
  // 精确匹配
  if (weatherIconMap[weather]) {
    return weatherIconMap[weather];
  }
  // 模糊匹配（包含关键词）
  for (const [key, icon] of Object.entries(weatherIconMap)) {
    if (weather.includes(key)) {
      return icon;
    }
  }
  // 默认图标
  return 'fa-solid fa-cloud-sun';
});

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
    toastr.success(t('header.archiveSuccess'));
  } catch (error) {
    console.error('[HeaderBar] 存档失败:', error);
    toastr.error(t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }));
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
    clearSetupCompleted();
    setupStore.reset();
    messagesStore.clearMessages();
    emit('reset-game');

    toastr.success(t('header.resetGameSuccess'));
  } catch (error) {
    console.error('[HeaderBar] 重置游戏失败:', error);
    toastr.error(t('header.resetGameFailed', { error: error instanceof Error ? error.message : String(error) }));
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
    toastr.error(t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }));
  } finally {
    isRefreshing.value = false;
  }
}

// toggleFullscreen 和 isFullscreen 已从 useFullscreen composable 导入
</script>

<style scoped>
/* ===== HeaderBar - 玻璃拟态顶栏 ===== */

.header-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  min-height: var(--header-height, 40px);
  padding: 8px 12px;
  gap: 8px;
  background: var(--card-bg-strong);
  background-image: var(--card-sheen);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  font-size: var(--text-sm);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  position: relative;
  z-index: 10;
}

/* 渐变底边装饰线 */
.header-bar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-primary);
  opacity: 0.6;
}

.header-bar::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 46%);
}

/* 信息项组 */
.header-info-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  flex: 1;
  min-width: 200px;
}

/* 右侧功能区 */
.header-actions {
  display: flex;
  align-items: center;
}

/* 信息项 */
.header-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
  line-height: 1;
  white-space: nowrap;
  color: var(--text-primary);
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.header-item:hover {
  transform: translateY(-0.5px);
}

.header-item i {
  width: 14px;
  min-width: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  color: var(--text-secondary);
  transform: translateY(0.5px);
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.header-item:hover i {
  color: var(--accent-primary);
  transform: scale(1.15);
}

.header-item.era-name {
  font-weight: 600;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-item.era-name i {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 分隔符 */
.header-divider {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--border-light);
  margin: 0 3px;
  line-height: 1;
  user-select: none;
  opacity: 0.5;
}

/* 货币显示 - 发光效果 */
.header-currency {
  padding: 5px 10px;
  background: color-mix(in srgb, var(--accent-success) 8%, var(--control-bg));
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-success) 18%, var(--control-border));
  box-shadow: var(--control-shadow);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.header-currency::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 54%);
  pointer-events: none;
}

.header-currency:hover {
  background: color-mix(in srgb, var(--accent-success) 12%, var(--control-bg));
  box-shadow: 0 8px 18px rgba(var(--accent-success-rgb), 0.12);
}

.header-currency .stat-label {
  font-weight: 400;
}

/* 按钮 - 玻璃拟态 + 悬停发光 */
.header-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  min-width: 32px;
  border-radius: var(--radius-md);
  background: var(--control-bg-elevated);
  border: 1px solid var(--control-border);
  color: var(--accent-primary);
  box-shadow: var(--control-shadow);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.header-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.header-btn:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  box-shadow: 0 12px 26px rgba(var(--accent-primary-rgb), 0.14);
  transform: translateY(-1px);
}

.header-btn:hover::before {
  opacity: 0.12;
}

.header-btn i {
  font-size: 14px;
  position: relative;
  z-index: 1;
}

/* 三点菜单容器 */
.header-action-menu {
  position: relative;
}

.header-menu-trigger i {
  font-size: 16px;
}

.header-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  padding: 6px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  background: var(--card-bg-strong);
  background-image: var(--card-sheen);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 20;
}

.header-dropdown-item {
  width: 32px;
  height: 32px;
  min-width: 32px;
}

/* ===== 天气图标颜色 + 微动画 ===== */
.weather-item i {
  transform: translateY(0.5px);
  transition:
    transform var(--transition-normal),
    color var(--transition-normal);
}

.weather-item:hover i {
  transform: translateY(0.5px) scale(1.2);
}

.weather-item i.fa-sun {
  color: hsl(38, 92%, 50%);
  animation: float 3s ease-in-out infinite;
}

.weather-item i.fa-moon {
  color: hsl(265, 60%, 72%);
}

.weather-item i.fa-star {
  color: hsl(45, 93%, 55%);
}

.weather-item i.fa-snowflake {
  color: hsl(217, 92%, 68%);
  animation: float 2.5s ease-in-out infinite;
}

.weather-item i.fa-cloud-bolt {
  color: hsl(265, 83%, 57%);
}

.weather-item i.fa-cloud-rain,
.weather-item i.fa-cloud-showers-heavy,
.weather-item i.fa-cloud-showers-water {
  color: hsl(220, 10%, 46%);
}

.weather-item i.fa-rainbow {
  color: hsl(330, 80%, 60%);
}

.weather-item i.fa-temperature-high {
  color: hsl(0, 84%, 60%);
}

.weather-item i.fa-temperature-low,
.weather-item i.fa-icicles {
  color: hsl(199, 89%, 60%);
}

/* ===== 响应式 ===== */
@media (max-width: 1023px) {
  .header-bar {
    padding: 6px 10px;
  }

  .header-info-group {
    gap: 2px;
  }

  .header-item,
  .header-currency {
    font-size: var(--text-xs);
  }

  .header-item {
    gap: 4px;
    min-height: 18px;
  }

  .header-item i {
    width: 13px;
    min-width: 13px;
    font-size: 11px;
  }

  .header-divider {
    margin: 0 2px;
  }

  .header-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }

  .header-btn i {
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .header-bar {
    padding: 6px 8px;
  }

  .header-info-group {
    gap: 1px;
  }

  .header-item {
    gap: 3px;
    min-height: 17px;
  }

  .header-item i {
    width: 12px;
    min-width: 12px;
    font-size: 10px;
  }

  .header-divider {
    margin: 0 1px;
  }

  .header-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .header-btn i {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .header-info-group {
    gap: 1px;
    min-width: 150px;
  }

  .header-item {
    gap: 3px;
  }

  .header-item i {
    width: 11px;
    min-width: 11px;
    font-size: 10px;
  }

  .header-divider {
    margin: 0;
  }
}
</style>
