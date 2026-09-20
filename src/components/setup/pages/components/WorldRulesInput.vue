<template>
  <div class="world-rules-input">
    <div class="rules-list">
      <div v-for="(rule, index) in modelValue" :key="index" class="rule-item">
        <input
          :value="rule"
          type="text"
          :placeholder="t('setup.worldRulesInput.placeholder')"
          @input="handleRuleInput(index, $event)"
        />
        <button :disabled="modelValue.length === 1" class="remove-btn" type="button" @click="removeRule(index)">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <button v-if="modelValue.length < 10" class="add-rule-btn" type="button" @click="addRule">
        <i class="ti ti-plus"></i> {{ t('setup.worldRulesInput.add') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../../../i18n';

interface Props {
  modelValue: string[];
}

const props = defineProps<Props>();
const { t } = useI18n();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

function handleRuleInput(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const newRules = [...props.modelValue];
  newRules[index] = value;
  emit('update:modelValue', newRules);
}

function addRule() {
  if (props.modelValue.length < 10) {
    emit('update:modelValue', [...props.modelValue, '']);
  }
}

function removeRule(index: number) {
  if (props.modelValue.length > 1) {
    const newRules = props.modelValue.filter((_, i) => i !== index);
    emit('update:modelValue', newRules);
  }
}
</script>

<style scoped>
.world-rules-input {
  width: 100%;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rule-item input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: calc(13px * var(--ui-font-scale));
  transition: border-color 0.2s ease;
}

.rule-item input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.remove-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover:not(:disabled) {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
  background: rgba(239, 68, 68, 0.05);
}

.remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-rule-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px dashed var(--border-light);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: calc(13px * var(--ui-font-scale));
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-rule-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(147, 51, 234, 0.05);
}
</style>
