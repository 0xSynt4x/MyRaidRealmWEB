<template>
  <Transition name="slide-overlay">
    <div v-if="overlayPanel" class="overlay-panel">
      <!-- 背景遮罩 -->
      <div class="overlay-backdrop" @click="closePanel"></div>
      <!-- 面板内容 -->
      <div class="overlay-content">
        <button
          class="close-btn"
          :title="t('overlay.closePanel')"
          :aria-label="t('overlay.closePanel')"
          @click="closePanel"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="panel-header">
          <h3 class="panel-title">{{ panelTitle }}</h3>
        </div>
        <div class="panel-body">
          <KeepAlive>
            <Suspense>
              <!-- 主要内容 -->
              <component :is="currentPanelComponent" :key="overlayPanel" />
              <!-- Loading 状态 -->
              <template #fallback>
                <div class="loading-state">
                  <div class="loading-spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                  <p class="loading-text">{{ t('overlay.loading') }}</p>
                </div>
              </template>
            </Suspense>
          </KeepAlive>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue';
import { useI18n } from '../../i18n';
import { useLayoutStore, type TabType } from '../../stores/layout';

const layoutStore = useLayoutStore();
const overlayPanel = computed(() => layoutStore.overlayPanel);
const { t } = useI18n();

// 异步加载面板组件以优化性能，添加错误处理
const PlayerProfile = defineAsyncComponent({
  loader: () => import('../panels/PlayerProfile.vue'),
  delay: 200, // 200ms 后才显示 loading
  timeout: 10000, // 10秒超时
  errorComponent: {
    template: `
      <div class="error-state">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>${t('overlay.loadFailedRetry')}</p>
      </div>
    `,
  },
});

const FactionPanel = defineAsyncComponent({
  loader: () => import('../panels/FactionPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const BusinessPanel = defineAsyncComponent({
  loader: () => import('../panels/BusinessPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const NotebookPanel = defineAsyncComponent({
  loader: () => import('../panels/NotebookPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const ContentCenterPanel = defineAsyncComponent({
  loader: () => import('../panels/ContentCenterPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const CharacterPanel = defineAsyncComponent({
  loader: () => import('../panels/CharacterPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const SettingsPanel = defineAsyncComponent({
  loader: () => import('../panels/SettingsPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const ShopPanel = defineAsyncComponent({
  loader: () => import('../panels/ShopPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const LotteryPanel = defineAsyncComponent({
  loader: () => import('../panels/LotteryPanel.vue'),
  delay: 200,
  timeout: 10000,
});

const DiceGamePanel = defineAsyncComponent({
  loader: () => import('../panels/DiceGamePanel.vue'),
  delay: 200,
  timeout: 10000,
});

const DonatePanel = defineAsyncComponent({
  loader: () => import('../panels/DonatePanel.vue'),
  delay: 200,
  timeout: 10000,
});

// 占位组件
const PlaceholderPanel = {
  template: `
    <div class="placeholder-panel">
      <i class="fa-solid fa-hammer"></i>
      <p>${t('overlay.inDevelopment')}</p>
    </div>
  `,
};

// 面板标题映射
const panelTitles: Record<TabType, string> = {
  profile: 'nav.profile',
  faction: 'nav.faction',
  business: 'nav.business',
  notebook: 'nav.notebook',
  content: 'nav.contentCenter',
  characters: 'nav.characters',
  settings: 'nav.settings',
  shop: 'nav.shop',
  lottery: 'nav.lottery',
  dicegame: 'nav.dicegame',
  donate: 'nav.donate',
};

// 当前面板标题
const panelTitle = computed(() => {
  return overlayPanel.value ? t(panelTitles[overlayPanel.value]) : '';
});

// 当前面板组件
const currentPanelComponent = computed<Component>(() => {
  const components: Record<TabType, Component> = {
    profile: PlayerProfile,
    faction: FactionPanel,
    business: BusinessPanel,
    notebook: NotebookPanel,
    content: ContentCenterPanel,
    characters: CharacterPanel,
    settings: SettingsPanel,
    shop: ShopPanel,
    lottery: LotteryPanel,
    dicegame: DiceGamePanel,
    donate: DonatePanel,
  };
  return overlayPanel.value ? components[overlayPanel.value] : PlaceholderPanel;
});

// 关闭面板（保护逻辑由 layout store 统一处理）
function closePanel() {
  layoutStore.closeOverlayPanel();
}
</script>

<style scoped>
.overlay-panel {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  overflow: hidden;
}

.overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px) saturate(1.2);
  -webkit-backdrop-filter: blur(4px) saturate(1.2);
  z-index: 1;
}

.overlay-content {
  position: relative;
  z-index: 2;
  width: clamp(320px, 86%, min(760px, 100%));
  max-width: var(--overlay-panel-max, 760px);
  height: 100%;
  max-height: 100%;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  box-shadow:
    4px 0 30px rgba(0, 0, 0, 0.2),
    inset -1px 0 0 var(--glass-border);
  border-right: 1px solid var(--glass-border);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal) var(--ease-out-expo);
  z-index: 10;
}

.close-btn:hover {
  background: var(--accent-danger);
  border-color: var(--accent-danger);
  color: white;
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 0 12px rgba(var(--accent-danger-rgb, 239, 68, 68), 0.4);
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border);
  background: transparent;
  position: relative;
}

.panel-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

/* 占位面板样式 */
.placeholder-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: var(--text-secondary);
  text-align: center;
  gap: 16px;
}

.placeholder-panel i {
  font-size: 48px;
  opacity: 0.4;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.placeholder-panel p {
  font-size: var(--text-base);
  margin: 0;
}

/* Loading 状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-spinner i {
  font-size: 40px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-text {
  font-size: var(--text-base);
  margin: 0;
  letter-spacing: 2px;
}

/* Error 状态样式 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: var(--accent-danger);
  gap: 16px;
}

.error-state i {
  font-size: 48px;
  opacity: 0.8;
  filter: drop-shadow(0 0 8px rgba(var(--accent-danger-rgb, 239, 68, 68), 0.3));
}

.error-state p {
  font-size: var(--text-base);
  margin: 0;
  color: var(--text-secondary);
}

/* 滑动动画 - 弹性效果 */
.slide-overlay-enter-active {
  transition: all 400ms var(--ease-out-expo);
}

.slide-overlay-leave-active {
  transition: all 280ms ease-in;
}

.slide-overlay-enter-active .overlay-content {
  transition: transform 450ms var(--ease-out-back);
}

.slide-overlay-leave-active .overlay-content {
  transition: transform 280ms ease-in;
}

.slide-overlay-enter-active .overlay-backdrop {
  transition: opacity 350ms ease-out;
}

.slide-overlay-leave-active .overlay-backdrop {
  transition: opacity 250ms ease-in;
}

.slide-overlay-enter-from .overlay-content {
  transform: translateX(-105%);
}

.slide-overlay-leave-to .overlay-content {
  transform: translateX(-100%);
}

.slide-overlay-enter-from .overlay-backdrop,
.slide-overlay-leave-to .overlay-backdrop {
  opacity: 0;
}

/* 滚动条样式 */
.panel-body::-webkit-scrollbar {
  width: 5px;
}

.panel-body::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.3);
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--accent-primary-rgb), 0.5);
}

/* 响应式：手机端 */
@media (max-width: 768px) {
  .overlay-content {
    width: min(100%, calc(100% - 12px));
    max-width: none;
    border-radius: 0 12px 12px 0;
  }

  .panel-header {
    padding: 12px 16px;
    padding-right: 44px;
  }

  .panel-title {
    font-size: var(--text-base);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-overlay-enter-active,
  .slide-overlay-leave-active,
  .slide-overlay-enter-active .overlay-content,
  .slide-overlay-leave-active .overlay-content,
  .slide-overlay-enter-active .overlay-backdrop,
  .slide-overlay-leave-active .overlay-backdrop {
    transition-duration: 0.01ms !important;
  }
  .close-btn:hover {
    transform: none;
  }
}
</style>
