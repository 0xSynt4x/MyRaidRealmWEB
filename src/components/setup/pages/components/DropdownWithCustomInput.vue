<template>
  <div class="selector-group">
    <select
      :id="selectId"
      :value="modelValue"
      :aria-invalid="ariaInvalid"
      :aria-describedby="ariaDescribedby"
      @change="handlePresetChange"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option" :value="option">
        {{ getOptionLabel(option) }}
      </option>
    </select>
    <input
      :id="customInputId"
      :value="customValue"
      type="text"
      :placeholder="customPlaceholder"
      :aria-invalid="ariaInvalid"
      :aria-describedby="ariaDescribedby"
      @input="handleCustomInput"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '../../../../i18n';

interface Props {
  modelValue: string;
  options: string[];
  displayNamespace?: string;
  placeholder?: string;
  customPlaceholder?: string;
  id?: string;
  customInputId?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
}

const { t, enumDisplay } = useI18n();

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  customPlaceholder: undefined,
  displayNamespace: undefined,
  id: '',
  customInputId: '',
  ariaInvalid: false,
  ariaDescribedby: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const customValue = ref('');

const selectId = computed(() => props.id || undefined);
const customInputId = computed(() => props.customInputId || undefined);
const placeholder = computed(() => props.placeholder ?? t('setup.dropdown.placeholder'));
const customPlaceholder = computed(() => props.customPlaceholder ?? t('setup.dropdown.customPlaceholder'));

function getOptionLabel(option: string): string {
  return props.displayNamespace ? enumDisplay(props.displayNamespace, option, option) : option;
}

function handlePresetChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  customValue.value = '';
  emit('update:modelValue', value);
}

function handleCustomInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  customValue.value = value;
  emit('update:modelValue', value);
}

// Reset custom value when modelValue changes externally
watch(
  () => props.modelValue,
  newValue => {
    if (!props.options.includes(newValue)) {
      customValue.value = newValue;
    } else {
      customValue.value = '';
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.selector-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.selector-group select,
.selector-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: calc(13px * var(--ui-font-scale));
  transition: border-color 0.2s ease;
}

.selector-group select:focus,
.selector-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.selector-group input:not(:placeholder-shown) {
  border-color: var(--accent-success);
  background: rgba(16, 185, 129, 0.05);
}
</style>
