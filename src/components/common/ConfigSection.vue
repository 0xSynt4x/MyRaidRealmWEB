<template>
  <div class="config-section" :class="{ collapsed: !isExpanded }">
    <div class="section-header" @click="toggle">
      <span class="toggle-icon">
        <i class="ti" :class="isExpanded ? 'ti-chevron-down' : 'ti-chevron-right'"></i>
      </span>
      <span class="section-title"><i class="ti" :class="icon"></i> {{ displayTitle }}</span>
      <span v-if="displayHint" class="section-hint">{{ displayHint }}</span>
    </div>
    <div v-show="isExpanded" class="section-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

const props = defineProps<{
  icon: string;
  title: string;
  hint?: string;
  expanded: boolean;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  (e: 'update:expanded', value: boolean): void;
}>();

const isExpanded = computed({
  get: () => props.expanded,
  set: value => emit('update:expanded', value),
});

const displayTitle = computed(() => (props.title.includes('.') ? t(props.title) : props.title));
const displayHint = computed(() => {
  if (!props.hint) {
    return '';
  }
  return props.hint.includes('.') ? t(props.hint) : props.hint;
});

function toggle() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style scoped>
.config-section {
  border-bottom: 1px solid var(--border-light);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 150ms;
}

.section-header:hover {
  background: var(--bg-primary);
}

.toggle-icon {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  transition: transform 150ms;
}

.section-title {
  font-weight: 600;
  font-size: calc(14px * var(--ui-font-scale));
  color: var(--text-primary);
}

.section-hint {
  margin-left: auto;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.section-body {
  padding: 8px 12px 12px 32px;
}

/* ===== 响应式适配 ===== */

@media (max-width: 768px) {
  .section-header {
    padding: 6px 10px;
    gap: 6px;
  }

  .toggle-icon {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .section-title {
    font-size: calc(13px * var(--ui-font-scale));
  }

  .section-hint {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .section-body {
    padding: 6px 10px 10px 28px;
  }
}

@media (max-width: 480px) {
  .section-header {
    padding: 5px 8px;
    gap: 4px;
  }

  .toggle-icon {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .section-title {
    font-size: calc(12px * var(--ui-font-scale));
  }

  .section-hint {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .section-body {
    padding: 4px 8px 8px 24px;
  }
}
</style>
