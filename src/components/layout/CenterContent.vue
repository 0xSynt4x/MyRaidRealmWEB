<template>
  <div class="center-content">
    <!-- 场景横幅：固定在中栏顶部，不随正文滚动 -->
    <SceneBanner @reset-game="emit('reset-game')" />
    <!-- 正文：吃掉横幅之外的全部高度，自己内部滚动 -->
    <ContentText class="center-body" />
  </div>
</template>

<script setup lang="ts">
import ContentText from '../common/ContentText.vue';
import SceneBanner from './SceneBanner.vue';

const emit = defineEmits<{
  (event: 'reset-game'): void;
}>();
</script>

<style scoped>
/* 中栏竖排 —— 横幅固定在上，正文在下单独滚动。
   原来这里是 overflow-y:auto，但真正滚动的是里面的 .message-history，
   这层从来没触发过，所以改 hidden 不会有任何影响。 */
.center-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overflow-x: hidden;
  background: var(--bg-primary);
  width: 100%;
  height: 100%;
}

/* flex-basis:0 —— 正文高度完全由「剩余空间」决定，不会被内容撑开 */
.center-body {
  flex: 1 1 0;
  min-height: 0;
}
</style>
