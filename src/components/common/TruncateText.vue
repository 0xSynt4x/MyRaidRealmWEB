<template>
  <span
    ref="textRef"
    class="truncate-text"
    :class="{ 'is-truncated': isTruncated }"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    >{{ text
    }}<Teleport to="body">
      <div v-if="showTooltip && isTruncated" class="truncate-tooltip" :style="tooltipStyle">
        {{ text }}
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  text: string;
  truncated?: boolean;
}>();

const textRef = ref<HTMLElement | null>(null);
const showTooltip = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });

// 由父组件传入是否被截断，或者自动检测
const isTruncated = computed(() => {
  return props.truncated ?? false;
});

const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}));

const handleMouseEnter = (e: MouseEvent) => {
  if (isTruncated.value) {
    tooltipPosition.value = { x: e.clientX + 10, y: e.clientY + 10 };
    showTooltip.value = true;
  }
};

const handleMouseLeave = () => {
  showTooltip.value = false;
};

const handleClick = (e: MouseEvent) => {
  // 移动端点击切换 tooltip
  if (isTruncated.value) {
    tooltipPosition.value = { x: e.clientX + 10, y: e.clientY + 10 };
    showTooltip.value = !showTooltip.value;
  }
};
</script>

<style scoped>
.truncate-text {
  cursor: default;
}

.truncate-text.is-truncated {
  cursor: pointer;
}

.truncate-tooltip {
  position: fixed;
  z-index: 9999;
  max-width: min(300px, calc(100vw - 20px));
  max-height: min(50vh, 280px);
  overflow-y: auto;
  padding: 8px 12px;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--card-shadow-hover);
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--text-primary);
  word-wrap: break-word;
  pointer-events: none;
}

@media (max-width: 480px) {
  .truncate-tooltip {
    font-size: 11px;
    padding: 8px 10px;
    max-height: min(52vh, 240px);
  }
}
</style>
