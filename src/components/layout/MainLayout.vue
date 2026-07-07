<template>
  <div class="main-layout" :class="layoutClasses">
    <!-- 顶部栏 -->
    <header class="layout-header">
      <slot name="header" />
    </header>

    <!-- 左侧导航（移动端改到底部 Tab，不再常驻） -->
    <aside v-if="!isMobileLayout" class="layout-left">
      <slot name="left" />
    </aside>

    <!-- 中间内容区域 -->
    <main class="layout-center">
      <slot name="center" />

      <!-- Overlay 面板 -->
      <OverlayPanel />

      <!-- 桌面/平板：右侧面板切换按钮 -->
      <CollapseButton
        v-if="!isMobileLayout"
        :direction="rightCollapsed ? 'left' : 'right'"
        position="right"
        @click="rightCollapsed ? layoutStore.expandRight() : layoutStore.collapseRight()"
      />

      <!-- 手机端：右侧抽屉入口按钮 -->
      <button
        v-else
        class="mobile-right-toggle"
        :title="rightCollapsed ? '展开右侧信息面板' : '收起右侧信息面板'"
        @click="rightCollapsed ? layoutStore.expandRight() : layoutStore.collapseRight()"
      >
        <i :class="rightCollapsed ? 'fa-solid fa-chevron-left' : 'fa-solid fa-chevron-right'"></i>
      </button>
    </main>

    <!-- 手机端抽屉遮罩 -->
    <Transition name="drawer-fade">
      <div
        v-if="isMobileLayout && !rightCollapsed"
        class="right-drawer-backdrop"
        @click="layoutStore.collapseRight()"
      ></div>
    </Transition>

    <!-- 右侧面板 -->
    <aside
      class="layout-right"
      :class="{
        collapsed: rightCollapsed,
        'mobile-drawer': isMobileLayout,
        'mobile-open': isMobileLayout && !rightCollapsed,
      }"
    >
      <slot name="right" />
    </aside>

    <!-- 底部行动栏 -->
    <footer class="layout-footer" :class="{ 'mobile-footer': isMobileLayout }">
      <slot name="footer" />
      <slot v-if="isMobileLayout" name="mobile-nav" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useLayoutStore } from '../../stores/layout';
import { getLayoutViewportWidth, isMobileLayoutWidth } from '../../utils/layoutBreakpoints';
import CollapseButton from '../common/CollapseButton.vue';
import OverlayPanel from './OverlayPanel.vue';

const layoutStore = useLayoutStore();

// 响应式状态
const rightCollapsed = computed(() => layoutStore.rightCollapsed);
const isMobileLayout = ref(false);

// 布局类名
const layoutClasses = computed(() => ({
  'right-collapsed': rightCollapsed.value,
  'mobile-layout': isMobileLayout.value,
}));

function applyLayoutWidth(width: number) {
  layoutStore.autoAdjustLayout(width);
  isMobileLayout.value = isMobileLayoutWidth(width);
}

// 响应式断点监听
let resizeObserver: ResizeObserver | null = null;

const handleResize = (entries: ResizeObserverEntry[]) => {
  for (const entry of entries) {
    const width = getLayoutViewportWidth(Math.floor(entry.contentRect.width));
    applyLayoutWidth(width);
  }
};

onMounted(() => {
  // 初始化时根据当前宽度调整布局
  const container = document.querySelector('.main-layout');
  const initialWidth = getLayoutViewportWidth(container?.clientWidth ?? 0);
  applyLayoutWidth(initialWidth);

  if (container) {
    // 监听容器尺寸变化
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style lang="scss" scoped>
.main-layout {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'header header header'
    'left center right'
    'footer footer footer';
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: var(--bg-primary);
  font-family: var(--font-base);
  font-size: var(--text-sm);
  color: var(--text-primary);
  position: relative;

  // 右侧折叠时调整网格
  &.right-collapsed {
    grid-template-columns: auto minmax(0, 1fr) 0;
  }

  &.mobile-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'header'
      'center'
      'footer';
    overflow-x: hidden;
  }
}

.layout-header {
  grid-area: header;
  min-height: var(--header-height);
  min-width: 0;
  background: transparent;
  z-index: 20;
  display: flex;
  align-items: center;
  width: 100%;
}

.layout-header > * {
  width: 100%;
}

.layout-left {
  grid-area: left;
  width: var(--sidebar-width);
  background: transparent;
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
  overflow-x: hidden;
}

.layout-center {
  grid-area: center;
  min-width: 0;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-primary);
}

.layout-right {
  grid-area: right;
  width: var(--panel-width);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border-left: 1px solid var(--glass-border);
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  transition:
    width 300ms var(--ease-out-expo),
    opacity 250ms var(--ease-out-expo),
    transform 300ms var(--ease-out-expo);

  &.collapsed {
    width: 0;
    opacity: 0;
    overflow: hidden;
    border-left: none;
  }
}

.layout-footer {
  grid-area: footer;
  min-width: 0;
  background: transparent;
  z-index: 40;
  position: relative;
}

.layout-footer.mobile-footer {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-right-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 56px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--card-bg-strong);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
}

.right-drawer-backdrop {
  display: none;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 220ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

// 手机端：右侧改抽屉，不占正文宽度
@media (max-width: 767px) {
  .layout-right.mobile-drawer {
    position: absolute;
    top: var(--header-height);
    right: 0;
    bottom: var(--mobile-footer-reserved-height, 112px);
    width: var(--mobile-drawer-width);
    max-width: calc(100% - 16px);
    transform: translateX(102%);
    opacity: 1;
    z-index: 35;
    border-left: 1px solid var(--glass-border);
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.2);
  }

  .layout-right.mobile-drawer.collapsed {
    width: var(--mobile-drawer-width);
    opacity: 1;
    overflow-y: auto;
    border-left: 1px solid var(--glass-border);
    transform: translateX(102%);
  }

  .layout-right.mobile-drawer.mobile-open {
    transform: translateX(0);
  }

  .right-drawer-backdrop {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    top: var(--header-height);
    bottom: var(--mobile-footer-reserved-height, 112px);
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 30;
  }
}

// 横屏手机特殊处理 (高度较小的情况)
@media (max-height: 500px) {
  .layout-header {
    --header-height: 36px;
  }
}
</style>
