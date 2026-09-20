<template>
  <div ref="containerRef" class="content-text">
    <!-- 背景图层 -->
    <div v-if="backgroundImage?.imageUrl" class="background-layer" :style="backgroundLayerStyle"></div>

    <!-- 舞台遮罩：有背景图时压暗，保证正文可读 -->
    <div v-if="backgroundImage?.imageUrl" class="stage-veil"></div>

    <!-- 页面内通知 -->
    <NotificationContainer />

    <!-- 消息历史容器 -->
    <div ref="historyRef" class="message-history">
      <!-- 正文列：限宽居中。滚动条仍贴在窗口边缘，不会被一起收窄。 -->
      <div class="reading-column">
        <!-- 加载状态 -->
        <div v-if="messagesStore.isLoading" class="loading-state">
          <i class="ti ti-loader-2 ti-spin"></i>
          <p>{{ t('common.loading') }}</p>
        </div>

        <!-- 消息列表 -->
        <MessageCard v-for="message in messagesStore.visibleMessages" :key="message.message_id" :message="message" />

        <!-- 空状态 -->
        <div v-if="messagesStore.isEmpty && !messagesStore.isLoading" class="empty-content">
          <i class="ti ti-file-text"></i>
          <p>{{ t('common.emptyContent') }}</p>
        </div>
      </div>
    </div>

    <!-- 底部渐变遮罩：正文滚到底时淡出，不是硬切 -->
    <div class="reading-fade" aria-hidden="true"></div>

    <!-- 暗角：把视觉焦点收到中间 -->
    <div class="orn-vignette" aria-hidden="true"></div>

    <!-- 全屏噪点：0.07 的纯颗粒，压在最上层 -->
    <div class="orn-noise" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import { useMessagesStore } from '../../stores/messages';
import { useSettingsStore } from '../../stores/settings';
import MessageCard from './MessageCard.vue';
import NotificationContainer from './NotificationContainer.vue';

const settingsStore = useSettingsStore();
const { backgroundImage } = storeToRefs(settingsStore);
const messagesStore = useMessagesStore();
const { t } = useI18n();
const visibleMessages = computed(() => messagesStore.visibleMessages);

// 容器引用
const containerRef = ref<HTMLElement | null>(null);
const historyRef = ref<HTMLElement | null>(null);

// 自动滚动控制
const BOTTOM_THRESHOLD_PX = 48;
const BOTTOM_SNAP_THRESHOLD_PX = 2;
const BOTTOM_SNAP_MAX_FRAMES = 24;
const BOTTOM_SNAP_STABLE_FRAMES = 2;
const userLockedRef = ref(false);
let resizeObserver: ResizeObserver | null = null;
let bottomSnapRafId: number | null = null;
let bottomSnapRunToken = 0;

// 计算背景层样式
const backgroundLayerStyle = computed(() => {
  if (!backgroundImage.value?.imageUrl) {
    return { display: 'none' };
  }

  const opacity = backgroundImage.value.opacity ?? 30;
  const position = backgroundImage.value.position ?? 'center';
  const size = backgroundImage.value.size ?? 'cover';
  const repeat = backgroundImage.value.repeat ?? 'no-repeat';

  return {
    backgroundImage: `url(${backgroundImage.value.imageUrl})`,
    backgroundPosition: position,
    backgroundSize: size,
    backgroundRepeat: repeat,
    opacity: opacity / 100,
  };
});

function distanceToBottom(el: HTMLElement): number {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

function isNearBottom(el: HTMLElement, threshold = BOTTOM_THRESHOLD_PX): boolean {
  return distanceToBottom(el) <= threshold;
}

function updateUserLock() {
  const el = historyRef.value;
  if (!el) return;
  userLockedRef.value = !isNearBottom(el);
}

function setScrollBottom() {
  const el = historyRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

function canAutoSnap(force = false): boolean {
  if (!settingsStore.autoScroll) return false;

  const el = historyRef.value;
  if (!el) return false;

  // 用户手动上滑时，除新增楼层外不强制拉底
  if (!force && userLockedRef.value && !isNearBottom(el)) {
    return false;
  }

  return true;
}

function cancelBottomSnapLoop() {
  bottomSnapRunToken += 1;
  if (bottomSnapRafId !== null) {
    cancelAnimationFrame(bottomSnapRafId);
    bottomSnapRafId = null;
  }
}

function runBottomSnapLoop(force = false) {
  const token = ++bottomSnapRunToken;
  let frameCount = 0;
  let stableFrames = 0;

  const tick = () => {
    if (token !== bottomSnapRunToken) {
      bottomSnapRafId = null;
      return;
    }

    const el = historyRef.value;
    if (!el || !canAutoSnap(force)) {
      bottomSnapRafId = null;
      return;
    }

    setScrollBottom();

    const distance = distanceToBottom(el);
    if (distance <= BOTTOM_SNAP_THRESHOLD_PX) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
    }

    frameCount += 1;
    if (stableFrames >= BOTTOM_SNAP_STABLE_FRAMES || frameCount >= BOTTOM_SNAP_MAX_FRAMES) {
      bottomSnapRafId = null;
      return;
    }

    bottomSnapRafId = requestAnimationFrame(tick);
  };

  bottomSnapRafId = requestAnimationFrame(tick);
}

function scrollToBottomStable(force = false) {
  if (!canAutoSnap(force)) return;

  nextTick(() => {
    if (!canAutoSnap(force)) return;

    // 新一轮拉底前，先取消上一轮，避免并发竞争
    if (bottomSnapRafId !== null) {
      cancelAnimationFrame(bottomSnapRafId);
      bottomSnapRafId = null;
    }

    runBottomSnapLoop(force);
  });
}

// 新增楼层：可强制到底
watch(
  () => visibleMessages.value.length,
  (newLength, oldLength) => {
    const force = (oldLength ?? 0) < newLength;
    scrollToBottomStable(force);
  },
);

// 流式增长/格式化回流：仅在未上滑锁定时跟随
watch(
  () => {
    const list = visibleMessages.value;
    const last = list[list.length - 1];
    if (!last) return '';
    return `${last.message_id}|${last.content_text ?? ''}|${last.think_content ?? ''}|${last.summary_content ?? ''}|${last.formatted ?? ''}`;
  },
  () => {
    scrollToBottomStable(false);
  },
);

// 重新开启自动滚动时，主动回到底部并解锁
watch(
  () => settingsStore.autoScroll,
  enabled => {
    if (!enabled) return;
    userLockedRef.value = false;
    scrollToBottomStable(true);
  },
);

// 生命周期
onMounted(() => {
  messagesStore.loadAllMessages();

  nextTick(() => {
    const el = historyRef.value;
    if (!el) return;

    el.addEventListener('scroll', updateUserLock, { passive: true });
    updateUserLock();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scrollToBottomStable(false);
      });
      resizeObserver.observe(el);
    }

    scrollToBottomStable(true);
  });
});

onBeforeUnmount(() => {
  const el = historyRef.value;
  if (el) {
    el.removeEventListener('scroll', updateUserLock);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  cancelBottomSnapLoop();
});
</script>

<style scoped>
.content-text {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

/* 舞台遮罩：字压在画上时靠它撑住可读性 */
.stage-veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(21, 18, 13, 0.42) 0%,
    rgba(21, 18, 13, 0.58) 52%,
    rgba(21, 18, 13, 0.86) 100%
  );
}

.message-history {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 18px 0 72px; /* 底部留白给渐变遮罩 */
}

/* 正文列：最宽 750px（走令牌），居中 */
.reading-column {
  max-width: var(--ui-reading-w, 750px);
  margin: 0 auto;
  padding: 0 18px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 底部渐变遮罩：文字滚到底部时淡出，不是硬切 */
.reading-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 72px;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0%, var(--bg-primary) 94%);
}

/* 暗角与噪点压在文字上方；0.07 的噪点只给颗粒感，不糊字 */
.orn-vignette {
  z-index: 4;
}

.orn-noise {
  z-index: 5;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  color: var(--text-secondary);
  gap: 16px;
}

.loading-state i {
  font-size: calc(32px * var(--ui-font-scale));
}

/* 空状态 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  color: var(--text-secondary);
  gap: 16px;
}

.empty-content i {
  font-size: calc(48px * var(--ui-font-scale));
  opacity: 0.5;
}

/* 滚动条 */
.message-history::-webkit-scrollbar {
  width: 6px;
}

.message-history::-webkit-scrollbar-track {
  background: transparent;
}

.message-history::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.message-history::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 平板档原来没有覆盖，留白还是 18px，而横幅 .banner-slot 在 1023 断点已经收到 14px ——
   正文比横幅宽 6px，边缘对不齐。补上这一档，和横幅 / 输入栏统一。 */
@media (max-width: 1023px) {
  .reading-column {
    padding: 0 14px;
  }
}

@media (max-width: 768px) {
  .message-history {
    padding: 12px 0 64px;
  }

  .reading-column {
    padding: 0 12px;
  }

  .reading-fade {
    height: 64px;
  }
}

@media (max-width: 480px) {
  .message-history {
    padding: 10px 0 56px;
  }

  .reading-column {
    padding: 0 10px;
  }

  .reading-fade {
    height: 56px;
  }
}
</style>
