<template>
  <Teleport to="#modal-container">
    <Transition name="lightbox">
      <div v-if="visible" ref="containerRef" class="lightbox" @click.self="close" @wheel.prevent="handleWheel">
        <img
          ref="imgRef"
          class="lightbox-img"
          :src="src"
          :alt="alt"
          :style="{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})` }"
          draggable="false"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        />
        <div class="lightbox-hint">
          <i class="ti ti-zoom-in"></i>
          <span>{{ t('messageImage.viewerHint') }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';

const props = defineProps<{
  visible: boolean;
  src: string;
  alt?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const containerRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);

/** scale = 1 表示「刚好铺满屏幕」，不是图片原始尺寸 */
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const WHEEL_STEP = 1.12;
/** 按下后移动不超过这么多像素，才算「点了一下」（用来把点击和拖动分开） */
const CLICK_SLOP = 6;

const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);

const pointers = new Map<number, { x: number; y: number }>();
let dragStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null;
let pinchStart: {
  dist: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  centerX: number;
  centerY: number;
} | null = null;
let moved = false;
let previousBodyOverflow = '';
/** 只有我们真的锁过滚动，才轮到我们解锁 —— 避免挂载时误清别人的滚动锁 */
let bodyLocked = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 把屏幕坐标换算成「相对查看器中心」的坐标 —— 图片 transform 的参照点就在这里 */
function toCenter(clientX: number, clientY: number): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return { x: clientX, y: clientY };
  return {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  };
}

/** 放大后不让图片被拖出可视范围太远；没超出屏幕时强制回正 */
function clampOffset(): void {
  const img = imgRef.value;
  const box = containerRef.value;
  if (!img || !box) return;

  const scaledWidth = img.offsetWidth * scale.value;
  const scaledHeight = img.offsetHeight * scale.value;
  const maxX = Math.max(0, (scaledWidth - box.clientWidth) / 2);
  const maxY = Math.max(0, (scaledHeight - box.clientHeight) / 2);

  offsetX.value = clamp(offsetX.value, -maxX, maxX);
  offsetY.value = clamp(offsetY.value, -maxY, maxY);
}

/** 以某个屏幕点为锚点缩放，锚点下方的画面保持不动 */
function zoomAt(clientX: number, clientY: number, factor: number): void {
  const next = clamp(scale.value * factor, MIN_SCALE, MAX_SCALE);
  const ratio = next / scale.value;
  if (ratio === 1) return;

  const anchor = toCenter(clientX, clientY);
  offsetX.value = anchor.x - (anchor.x - offsetX.value) * ratio;
  offsetY.value = anchor.y - (anchor.y - offsetY.value) * ratio;
  scale.value = next;
  clampOffset();
}

function handleWheel(event: WheelEvent): void {
  zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
}

function handlePointerDown(event: PointerEvent): void {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

  if (pointers.size === 1) {
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
    };
    moved = false;
    return;
  }

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
      centerX: (a.x + b.x) / 2,
      centerY: (a.y + b.y) / 2,
    };
    dragStart = null;
    // 双指一定不是「点击」，抬起时不该关闭
    moved = true;
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  // 双指：捏合缩放，两指中点移动时顺带平移
  if (pointers.size >= 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart.dist <= 0) return;

    const next = clamp((pinchStart.scale * dist) / pinchStart.dist, MIN_SCALE, MAX_SCALE);
    const ratio = next / pinchStart.scale;
    const anchor = toCenter(pinchStart.centerX, pinchStart.centerY);

    offsetX.value = anchor.x - (anchor.x - pinchStart.offsetX) * ratio + ((a.x + b.x) / 2 - pinchStart.centerX);
    offsetY.value = anchor.y - (anchor.y - pinchStart.offsetY) * ratio + ((a.y + b.y) / 2 - pinchStart.centerY);
    scale.value = next;
    clampOffset();
    return;
  }

  // 单指 / 鼠标：拖动平移
  if (pointers.size === 1 && dragStart) {
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP) {
      moved = true;
    }
    if (moved) {
      offsetX.value = dragStart.offsetX + dx;
      offsetY.value = dragStart.offsetY + dy;
      clampOffset();
    }
  }
}

function handlePointerUp(event: PointerEvent): void {
  pointers.delete(event.pointerId);

  if (pointers.size < 2) {
    pinchStart = null;
  }

  if (pointers.size === 0) {
    // 没拖动过 = 点了一下 → 关闭
    if (!moved && dragStart) {
      close();
    }
    dragStart = null;
    moved = false;
    return;
  }

  // 双指抬起一根后，剩下那根接着当拖动
  if (pointers.size === 1) {
    const [point] = [...pointers.values()];
    dragStart = { x: point.x, y: point.y, offsetX: offsetX.value, offsetY: offsetY.value };
    moved = true;
  }
}

function resetView(): void {
  scale.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
  pointers.clear();
  dragStart = null;
  pinchStart = null;
  moved = false;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

function close(): void {
  emit('close');
}

function lockBodyScroll(): void {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  bodyLocked = true;
}

function unlockBodyScroll(): void {
  if (!bodyLocked) return;
  document.body.style.overflow = previousBodyOverflow;
  bodyLocked = false;
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetView();
      lockBodyScroll();
      window.addEventListener('keydown', handleKeydown);
      return;
    }

    unlockBodyScroll();
    window.removeEventListener('keydown', handleKeydown);
  },
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  unlockBodyScroll();
});
</script>

<style scoped>
.lightbox {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(var(--ui-scrim-rgb), 0.88);
  /* 关键：交给我们自己处理手势，别让浏览器接管（否则双指会缩放整个页面） */
  touch-action: none;
  overscroll-behavior: none;
  cursor: zoom-out;
}

.lightbox-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
  transform-origin: center center;
  will-change: transform;
}

.lightbox-hint {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(var(--ui-scrim-rgb), 0.6);
  color: var(--ui-on-scrim-dim);
  font-size: calc(12px * var(--ui-font-scale));
  white-space: nowrap;
  /* 让点击穿透到遮罩，点提示条也算点空白 */
  pointer-events: none;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 200ms var(--ease-out-expo);
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .lightbox-hint {
    bottom: 14px;
    font-size: calc(11px * var(--ui-font-scale));
  }
}
</style>
