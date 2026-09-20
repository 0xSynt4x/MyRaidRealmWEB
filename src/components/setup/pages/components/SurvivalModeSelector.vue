<template>
  <div class="survival-mode-selector">
    <div class="seg-control">
      <input
        :id="`${idPrefix}-off`"
        type="radio"
        :name="radioName"
        value="关闭"
        :checked="modelValue === '关闭'"
        @change="emit('update:modelValue', '关闭')"
      />
      <label :for="`${idPrefix}-off`">{{ t('settings.survival.off') }}</label>

      <input
        :id="`${idPrefix}-basic`"
        type="radio"
        :name="radioName"
        value="基础模式"
        :checked="modelValue === '基础模式'"
        @change="emit('update:modelValue', '基础模式')"
      />
      <label :for="`${idPrefix}-basic`">{{ t('settings.survival.basic') }}</label>

      <input
        :id="`${idPrefix}-full`"
        type="radio"
        :name="radioName"
        value="生存模式"
        :checked="modelValue === '生存模式'"
        @change="emit('update:modelValue', '生存模式')"
      />
      <label :for="`${idPrefix}-full`">{{ t('settings.survival.full') }}</label>

      <span class="seg-indicator"></span>
    </div>
    <span class="mode-status">
      {{ getModeStatus(modelValue) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../../../i18n';

type SurvivalMode = '关闭' | '基础模式' | '生存模式';

interface Props {
  modelValue: SurvivalMode;
}

defineProps<Props>();

const { t } = useI18n();

const emit = defineEmits<{
  'update:modelValue': [value: SurvivalMode];
}>();

const idPrefix = 'ai-generate-survival';
const radioName = `${idPrefix}-group`;

function getModeStatus(mode: SurvivalMode): string {
  switch (mode) {
    case '关闭':
      return t('settings.survival.summary.off');
    case '基础模式':
      return t('settings.survival.summary.basic');
    case '生存模式':
      return t('settings.survival.summary.full');
    default:
      return '';
  }
}
</script>

<style scoped>
.survival-mode-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Segmented Control - 从 SettingsPanel 复制的样式 */
.seg-control {
  position: relative;
  display: inline-flex;
  background: var(--control-border);
  border-radius: 22px;
  padding: 2px;
  flex-shrink: 0;
  height: 26px;
}

.seg-control input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.seg-control label {
  position: relative;
  z-index: 1;
  padding: 2px 10px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  user-select: none;
  min-width: 42px;
}

.seg-control input[type='radio']:checked + label {
  color: white;
  font-weight: 600;
}

.seg-indicator {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  background: var(--accent-primary);
  border-radius: 20px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(var(--accent-primary-rgb), 0.3);
  pointer-events: none;
}

.seg-control:has(input[type='radio']:nth-of-type(3)) .seg-indicator {
  width: calc(33.333% - 1.33px);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(1):checked ~ .seg-indicator {
  transform: translateX(0);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(2):checked ~ .seg-indicator {
  transform: translateX(100%);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(3):checked ~ .seg-indicator {
  transform: translateX(200%);
}

.mode-status {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
