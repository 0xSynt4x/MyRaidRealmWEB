<template>
  <button class="collapse-btn" :class="[positionClass, directionClass]" :title="title" @click="$emit('click')">
    <i class="fa-solid" :class="iconClass"></i>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

interface Props {
  /** 箭头指向方向：left 表示向左（展开右侧），right 表示向右（收起右侧） */
  direction: 'left' | 'right';
  /** 按钮位置 */
  position: 'left' | 'right' | 'inside-left';
}

const props = defineProps<Props>();
const { t } = useI18n();

defineEmits<{
  click: [];
}>();

// 图标类名
const iconClass = computed(() => {
  return props.direction === 'left' ? 'fa-chevron-left' : 'fa-chevron-right';
});

// 位置类名
const positionClass = computed(() => {
  switch (props.position) {
    case 'left':
      return 'pos-left';
    case 'right':
      return 'pos-right';
    case 'inside-left':
      return 'pos-inside-left';
    default:
      return '';
  }
});

// 方向类名
const directionClass = computed(() => {
  return props.direction === 'left' ? 'dir-left' : 'dir-right';
});

// 按钮提示文字
const title = computed(() => {
  if (props.position === 'left' || props.position === 'inside-left') {
    return props.direction === 'right' ? t('common.expandLeftSidebar') : t('common.collapseLeftSidebar');
  } else {
    return props.direction === 'left' ? t('common.expandRightSidebar') : t('common.collapseRightSidebar');
  }
});
</script>

<style lang="scss" scoped>
.collapse-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: var(--collapse-btn-size);
  height: calc(var(--collapse-btn-size) * 2);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: all 200ms ease;
  z-index: 5;
  color: var(--text-secondary);
  font-size: 14px;

  &:hover {
    opacity: 1;
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  // 位置：中间内容区域左侧边缘
  &.pos-left {
    left: 8px;
  }

  // 位置：中间内容区域右侧边缘
  &.pos-right {
    right: 8px;
  }

  // 位置：左侧面板内部右侧
  &.pos-inside-left {
    right: 4px;
    top: 12px;
    transform: none;
    height: var(--collapse-btn-size);
    width: var(--collapse-btn-size);
    border-radius: 50%;
  }
}
</style>
