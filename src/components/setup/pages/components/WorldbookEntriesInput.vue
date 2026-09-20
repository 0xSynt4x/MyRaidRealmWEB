<template>
  <div class="worldbook-entries-input">
    <div class="entries-list">
      <div v-for="(entry, index) in modelValue" :key="index" class="entry-item">
        <div class="entry-fields">
          <input
            :value="entry.name"
            type="text"
            :placeholder="t('setup.localContentEntries.namePlaceholder')"
            class="entry-name"
            @input="handleNameInput(index, $event)"
          />
          <select :value="entry.kind" class="entry-kind" @change="handleKindChange(index, $event)">
            <option value="general">{{ t('setup.localContentEntries.kind.general') }}</option>
            <option value="worldbook">{{ t('setup.localContentEntries.kind.worldbook') }}</option>
            <option value="plot_rule">{{ t('setup.localContentEntries.kind.plotRule') }}</option>
            <option value="variable_update_rule">{{ t('setup.localContentEntries.kind.variableUpdateRule') }}</option>
          </select>
          <select :value="entry.route" class="entry-route" @change="handleRouteChange(index, $event)">
            <option value="main">{{ t('setup.localContentEntries.route.main') }}</option>
            <option value="variable_update">{{ t('setup.localContentEntries.route.variableUpdate') }}</option>
            <option value="shared">{{ t('setup.localContentEntries.route.shared') }}</option>
          </select>
          <textarea
            :value="entry.content"
            :placeholder="t('setup.localContentEntries.contentPlaceholder')"
            rows="3"
            class="entry-content"
            @input="handleContentInput(index, $event)"
          />
        </div>
        <button
          class="remove-btn"
          type="button"
          :title="t('setup.localContentEntries.removeTitle')"
          @click="removeEntry(index)"
        >
          <i class="ti ti-x"></i>
        </button>
      </div>
      <button class="add-entry-btn" type="button" @click="addEntry">
        <i class="ti ti-plus"></i> {{ t('setup.localContentEntries.add') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../../../i18n';
import type { LocalContentEntryInput } from '../types/formData';
import type { StandaloneLocalContentKind, StandaloneLocalContentRoute } from '../../../../utils/standaloneLocalContent';

interface Props {
  modelValue: LocalContentEntryInput[];
}

const props = defineProps<Props>();
const { t } = useI18n();

const emit = defineEmits<{
  'update:modelValue': [value: LocalContentEntryInput[]];
}>();

function handleNameInput(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const newEntries = [...props.modelValue];
  newEntries[index] = { ...newEntries[index], name: value };
  emit('update:modelValue', newEntries);
}

function handleContentInput(index: number, event: Event) {
  const value = (event.target as HTMLTextAreaElement).value;
  const newEntries = [...props.modelValue];
  newEntries[index] = { ...newEntries[index], content: value };
  emit('update:modelValue', newEntries);
}

function handleRouteChange(index: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value as StandaloneLocalContentRoute;
  const newEntries = [...props.modelValue];
  newEntries[index] = { ...newEntries[index], route: value };
  emit('update:modelValue', newEntries);
}

function handleKindChange(index: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value as StandaloneLocalContentKind;
  const newEntries = [...props.modelValue];
  newEntries[index] = { ...newEntries[index], kind: value };
  emit('update:modelValue', newEntries);
}

function addEntry() {
  emit('update:modelValue', [...props.modelValue, { name: '', content: '', kind: 'general', route: 'shared' }]);
}

function removeEntry(index: number) {
  const newEntries = props.modelValue.filter((_, i) => i !== index);
  emit('update:modelValue', newEntries);
}
</script>

<style scoped>
.worldbook-entries-input {
  width: 100%;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  transition: border-color 0.2s ease;
}

.entry-item:hover {
  border-color: var(--accent-primary);
}

.entry-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-name {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: calc(13px * var(--ui-font-scale));
  transition: border-color 0.2s ease;
}

.entry-name:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
}

.entry-kind,
.entry-route {
  width: 180px;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: calc(13px * var(--ui-font-scale));
}

.entry-content {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: calc(13px * var(--ui-font-scale));
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.entry-content:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
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
  flex-shrink: 0;
}

.remove-btn:hover {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
  background: rgba(239, 68, 68, 0.05);
}

.add-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px dashed var(--border-light);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-entry-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(147, 51, 234, 0.05);
}
</style>
