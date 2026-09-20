<template>
  <div
    ref="layoutRootRef"
    class="main-layout"
    :class="layoutClasses"
    @touchstart.passive="handleDrawerTouchStart"
    @touchmove="handleDrawerTouchMove"
    @touchend="handleDrawerTouchEnd"
    @touchcancel="handleDrawerTouchEnd"
  >
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
        :direction="effectiveRightCollapsed ? 'left' : 'right'"
        position="right"
        @click="effectiveRightCollapsed ? expandRightEffective() : collapseRightEffective()"
      />

      <!-- 手机端：右侧抽屉入口按钮 -->
      <button
        v-else
        class="mobile-right-toggle"
        :title="effectiveRightCollapsed ? '展开右侧信息面板' : '收起右侧信息面板'"
        @click="effectiveRightCollapsed ? expandRightEffective() : collapseRightEffective()"
      >
        <i :class="effectiveRightCollapsed ? 'ti ti-chevron-left' : 'ti ti-chevron-right'"></i>
      </button>
    </main>

    <!-- 手机端抽屉遮罩 -->
    <Transition name="drawer-fade">
      <div
        v-if="isMobileLayout && (!effectiveRightCollapsed || isDraggingDrawer || isSettlingDrawer)"
        class="right-drawer-backdrop"
        :style="backdropDragStyle"
        @click="collapseRightEffective()"
      ></div>
    </Transition>

    <!-- 右侧面板 -->
    <aside
      class="layout-right"
      :class="{
        collapsed: effectiveRightCollapsed,
        'mobile-drawer': isMobileLayout,
        'mobile-open': isMobileLayout && !effectiveRightCollapsed,
      }"
      :style="drawerDragStyle"
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

// ⚠️ 移动端右栏的折叠状态**不写 settings**，只在本组件留一个 ref。
// 原因：layout store 的 rightCollapsed 是 settings 持久化的（用户手动展开/折叠会写盘）。
// 如果用 settings 走，手机折叠会把用户的桌面"右栏默认展开"配置也带过去 ——
// 用户在手机上看一眼，桌面下次打开就只剩一个箭头，必须再点开。
// mobile 用本地状态、desktop 走 store，两边互不干扰。

// 移动端右栏本地折叠状态。null 表示"还没初始化过"，下次进入 mobile 时会被强制设成 true。
const mobileRightCollapsed = ref<boolean | null>(null);

const effectiveRightCollapsed = computed(() => {
  return isMobileLayout.value
    ? (mobileRightCollapsed.value ?? true) // mobile：本地优先，null 兜底折叠
    : rightCollapsed.value; // desktop：跟随 store
});

function expandRightEffective() {
  if (isMobileLayout.value) mobileRightCollapsed.value = false;
  else layoutStore.expandRight();
}

function collapseRightEffective() {
  if (isMobileLayout.value) mobileRightCollapsed.value = true;
  else layoutStore.collapseRight();
}

// ── 手机端右栏抽屉：左右滑动开关（跟手拖拽）────────────────────────────
// 收起时左滑拉出、展开时右滑收回。拖动过程中抽屉跟着手指实时位移，
// 松手时按「拖过约 1/3 宽度」或「快速甩动」决定停住展开还是回弹收起。
const DRAWER_SETTLE_RATIO = 1 / 3; // 拖过这个比例就切换状态
const DRAWER_FLING_SPEED = 0.5; // px/ms，快速甩动即使距离不够也切换
const DRAWER_AXIS_RATIO = 1.2; // 横向位移要明显大于纵向，才认作抽屉手势
const DRAWER_MIN_START = 8; // 手指移动超过这个距离才开始判方向

const layoutRootRef = ref<HTMLElement | null>(null);
const isDraggingDrawer = ref(false);
const isSettlingDrawer = ref(false);
const drawerProgress = ref(1); // 1 = 完全展开，0 = 完全收起

let touchAxis: 'undecided' | 'horizontal' | 'vertical' = 'undecided';
let touchStartX = 0;
let touchStartY = 0;
let lastMoveX = 0;
let lastMoveAt = 0;
let dragMode: 'open' | 'close' | null = null;
let drawerWidth = 0;

// 拖动期间用行内样式接管位移，同时关掉 CSS 过渡 —— 这样才能完全跟手
const drawerDragStyle = computed(() => {
  if (!isDraggingDrawer.value && !isSettlingDrawer.value) return undefined;
  return {
    transform: `translateX(${(1 - drawerProgress.value) * 102}%)`,
    transition: 'none',
  };
});

const backdropDragStyle = computed(() => {
  if (isDraggingDrawer.value) {
    return { opacity: String(drawerProgress.value), transition: 'none' };
  }
  if (isSettlingDrawer.value) {
    return { opacity: String(drawerProgress.value) };
  }
  return undefined;
});

// 这些地方不抢手势：底部导航（自己会横向滚）、输入栏、全屏面板、
// 输入类控件，以及自身能横向滚动的元素（例如代码块）
function shouldIgnoreDrawerGesture(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.closest('.mobile-bottom-nav, .layout-footer, .overlay-panel')) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;

  let node: HTMLElement | null = target;
  for (let depth = 0; node && depth < 4; depth += 1) {
    const overflowX = window.getComputedStyle(node).overflowX;
    if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 4) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function resetDrawerGesture() {
  touchAxis = 'undecided';
  dragMode = null;
  drawerWidth = 0;
}

function handleDrawerTouchStart(event: TouchEvent) {
  if (!isMobileLayout.value || isSettlingDrawer.value || event.touches.length !== 1) return;
  if (shouldIgnoreDrawerGesture(event.target)) return;

  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  lastMoveX = touch.clientX;
  lastMoveAt = performance.now();
  touchAxis = 'undecided';
  dragMode = null;

  const drawer = layoutRootRef.value?.querySelector('.layout-right');
  drawerWidth = drawer instanceof HTMLElement ? drawer.offsetWidth : 0;
}

function handleDrawerTouchMove(event: TouchEvent) {
  if (!isMobileLayout.value || touchAxis === 'vertical' || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (touchAxis === 'undecided') {
    if (Math.abs(dx) < DRAWER_MIN_START && Math.abs(dy) < DRAWER_MIN_START) return;
    // 纵向为主 → 交还给页面滚动，本次手势彻底放弃
    if (Math.abs(dx) <= Math.abs(dy) * DRAWER_AXIS_RATIO) {
      touchAxis = 'vertical';
      return;
    }
    touchAxis = 'horizontal';
  }

  if (!dragMode) {
    const wantOpen = dx < 0; // 左滑 = 拉出抽屉
    // 收起时右滑、展开时左滑 —— 方向跟当前状态相反，不接管
    if (effectiveRightCollapsed.value !== wantOpen || drawerWidth <= 0) {
      touchAxis = 'vertical';
      return;
    }
    dragMode = wantOpen ? 'open' : 'close';
    drawerProgress.value = wantOpen ? 0 : 1;
    isDraggingDrawer.value = true;
  }

  if (event.cancelable) event.preventDefault();

  const raw = dragMode === 'open' ? -dx / drawerWidth : 1 - dx / drawerWidth;
  drawerProgress.value = Math.min(1, Math.max(0, raw));
  lastMoveX = touch.clientX;
  lastMoveAt = performance.now();
}

function handleDrawerTouchEnd(event: TouchEvent) {
  if (!dragMode || !isDraggingDrawer.value) {
    resetDrawerGesture();
    return;
  }

  const touch = event.changedTouches[0];
  const elapsed = Math.max(1, performance.now() - lastMoveAt);
  const speed = (touch.clientX - lastMoveX) / elapsed; // <0 左滑，>0 右滑
  const progress = drawerProgress.value;

  let settleOpen: boolean;
  if (dragMode === 'open') {
    settleOpen = progress > DRAWER_SETTLE_RATIO || (speed < -DRAWER_FLING_SPEED && progress > 0.04);
  } else {
    const closing = progress < 1 - DRAWER_SETTLE_RATIO || (speed > DRAWER_FLING_SPEED && progress < 0.96);
    settleOpen = !closing;
  }

  // 先按跟手位置渲染一帧，再把控制权交回 CSS 过渡 ——
  // 否则松手瞬间会先跳到目标值再动画（回弹会闪一下）
  isDraggingDrawer.value = false;
  isSettlingDrawer.value = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (settleOpen) expandRightEffective();
      else collapseRightEffective();
      isSettlingDrawer.value = false;
      resetDrawerGesture();
    });
  });
}

// 上一次是不是手机布局 —— 用来只在「刚切进手机布局」那一刻强制折叠一次，
// 之后用户在 mobile 里手动把右栏拉出来就不再被反复折叠回去（键盘弹出会触发 resize）
let lastWasMobileLayout: boolean | null = null;

function applyLayoutWidth(width: number) {
  layoutStore.autoAdjustLayout(width);
  const mobile = isMobileLayoutWidth(width);

  // 刚切进 mobile 时强制折叠（覆盖用户在 mobile 上次的手动展开）
  if (mobile && lastWasMobileLayout !== true) {
    mobileRightCollapsed.value = true;
  }

  lastWasMobileLayout = mobile;
  isMobileLayout.value = mobile;
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
  /* ⚠️ 扁平化改版：顶栏已隐藏，整块高度归零 ——
     HeaderBar 结构还在（只是 display:none），这里把「顶栏该多高」这个值也归零，
     顺带让右侧抽屉 / 遮罩的 top 跟着落到 0，不会在顶部留一条空带。
     要恢复顶栏：删掉下面这一行即可（会自动回到 global.css 的 --ui-topbar-h）。 */
  --header-height: 0px;

  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: var(--header-height) minmax(0, 1fr) auto;
  grid-template-areas:
    'header header header'
    'left center right'
    'left footer right';
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
  position: relative;
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
    /* 松手回弹时遮罩要跟着抽屉一起收敛，不能硬跳 */
    transition: opacity 220ms ease;
  }
}

// 横屏手机原本会把顶栏压到 36px；顶栏已隐藏，这条不再有意义。
// （恢复顶栏时把 .layout-header { --header-height: 36px } 加回来即可）
</style>
