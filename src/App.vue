<template>
  <div
    class="app-container"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="fullscreenStyles"
    :data-theme="settingsStore.theme"
    :data-font="settingsStore.fontFamily"
    :data-size="settingsStore.fontSize"
    :data-line="settingsStore.lineHeight"
  >
    <!-- 设置向导 - 仅在第0层显示 -->
    <template v-if="showWizard">
      <div class="wizard-container">
        <SetupWizard @complete="handleWizardComplete" />
        <OverlayPanel />
      </div>
    </template>

    <!-- 主界面 - 三栏布局 -->
    <template v-else>
      <MainLayout>
        <template #header>
          <HeaderBar @reset-game="handleResetGame" />
        </template>
        <template #left>
          <LeftSidebar />
        </template>
        <template #center>
          <!-- 重置游戏：顶栏隐藏后，入口在场景横幅的三点菜单里，事件从这里传上来 -->
          <CenterContent @reset-game="handleResetGame" />
        </template>
        <template #right>
          <RightPanel />
        </template>
        <template #mobile-nav>
          <MobileBottomNav />
        </template>
        <template #footer>
          <ActionBar />
        </template>
      </MainLayout>
    </template>

    <!-- 全局确认对话框 -->
    <ConfirmDialog />

    <!--
      页面内通知的挂载点。
      原先它挂在游戏正文区（ContentText）里，导致开局向导那几页弹不出提示
      —— 向导是另一个分支，根本不渲染正文区。挂到根节点后，向导和游戏内都能弹。
      定位仍是相对 .app-container，所以视觉位置不变。
    -->
    <NotificationContainer />

    <!-- 模态框挂载点 - 绝对定位覆盖整个 app-container -->
    <div id="modal-container" class="modal-mount"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import ActionBar from './components/common/ActionBar.vue';
import ConfirmDialog from './components/common/ConfirmDialog.vue';
import NotificationContainer from './components/common/NotificationContainer.vue';
import CenterContent from './components/layout/CenterContent.vue';
import HeaderBar from './components/layout/HeaderBar.vue';
import LeftSidebar from './components/layout/LeftSidebar.vue';
import MainLayout from './components/layout/MainLayout.vue';
import MobileBottomNav from './components/layout/MobileBottomNav.vue';
import OverlayPanel from './components/layout/OverlayPanel.vue';
import RightPanel from './components/layout/RightPanel.vue';
import SetupWizard from './components/setup/SetupWizard.vue';
import { useFullscreen } from './composables/useFullscreen';
import { useSetupStore } from './stores/setup';
import { useSettingsStore } from './stores/settings';
import { getStandaloneArchiveRestoredEventName, type StandaloneArchiveRestoreOutcome } from './utils/archive';
import { getDesktopExtraHeight, getLayoutViewportWidth, isMobileLayoutWidth } from './utils/layoutBreakpoints';
import { ensureStandaloneRuntimeBootstrapFromStores } from './utils/standaloneRuntime';
import { loadStandaloneStatData } from './utils/standaloneStatData';

const settingsStore = useSettingsStore();
const setupStore = useSetupStore();

// 本会话内是否已经进入游戏。
// 打开页面一律先给配置界面首页，不做「该进游戏还是该进配置界面」的自动判定：
// 想接着上次玩，自己点「继续游戏」挑快照。
const inGame = ref(false);
const forceShowWizard = ref(false);
const STANDALONE_ARCHIVE_RESTORED_EVENT = getStandaloneArchiveRestoredEventName();

function handleStandaloneArchiveRestored(event: Event) {
  const customEvent = event as CustomEvent<StandaloneArchiveRestoreOutcome>;
  const outcome = customEvent.detail;
  if (!outcome) {
    return;
  }

  inGame.value = outcome.resumedImmediately;
  forceShowWizard.value = outcome.requiresSettingsResume;
}

// 判断是否显示配置界面
const showWizard = computed(() => forceShowWizard.value || !inGame.value);

// 处理配置完成事件
const handleWizardComplete = () => {
  forceShowWizard.value = false;
  inGame.value = true;
  ensureStandaloneRuntimeBootstrapFromStores(loadStandaloneStatData());
};

const handleResetGame = () => {
  forceShowWizard.value = true;
  inGame.value = false;
};

watch(
  // 这三样都会影响送进提示词的内容，任一变化就重建会话底稿。
  // 🔴 手填的世界书条目必须在这里——它挂在会话上，不监听就不会建立会话，条目只会留在内存里。
  () => [setupStore.selectedPreset, settingsStore.standaloneLocalContent, setupStore.customWorldbookEntries],
  () => {
    ensureStandaloneRuntimeBootstrapFromStores(loadStandaloneStatData());
  },
  { deep: true },
);

// 全屏状态和视口高度
const { isFullscreen, viewportHeight } = useFullscreen();

function getBaseAdaptiveHeight(previousExtraHeight: number) {
  const iframeEl = window.frameElement as HTMLElement | null;
  const iframeHeight = iframeEl?.getBoundingClientRect().height ?? 0;
  const documentHeight = document.documentElement?.clientHeight ?? 0;
  const currentViewportHeight = Math.floor(window.innerHeight);
  const baseHeightFromIframe = iframeHeight > 0 ? Math.floor(iframeHeight) - previousExtraHeight : 0;
  const baseHeightFromDocument = documentHeight > 0 ? Math.floor(documentHeight) - previousExtraHeight : 0;
  const baseHeightFromViewport = currentViewportHeight - previousExtraHeight;

  return Math.max(
    baseHeightFromIframe > 0
      ? baseHeightFromIframe
      : baseHeightFromDocument > 0
        ? baseHeightFromDocument
        : baseHeightFromViewport,
    0,
  );
}

function getAdaptiveHeightSnapshot() {
  const iframeEl = window.frameElement as HTMLElement | null;
  const width = getLayoutViewportWidth();
  const previousExtraHeight = Number(iframeEl?.dataset.desktopExtraHeight ?? 0);

  if (isMobileLayoutWidth(width)) {
    return {
      width,
      extraHeight: 0,
      targetHeight: Math.max(Math.floor(window.innerHeight), document.documentElement?.clientHeight ?? 0, 0),
      previousExtraHeight,
    };
  }

  const extraHeight = getDesktopExtraHeight(width);
  const baseHeight = getBaseAdaptiveHeight(previousExtraHeight);

  return {
    width,
    extraHeight,
    targetHeight: baseHeight + extraHeight,
    previousExtraHeight,
  };
}

// 全屏时使用 JS 计算的高度，避免移动端 100vh 问题
const initialAdaptiveSnapshot = getAdaptiveHeightSnapshot();
const adaptiveHeight = ref(initialAdaptiveSnapshot.targetHeight);
let hostFrameResizeLocked = false;

function releaseHostFrameResizeLock() {
  requestAnimationFrame(() => {
    hostFrameResizeLocked = false;
  });
}

function syncHostFrameHeight(targetHeight: number, extraHeight: number) {
  const iframeEl = window.frameElement as HTMLElement | null;
  if (!iframeEl) {
    return;
  }

  const currentExtraHeight = Number(iframeEl.dataset.desktopExtraHeight ?? 0);
  const currentHeight = iframeEl.style.height;
  const nextHeight = `${targetHeight}px`;

  if (currentExtraHeight === extraHeight && currentHeight === nextHeight) {
    return;
  }

  hostFrameResizeLocked = true;
  iframeEl.dataset.desktopExtraHeight = String(extraHeight);
  iframeEl.style.height = nextHeight;
  iframeEl.style.minHeight = nextHeight;
  iframeEl.style.maxHeight = 'none';
  releaseHostFrameResizeLock();
}

function resetHostFrameHeight() {
  const iframeEl = window.frameElement as HTMLElement | null;
  if (!iframeEl) {
    return;
  }

  const hadManualHeight = Boolean(
    iframeEl.dataset.desktopExtraHeight || iframeEl.style.height || iframeEl.style.minHeight,
  );
  if (!hadManualHeight) {
    return;
  }

  hostFrameResizeLocked = true;
  delete iframeEl.dataset.desktopExtraHeight;
  iframeEl.style.height = '';
  iframeEl.style.minHeight = '';
  iframeEl.style.maxHeight = '';
  releaseHostFrameResizeLock();
}

function updateAdaptiveHeight() {
  if (hostFrameResizeLocked) {
    return;
  }

  const { extraHeight, targetHeight, previousExtraHeight } = getAdaptiveHeightSnapshot();

  if (isFullscreen.value) {
    adaptiveHeight.value = 0;
    if (previousExtraHeight > 0) {
      resetHostFrameHeight();
    }
    return;
  }

  adaptiveHeight.value = targetHeight;

  if (extraHeight > 0) {
    syncHostFrameHeight(targetHeight, extraHeight);
  } else if (previousExtraHeight > 0) {
    resetHostFrameHeight();
  }
}

let parentWindow: Window | null = null;

onMounted(() => {
  updateAdaptiveHeight();
  window.addEventListener('resize', updateAdaptiveHeight);
  window.addEventListener(STANDALONE_ARCHIVE_RESTORED_EVENT, handleStandaloneArchiveRestored as EventListener);

  try {
    if (window.parent && window.parent !== window) {
      parentWindow = window.parent;
      parentWindow.addEventListener('resize', updateAdaptiveHeight);
    }
  } catch {
    parentWindow = null;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateAdaptiveHeight);
  window.removeEventListener(STANDALONE_ARCHIVE_RESTORED_EVENT, handleStandaloneArchiveRestored as EventListener);
  parentWindow?.removeEventListener('resize', updateAdaptiveHeight);
  resetHostFrameHeight();
  parentWindow = null;
});

watch(isFullscreen, () => {
  updateAdaptiveHeight();
});

const fullscreenStyles = computed(() => {
  if (isFullscreen.value && viewportHeight.value > 0) {
    return {
      height: `${viewportHeight.value}px`,
      minHeight: `${viewportHeight.value}px`,
    };
  }

  if (adaptiveHeight.value > 0) {
    return {
      height: `${adaptiveHeight.value}px`,
      minHeight: `${adaptiveHeight.value}px`,
      maxHeight: `${adaptiveHeight.value}px`,
    };
  }

  return {};
});
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  max-height: none;
  background: var(--bg-primary);
  font-family: var(--font-base);
  font-size: var(--text-sm);
  color: var(--text-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

@media (max-width: 767px) {
  .app-container {
    height: 100dvh;
    min-height: 100dvh;
  }
}

/* 全屏模式 - 填满整个屏幕 */
.app-container.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw !important;
  /* height 通过 inline style 动态设置，避免移动端 100vh 问题 */
  z-index: 9999;
}

/* 浏览器窗口全屏模式 - 桌面设备使用 CSS 铺满浏览器窗口 */
.fullscreen-browser-window {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

/* 向导容器 - 全屏显示 */
.wizard-container {
  width: 100%;
  flex: 1;
  overflow: hidden;
}

.standalone-complete-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}

.standalone-complete-card {
  width: min(620px, 100%);
  padding: 32px 28px;
  border-radius: 24px;
  border: 1px solid var(--card-border);
  background: color-mix(in srgb, var(--card-bg-strong) 88%, var(--bg-primary));
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.standalone-complete-badge {
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: calc(12px * var(--ui-font-scale));
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 12%, var(--card-bg-strong));
  border: 1px solid color-mix(in srgb, var(--accent-primary) 24%, var(--card-border));
}

.standalone-complete-card h2 {
  margin: 0;
  font-size: calc(28px * var(--ui-font-scale));
  line-height: 1.25;
  color: var(--text-primary);
}

.standalone-complete-card p {
  margin: 0;
  font-size: calc(15px * var(--ui-font-scale));
  line-height: 1.7;
  color: var(--text-secondary);
}

.standalone-complete-btn {
  align-self: flex-start;
  margin-top: 8px;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary) 32%, var(--card-border));
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--control-bg));
  color: var(--accent-primary);
  font-size: calc(14px * var(--ui-font-scale));
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--motion-fast),
    box-shadow var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast);
}

.standalone-complete-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
  border-color: color-mix(in srgb, var(--accent-primary) 48%, var(--card-border));
}

/* 响应式：平板端 */
@media (max-width: 1023px) {
  .app-container {
    min-height: min(100dvh, 100%);
  }
}

/* 响应式：手机端 */
@media (max-width: 768px) {
  .app-container {
    height: 100%;
    min-height: min(100dvh, 100%);
  }
}

/* 响应式：小屏手机 */
@media (max-width: 480px) {
  .app-container {
    height: 100%;
    min-height: min(100dvh, 100%);
  }
}

/* 模态框挂载点 - 覆盖整个 app-container */
.modal-mount {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.modal-mount > :deep(*) {
  pointer-events: auto;
}
</style>
