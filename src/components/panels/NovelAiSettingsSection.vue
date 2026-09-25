<template>
  <div class="novelai-section">
    <!-- 地址与 Key -->
    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.baseUrl') }}</span>
      <input
        v-model="novelAi.baseUrl"
        class="text-input"
        type="text"
        spellcheck="false"
        :placeholder="t('settings.novelai.baseUrlPlaceholder')"
      />
      <button class="chip" @click="handleFillOfficial">
        <i class="ti ti-cloud-download"></i>{{ t('settings.novelai.fillOfficial') }}
      </button>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.apiKey') }}</span>
      <input
        v-model="novelAi.apiKey"
        class="text-input"
        type="password"
        spellcheck="false"
        autocomplete="off"
        :placeholder="t('settings.novelai.apiKeyPlaceholder')"
      />
      <button class="chip" :disabled="isTesting" @click="handleTestConnection">
        <i class="ti" :class="isTesting ? 'ti-loader-2 ti-spin' : 'ti-plug'"></i>
        {{ isTesting ? t('settings.novelai.testing') : t('settings.novelai.testConnection') }}
      </button>
    </div>

    <p v-if="connectionMessage" class="comfy-status" :class="`comfy-status--${connectionTone}`">
      <i class="ti" :class="connectionTone === 'ok' ? 'ti-circle-check' : 'ti-alert-triangle'"></i>
      <span>{{ connectionMessage }}</span>
    </p>

    <p class="comfy-hint">
      <i class="ti ti-info-circle"></i>
      <span>{{ t('settings.novelai.testHint') }}</span>
    </p>

    <div class="comfy-divider">{{ t('settings.novelai.modelSection') }}</div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.model') }}</span>
      <select v-model="modelSelectValue" class="comfy-select">
        <optgroup v-if="fetchedModels.length > 0" :label="t('settings.novelai.optionGroup.fetched')">
          <option v-for="model in fetchedModels" :key="model" :value="model">{{ model }}</option>
        </optgroup>
        <optgroup :label="t('settings.novelai.optionGroup.builtin')">
          <option v-for="model in NOVELAI_MODEL_OPTIONS" :key="model" :value="model">{{ model }}</option>
        </optgroup>
        <option :value="CUSTOM_OPTION_VALUE">{{ t('settings.novelai.customOption') }}</option>
      </select>
      <button class="chip" :disabled="isFetchingModels" @click="handleFetchModels">
        <i class="ti" :class="isFetchingModels ? 'ti-loader-2 ti-spin' : 'ti-cloud-download'"></i>
        {{ isFetchingModels ? t('settings.novelai.fetchingModels') : t('settings.novelai.fetchModels') }}
      </button>
    </div>

    <div v-if="isCustomModel" class="setting-row">
      <span class="row-label">{{ t('settings.novelai.customValue') }}</span>
      <input
        v-model="novelAi.model"
        class="text-input"
        type="text"
        spellcheck="false"
        :placeholder="DEFAULT_NOVELAI_MODEL"
      />
    </div>

    <p v-if="modelMessage" class="comfy-status" :class="`comfy-status--${modelTone}`">
      <i class="ti" :class="modelTone === 'ok' ? 'ti-circle-check' : 'ti-alert-triangle'"></i>
      <span>{{ modelMessage }}</span>
    </p>

    <p class="comfy-hint">
      <i class="ti ti-info-circle"></i>
      <span>{{ t('settings.novelai.manualHint') }}</span>
    </p>

    <div class="setting-row stacked">
      <span class="row-label">{{ t('settings.novelai.size') }}</span>
      <div class="size-options">
        <label v-for="option in NOVELAI_SIZE_OPTIONS" :key="option.id" class="size-option">
          <input v-model="novelAi.sizeId" type="radio" :value="option.id" />
          <span>{{ option.width }}×{{ option.height }}</span>
        </label>
      </div>
    </div>

    <div class="comfy-divider">{{ t('settings.novelai.generationSection') }}</div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.steps') }}</span>
      <input v-model.number="novelAi.steps" class="number-input" type="number" min="1" max="50" step="1" />
      <span class="row-value status">{{ t('settings.novelai.stepsHint') }}</span>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.scale') }}</span>
      <input v-model.number="novelAi.scale" class="number-input" type="number" min="0" max="20" step="0.5" />
      <span class="row-value status">{{ t('settings.novelai.scaleHint') }}</span>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.sampler') }}</span>
      <select v-model="samplerSelectValue" class="comfy-select">
        <optgroup
          v-for="group in NOVELAI_SAMPLER_GROUPS"
          :key="group.id"
          :label="t(`settings.novelai.optionGroup.${group.id}`)"
        >
          <option v-for="option in group.options" :key="option" :value="option">{{ option }}</option>
        </optgroup>
        <option :value="CUSTOM_OPTION_VALUE">{{ t('settings.novelai.customOption') }}</option>
      </select>
    </div>

    <div v-if="isCustomSampler" class="setting-row">
      <span class="row-label">{{ t('settings.novelai.customValue') }}</span>
      <input
        v-model="novelAi.sampler"
        class="text-input"
        type="text"
        spellcheck="false"
        :placeholder="DEFAULT_NOVELAI_SAMPLER"
      />
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.noiseSchedule') }}</span>
      <select v-model="noiseScheduleSelectValue" class="comfy-select">
        <optgroup
          v-for="group in NOVELAI_NOISE_SCHEDULE_GROUPS"
          :key="group.id"
          :label="t(`settings.novelai.optionGroup.${group.id}`)"
        >
          <option v-for="option in group.options" :key="option" :value="option">{{ option }}</option>
        </optgroup>
        <option :value="CUSTOM_OPTION_VALUE">{{ t('settings.novelai.customOption') }}</option>
      </select>
    </div>

    <div v-if="isCustomNoiseSchedule" class="setting-row">
      <span class="row-label">{{ t('settings.novelai.customValue') }}</span>
      <input
        v-model="novelAi.noiseSchedule"
        class="text-input"
        type="text"
        spellcheck="false"
        :placeholder="DEFAULT_NOVELAI_NOISE_SCHEDULE"
      />
    </div>

    <p class="comfy-hint">
      <i class="ti ti-info-circle"></i>
      <span>{{ t('settings.novelai.samplerHint') }}</span>
    </p>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.ucPreset') }}</span>
      <select v-model.number="novelAi.ucPreset" class="comfy-select">
        <option v-for="value in NOVELAI_UC_PRESET_VALUES" :key="value" :value="value">
          {{ t(`settings.novelai.ucPreset.${UC_PRESET_KEYS[value]}`) }}
        </option>
      </select>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.qualityToggle') }}</span>
      <label class="toggle-switch">
        <input v-model="novelAi.qualityToggle" type="checkbox" />
        <span class="toggle-track"></span>
      </label>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.advanced') }}</span>
      <button class="chip" @click="advancedExpanded = !advancedExpanded">
        <i class="ti" :class="advancedExpanded ? 'ti-chevron-up' : 'ti-chevron-down'"></i>
        {{ advancedExpanded ? t('settings.novelai.collapse') : t('settings.novelai.expand') }}
      </button>
    </div>

    <div v-if="advancedExpanded" class="setting-row">
      <span class="row-label">{{ t('settings.novelai.cfgRescale') }}</span>
      <input v-model.number="novelAi.cfgRescale" class="number-input" type="number" min="0" max="1" step="0.05" />
      <span class="row-value status">{{ t('settings.novelai.cfgRescaleHint') }}</span>
    </div>

    <div class="comfy-divider">{{ t('settings.novelai.promptSection') }}</div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.novelai.stylePreset') }}</span>
      <select v-model="novelAi.stylePresetId" class="comfy-select" @change="handleStylePresetChange">
        <option :value="NO_STYLE_PRESET_ID">{{ t('settings.comfyui.stylePreset.none') }}</option>
        <option v-for="preset in stylePresets" :key="preset.id" :value="preset.id">{{ t(preset.labelKey) }}</option>
        <option :value="CUSTOM_STYLE_PRESET_ID">{{ t('settings.comfyui.stylePreset.custom') }}</option>
      </select>
    </div>

    <div class="setting-row stacked">
      <span class="row-label">{{ t('settings.novelai.stylePrompt') }}</span>
      <textarea
        v-model="novelAi.stylePrompt"
        class="comfy-textarea"
        rows="3"
        spellcheck="false"
        :placeholder="t('settings.novelai.stylePromptPlaceholder')"
        @input="handleStylePromptInput"
      ></textarea>
    </div>

    <div class="setting-row stacked">
      <span class="row-label">{{ t('settings.novelai.negativePrompt') }}</span>
      <textarea
        v-model="novelAi.negativePrompt"
        class="comfy-textarea"
        rows="3"
        spellcheck="false"
        :placeholder="t('settings.novelai.negativePromptPlaceholder')"
      ></textarea>
    </div>

    <div class="comfy-help">
      <p class="comfy-help-title"><i class="ti ti-info-circle"></i>{{ t('settings.novelai.helpTitle') }}</p>
      <p>{{ t('settings.novelai.helpAddress') }}</p>
      <p>{{ t('settings.novelai.helpParams') }}</p>
      <p>{{ t('settings.novelai.helpSize') }}</p>
      <p>{{ t('settings.novelai.helpKey') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '../../i18n';
import {
  DEFAULT_NOVELAI_MODEL,
  DEFAULT_NOVELAI_NOISE_SCHEDULE,
  DEFAULT_NOVELAI_SAMPLER,
  NOVELAI_SIZE_OPTIONS,
  NOVELAI_UC_PRESET_VALUES,
  useSettingsStore,
} from '../../stores/settings';
import { CUSTOM_STYLE_PRESET_ID, NO_STYLE_PRESET_ID } from '../../utils/comfyuiStylePresets';
import { getImageStylePresets, getImageStylePresetPrompt } from '../../utils/imageStylePresets';
import {
  fetchNovelAiModels,
  NOVELAI_MODEL_OPTIONS,
  NOVELAI_NOISE_SCHEDULE_GROUPS,
  NOVELAI_NOISE_SCHEDULE_OPTIONS,
  NOVELAI_OFFICIAL_BASE_URL,
  NOVELAI_SAMPLER_GROUPS,
  NOVELAI_SAMPLER_OPTIONS,
  testNovelAiConnection,
} from '../../utils/novelAiImageClient';

type Tone = 'ok' | 'error' | 'idle';

/**
 * 「自定义」在下拉里的哨兵值 —— 它本身不是一个候选名。
 * 选中它就把字段清空、露出下面的手填框。
 */
const CUSTOM_OPTION_VALUE = '__custom__';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const { novelAi } = storeToRefs(settingsStore);

const stylePresets = getImageStylePresets('novelai');
const advancedExpanded = ref(false);
const isTesting = ref(false);
const connectionTone = ref<Tone>('idle');
const connectionMessage = ref('');

/** 从站点问回来的模型名（拿不到就是空），和内置候选合在一起给下拉用 */
const fetchedModels = ref<string[]>([]);
const isFetchingModels = ref(false);
const modelTone = ref<Tone>('idle');
const modelMessage = ref('');

const modelCandidates = computed(() => [...new Set([...fetchedModels.value, ...NOVELAI_MODEL_OPTIONS])]);

function isCandidate(candidates: readonly string[], value: string): boolean {
  return candidates.includes(value);
}

/**
 * 「候选下拉 + 自定义手填」三处共用的双向绑定。
 *
 * 字段里存的**始终是最终要发出去的字符串**，下拉只负责显示：
 * 值是候选之一就显示那个候选，否则显示「自定义…」并露出下面的手填框。
 * 这样手填的值不会被下拉吃掉，也不用额外存一份「当前是不是自定义」的状态。
 */
function createCandidateSelection(
  getValue: () => string,
  setValue: (value: string) => void,
  getCandidates: () => readonly string[],
) {
  return computed({
    get: () => (isCandidate(getCandidates(), getValue()) ? getValue() : CUSTOM_OPTION_VALUE),
    set: (value: string) => setValue(value === CUSTOM_OPTION_VALUE ? '' : value),
  });
}

const modelSelectValue = createCandidateSelection(
  () => novelAi.value.model,
  value => {
    novelAi.value.model = value;
  },
  () => modelCandidates.value,
);

const samplerSelectValue = createCandidateSelection(
  () => novelAi.value.sampler,
  value => {
    novelAi.value.sampler = value;
  },
  () => NOVELAI_SAMPLER_OPTIONS,
);

const noiseScheduleSelectValue = createCandidateSelection(
  () => novelAi.value.noiseSchedule,
  value => {
    novelAi.value.noiseSchedule = value;
  },
  () => NOVELAI_NOISE_SCHEDULE_OPTIONS,
);

const isCustomModel = computed(() => !isCandidate(modelCandidates.value, novelAi.value.model));
const isCustomSampler = computed(() => !isCandidate(NOVELAI_SAMPLER_OPTIONS, novelAi.value.sampler));
const isCustomNoiseSchedule = computed(() => !isCandidate(NOVELAI_NOISE_SCHEDULE_OPTIONS, novelAi.value.noiseSchedule));

/** ucPreset 的档位名，顺序与 NOVELAI_UC_PRESET_VALUES 对齐 */
const UC_PRESET_KEYS: Record<number, string> = {
  0: 'heavy',
  1: 'light',
  2: 'furry',
  3: 'human',
  4: 'none',
};

function handleFillOfficial() {
  novelAi.value.baseUrl = NOVELAI_OFFICIAL_BASE_URL;
}

/** 换预置就把它的文本填进画风框 */
function handleStylePresetChange() {
  novelAi.value.stylePrompt = getImageStylePresetPrompt('novelai', novelAi.value.stylePresetId);
}

/** 手改画风内容就切成「自定义」，免得下拉显示的名字和实际内容对不上 */
function handleStylePromptInput() {
  if (novelAi.value.stylePresetId !== CUSTOM_STYLE_PRESET_ID) {
    novelAi.value.stylePresetId = CUSTOM_STYLE_PRESET_ID;
  }
}

async function handleTestConnection() {
  if (isTesting.value) return;

  isTesting.value = true;
  connectionTone.value = 'idle';
  connectionMessage.value = '';

  try {
    const status = await testNovelAiConnection(novelAi.value.baseUrl);
    if (status === 'ok') {
      connectionTone.value = 'ok';
      connectionMessage.value = t('settings.novelai.testOk');
    } else if (status === 'invalid-url') {
      connectionTone.value = 'error';
      connectionMessage.value = t('settings.novelai.testInvalidUrl');
    } else {
      connectionTone.value = 'error';
      connectionMessage.value = t('settings.novelai.testUnreachable');
    }
  } finally {
    isTesting.value = false;
  }
}

/**
 * 问站点要模型名单。
 *
 * 官方没有这个接口、兼容站也未必有 —— **拿不到就直说拿不到**，
 * 让玩家手填，不要编一份假名单糊弄人。
 */
async function handleFetchModels() {
  if (isFetchingModels.value) return;

  isFetchingModels.value = true;
  modelTone.value = 'idle';
  modelMessage.value = '';

  try {
    const result = await fetchNovelAiModels(novelAi.value.baseUrl, novelAi.value.apiKey);

    if (result.ok) {
      fetchedModels.value = result.models;
      modelTone.value = 'ok';
      modelMessage.value = t('settings.novelai.fetchModelsOk', { count: result.models.length });
      return;
    }

    modelTone.value = 'error';
    modelMessage.value = t(`settings.novelai.fetchModelsFailed.${result.reason}`);
  } finally {
    isFetchingModels.value = false;
  }
}
</script>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.setting-row + .setting-row {
  border-top: 1px solid var(--glass-border);
}

.setting-row.stacked {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.row-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  min-width: 70px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.row-value.status {
  margin-left: auto;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
  text-align: right;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--glass-border);
  border-radius: 22px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-track::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary);
  box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.3);
}

.toggle-switch input:checked + .toggle-track::before {
  transform: translateX(18px);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--motion-fast);
  flex-shrink: 0;
}

.chip:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.4);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-input,
.number-input,
.comfy-select,
.comfy-textarea {
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--input-bg, var(--glass-border));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm, 8px);
  padding: 5px 8px;
  outline: none;
  transition: border-color var(--motion-fast);
}

.text-input {
  flex: 1;
  min-width: 0;
}

.number-input {
  width: 72px;
  text-align: center;
}

/* 🔴 下拉框底色必须**不透明**：Chrome 拿 select 的 background-color 铺原生弹层的底，
   半透明的话弹层会透出后面的内容（分组标题那一行尤其明显）。
   上面那条共用规则给的是半透明的 --input-bg/--glass-border，这里必须覆盖掉。 */
.comfy-select {
  flex: 1;
  min-width: 0;
  background: var(--bg-card-solid);
}

.comfy-textarea {
  width: 100%;
  resize: vertical;
  font-family: var(--font-mono, monospace);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.5;
}

.text-input:focus,
.number-input:focus,
.comfy-select:focus,
.comfy-textarea:focus {
  border-color: rgba(var(--accent-primary-rgb), 0.5);
}

.comfy-status {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 4px 0 0;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.5;
  color: var(--text-secondary);
}

.comfy-status--ok {
  color: var(--accent-success);
}

.comfy-status--error {
  color: var(--accent-danger);
}

.comfy-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 4px 0 0;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.5;
  color: var(--text-secondary);
}

.comfy-hint i {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--accent-primary);
}

.comfy-divider {
  margin: 12px 0 4px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-top: 1px solid var(--glass-border);
  padding-top: 10px;
}

.comfy-help {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--card-bg) 82%, transparent);
  border: 1px solid var(--glass-border);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
}

.comfy-help p {
  margin: 0;
}

.comfy-help p + p {
  margin-top: 4px;
}

.comfy-help-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--text-primary);
}

.size-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.size-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--motion-fast);
}

.size-option:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
}

.size-option:has(input:checked) {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.5);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.size-option input {
  margin: 0;
  accent-color: var(--accent-primary);
}
</style>
