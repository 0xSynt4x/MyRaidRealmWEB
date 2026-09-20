<template>
  <div class="setting-card comfy-card">
    <h3 class="card-title"><i class="ti ti-wand"></i>{{ t('settings.card.comfyui') }}</h3>

    <!-- 这条一直显示：不开这个权限，网页根本发不出请求 -->
    <div class="comfy-notice">
      <i class="ti ti-world"></i>
      <div class="comfy-notice-body">
        <p class="comfy-notice-title">{{ t('settings.comfyui.localNetworkTitle') }}</p>
        <p>{{ t('settings.comfyui.localNetworkBody') }}</p>
      </div>
    </div>

    <div class="setting-row">
      <span class="row-label">{{ t('settings.comfyui.enable') }}</span>
      <label class="toggle-switch">
        <input v-model="comfyUi.enabled" type="checkbox" />
        <span class="toggle-track"></span>
      </label>
      <span class="row-value status">
        {{ comfyUi.enabled ? t('settings.comfyui.enabledHint') : t('settings.comfyui.disabledHint') }}
      </span>
    </div>

    <template v-if="comfyUi.enabled">
      <div class="setting-row">
        <span class="row-label">{{ t('settings.comfyui.serverUrl') }}</span>
        <input
          v-model="comfyUi.baseUrl"
          class="text-input"
          type="text"
          spellcheck="false"
          :placeholder="t('settings.comfyui.serverUrlPlaceholder')"
        />
        <button class="chip" :disabled="isTesting" @click="handleTestConnection">
          <i class="ti" :class="isTesting ? 'ti-loader-2 ti-spin' : 'ti-plug'"></i>
          {{ isTesting ? t('settings.comfyui.testing') : t('settings.comfyui.testConnection') }}
        </button>
      </div>

      <p v-if="connectionMessage" class="comfy-status" :class="`comfy-status--${connectionTone}`">
        <i class="ti" :class="connectionTone === 'ok' ? 'ti-circle-check' : 'ti-alert-triangle'"></i>
        <span>{{ connectionMessage }}</span>
      </p>

      <div class="setting-row stacked">
        <span class="row-label">{{ t('settings.comfyui.workflow') }}</span>
        <textarea
          v-model="workflowDraft"
          class="comfy-textarea"
          rows="6"
          spellcheck="false"
          :placeholder="t('settings.comfyui.workflowPlaceholder')"
          @blur="scheduleAnalysis(true)"
        ></textarea>
        <div class="comfy-actions">
          <button class="chip" :disabled="isAnalyzing || !workflowDraft.trim()" @click="handleAnalyze">
            <i class="ti" :class="isAnalyzing ? 'ti-loader-2 ti-spin' : 'ti-refresh'"></i>
            {{ isAnalyzing ? t('settings.comfyui.analyzing') : t('settings.comfyui.reanalyze') }}
          </button>
          <button class="chip" :disabled="!workflowDraft.trim()" @click="handleClearWorkflow">
            <i class="ti ti-trash"></i>{{ t('settings.comfyui.clear') }}
          </button>
        </div>
      </div>

      <p v-if="analysisMessage" class="comfy-status" :class="`comfy-status--${analysisTone}`">
        <i
          class="ti"
          :class="
            analysisTone === 'ok'
              ? 'ti-circle-check'
              : analysisTone === 'pending'
                ? 'ti-hourglass'
                : 'ti-alert-triangle'
          "
        ></i>
        <span>{{ analysisMessage }}</span>
      </p>

      <p v-if="analysisWarning" class="comfy-status comfy-status--warn">
        <i class="ti ti-alert-triangle"></i>
        <span>{{ analysisWarning }}</span>
      </p>

      <template v-if="textNodeOptions.length > 0">
        <div class="setting-row">
          <span class="row-label">{{ t('settings.comfyui.positiveNode') }}</span>
          <select v-model="comfyUi.positiveNodeId" class="comfy-select">
            <option value="">{{ t('settings.comfyui.nodeUnset') }}</option>
            <option v-for="node in textNodeOptions" :key="node.id" :value="node.id">{{ node.label }}</option>
          </select>
        </div>

        <div class="setting-row">
          <span class="row-label">{{ t('settings.comfyui.negativeNode') }}</span>
          <select v-model="comfyUi.negativeNodeId" class="comfy-select">
            <option value="">{{ t('settings.comfyui.nodeNone') }}</option>
            <option v-for="node in textNodeOptions" :key="node.id" :value="node.id">{{ node.label }}</option>
          </select>
        </div>
      </template>

      <div class="comfy-divider">{{ t('settings.comfyui.promptSection') }}</div>

      <div class="setting-row">
        <span class="row-label">{{ t('settings.comfyui.stylePreset') }}</span>
        <select v-model="comfyUi.stylePresetId" class="comfy-select" @change="handleStylePresetChange">
          <option value="none">{{ t('settings.comfyui.stylePreset.none') }}</option>
          <option v-for="preset in stylePresets" :key="preset.id" :value="preset.id">
            {{ t(preset.labelKey) }}
          </option>
          <option value="custom">{{ t('settings.comfyui.stylePreset.custom') }}</option>
        </select>
      </div>

      <div class="setting-row stacked">
        <span class="row-label">{{ t('settings.comfyui.stylePrompt') }}</span>
        <textarea
          v-model="comfyUi.stylePrompt"
          class="comfy-textarea"
          rows="3"
          spellcheck="false"
          :placeholder="t('settings.comfyui.stylePromptPlaceholder')"
          @input="handleStylePromptInput"
        ></textarea>
      </div>

      <div class="setting-row stacked">
        <span class="row-label">{{ t('settings.comfyui.negativePrompt') }}</span>
        <textarea
          v-model="comfyUi.negativePrompt"
          class="comfy-textarea"
          rows="3"
          spellcheck="false"
          :placeholder="t('settings.comfyui.negativePromptPlaceholder')"
        ></textarea>
      </div>

      <p class="comfy-hint">
        <i class="ti ti-info-circle"></i>
        <span>{{ t('settings.comfyui.promptHint') }}</span>
      </p>

      <div class="comfy-divider">{{ t('settings.comfyui.generationSettings') }}</div>

      <div class="setting-row">
        <span class="row-label">{{ t('settings.comfyui.overrideSize') }}</span>
        <label class="toggle-switch">
          <input v-model="comfyUi.overrideSize" type="checkbox" />
          <span class="toggle-track"></span>
        </label>
        <template v-if="comfyUi.overrideSize">
          <input v-model.number="comfyUi.width" class="number-input" type="number" min="64" max="4096" step="64" />
          <span class="row-label sm">{{ t('settings.comfyui.width') }}</span>
          <input v-model.number="comfyUi.height" class="number-input" type="number" min="64" max="4096" step="64" />
          <span class="row-label sm">{{ t('settings.comfyui.height') }}</span>
        </template>
        <span v-else class="row-value status">{{ t('settings.comfyui.overrideSizeOffHint') }}</span>
      </div>

      <div class="setting-row">
        <span class="row-label">{{ t('settings.comfyui.randomSeed') }}</span>
        <label class="toggle-switch">
          <input v-model="comfyUi.randomSeed" type="checkbox" />
          <span class="toggle-track"></span>
        </label>
        <span class="row-value status">
          {{ comfyUi.randomSeed ? t('settings.comfyui.randomSeedOnHint') : t('settings.comfyui.randomSeedOffHint') }}
        </span>
      </div>

      <div class="comfy-help">
        <p class="comfy-help-title"><i class="ti ti-info-circle"></i>{{ t('settings.comfyui.helpTitle') }}</p>
        <p>{{ t('settings.comfyui.helpCors') }}</p>
        <p>{{ t('settings.comfyui.helpWorkflow') }}</p>
        <p>{{ t('settings.comfyui.helpUsage') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '../../i18n';
import { useNotificationStore } from '../../stores/notification';
import { useSettingsStore } from '../../stores/settings';
import {
  analyzeComfyWorkflow,
  convertUiWorkflowToApi,
  detectComfyWorkflowFormat,
  fetchComfyUiObjectInfo,
  fetchComfyUiServerInfo,
  normalizeComfyUiBaseUrl,
} from '../../utils/comfyuiClient';
import { COMFYUI_STYLE_PRESETS, CUSTOM_STYLE_PRESET_ID, getStylePresetPrompt } from '../../utils/comfyuiStylePresets';

type Tone = 'ok' | 'error' | 'idle' | 'pending';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const notificationStore = useNotificationStore();
const { comfyUi } = storeToRefs(settingsStore);

const workflowDraft = ref(comfyUi.value.workflowJson);
const isTesting = ref(false);
const isAnalyzing = ref(false);
const connectionTone = ref<Tone>('idle');
const connectionMessage = ref('');
const analysisTone = ref<Tone>('idle');
const analysisMessage = ref('');
const analysisWarning = ref('');
const textNodeOptions = ref<{ id: string; label: string }[]>([]);
const stylePresets = COMFYUI_STYLE_PRESETS;

/** 换预置就把它的文本填进画风框（自定义 / 不用时清空或保留原文） */
function handleStylePresetChange() {
  comfyUi.value.stylePrompt = getStylePresetPrompt(comfyUi.value.stylePresetId);
}

/** 手改画风内容就切成「自定义」，免得下拉显示的名字和实际内容对不上 */
function handleStylePromptInput() {
  if (comfyUi.value.stylePresetId !== CUSTOM_STYLE_PRESET_ID) {
    comfyUi.value.stylePresetId = CUSTOM_STYLE_PRESET_ID;
  }
}

/** 粘贴后自动解析的防抖计时器 */
let analysisTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => comfyUi.value.workflowJson,
  value => {
    if (value !== workflowDraft.value) {
      workflowDraft.value = value;
    }
  },
);

// 粘进框里就自动解析，不用点按钮
watch(workflowDraft, value => {
  if (value === comfyUi.value.workflowJson) return;
  scheduleAnalysis();
});

// 打开总开关时，顺手把还没转成功的工作流再转一次
watch(
  () => comfyUi.value.enabled,
  enabled => {
    if (enabled && workflowDraft.value.trim() && analysisTone.value !== 'ok') {
      scheduleAnalysis(true);
    }
  },
);

onUnmounted(() => {
  if (analysisTimer) {
    clearTimeout(analysisTimer);
    analysisTimer = null;
  }
});

/** 防抖：停手 600ms 后才解析，避免每敲一个字都跑一遍 */
function scheduleAnalysis(immediate = false) {
  if (analysisTimer) {
    clearTimeout(analysisTimer);
    analysisTimer = null;
  }

  if (immediate) {
    commitWorkflow();
    void runAnalysis(true);
    return;
  }

  analysisTimer = setTimeout(() => {
    analysisTimer = null;
    commitWorkflow();
    void runAnalysis(true);
  }, 600);
}

function commitWorkflow() {
  if (comfyUi.value.workflowJson === workflowDraft.value) return;
  comfyUi.value.workflowJson = workflowDraft.value;
  comfyUi.value.workflowApiJson = '';
  textNodeOptions.value = [];
  analysisTone.value = 'idle';
  analysisMessage.value = '';
  analysisWarning.value = '';
}

function buildNodeOptions(nodes: { id: string; classType: string; preview: string }[]) {
  return nodes.map(node => ({
    id: node.id,
    label: t('settings.comfyui.nodeOption', {
      id: node.id,
      type: node.classType || 'node',
      preview: node.preview || t('settings.comfyui.nodeEmptyPreview'),
    }),
  }));
}

/** 界面格式转不了时统一走这个「等着」状态，而不是报错 */
function setWaitingForServer() {
  textNodeOptions.value = [];
  analysisTone.value = 'pending';
  analysisMessage.value = t('settings.comfyui.analysisWaitingServer');
}

async function runAnalysis(silent: boolean) {
  const source = workflowDraft.value;
  if (!source.trim()) {
    textNodeOptions.value = [];
    if (!silent) {
      analysisTone.value = 'error';
      analysisMessage.value = t('settings.comfyui.analysisNoWorkflow');
      return;
    }
    analysisTone.value = 'idle';
    analysisMessage.value = '';
    analysisWarning.value = '';
    return;
  }

  analysisWarning.value = '';

  const format = detectComfyWorkflowFormat(source);
  if (format === 'invalid') {
    textNodeOptions.value = [];
    analysisTone.value = 'error';
    analysisMessage.value = t('settings.comfyui.analysisInvalidJson');
    return;
  }

  // 界面格式要先转成 API 格式：得靠 ComfyUI 的节点定义才能把参数对上号
  let apiSource = source;
  if (format === 'ui') {
    if (!comfyUi.value.baseUrl.trim()) {
      setWaitingForServer();
      return;
    }

    isAnalyzing.value = true;
    try {
      const objectInfo = await fetchComfyUiObjectInfo(comfyUi.value.baseUrl);
      const converted = convertUiWorkflowToApi(JSON.parse(source), objectInfo);
      if (!converted.ok) {
        textNodeOptions.value = [];
        analysisTone.value = 'error';
        analysisMessage.value =
          converted.error === 'workflow-unknown-nodes'
            ? t('settings.comfyui.analysisUnknownNodes')
            : t('settings.comfyui.analysisInvalidJson');
        return;
      }
      apiSource = JSON.stringify(converted.workflow);
      comfyUi.value.workflowApiJson = apiSource;
    } catch {
      // 连不上 ComfyUI 不算错——等它起来会自动重试
      setWaitingForServer();
      return;
    } finally {
      isAnalyzing.value = false;
    }
  } else {
    comfyUi.value.workflowApiJson = '';
  }

  const result = analyzeComfyWorkflow(apiSource);
  if (!result.ok) {
    textNodeOptions.value = [];
    analysisTone.value = 'error';
    analysisMessage.value =
      result.error === 'workflow-invalid-json'
        ? t('settings.comfyui.analysisInvalidJson')
        : t('settings.comfyui.analysisNoTextNode');
    return;
  }

  textNodeOptions.value = buildNodeOptions(result.textNodes);

  const knownIds = new Set(result.textNodes.map(node => node.id));
  const nextPositive = knownIds.has(comfyUi.value.positiveNodeId)
    ? comfyUi.value.positiveNodeId
    : result.positiveNodeId;
  const nextNegative = knownIds.has(comfyUi.value.negativeNodeId)
    ? comfyUi.value.negativeNodeId
    : result.negativeNodeId;

  comfyUi.value.positiveNodeId = nextPositive;
  comfyUi.value.negativeNodeId = nextNegative === nextPositive ? '' : nextNegative;

  analysisTone.value = 'ok';
  analysisMessage.value = t('settings.comfyui.analysisOk', {
    positive: nextPositive,
    negative: nextNegative || t('settings.comfyui.nodeNone'),
  });
  analysisWarning.value = result.hasSaveImage ? '' : t('settings.comfyui.warningNoSaveImage');
}

async function handleAnalyze() {
  commitWorkflow();
  await runAnalysis(false);
  if (analysisTone.value === 'ok') {
    notificationStore.success(t('settings.comfyui.analyzeDone'));
  }
}

function handleClearWorkflow() {
  workflowDraft.value = '';
  commitWorkflow();
  comfyUi.value.positiveNodeId = '';
  comfyUi.value.negativeNodeId = '';
  textNodeOptions.value = [];
  analysisTone.value = 'idle';
  analysisMessage.value = '';
  analysisWarning.value = '';
}

async function handleTestConnection() {
  const normalized = normalizeComfyUiBaseUrl(comfyUi.value.baseUrl);
  if (!normalized) {
    connectionTone.value = 'error';
    connectionMessage.value = t('settings.comfyui.urlRequired');
    return;
  }

  comfyUi.value.baseUrl = normalized;
  isTesting.value = true;
  try {
    const info = await fetchComfyUiServerInfo(normalized);
    connectionTone.value = 'ok';
    connectionMessage.value = t('settings.comfyui.connected', {
      version: info.comfyuiVersion,
      device: info.deviceName,
      vram: info.vramTotalMb,
    });
    // 连上了就顺手把一直等着转换的工作流转掉
    if (analysisTone.value === 'pending') {
      scheduleAnalysis(true);
    }
  } catch {
    connectionTone.value = 'error';
    connectionMessage.value = t('settings.comfyui.connectFailed');
  } finally {
    isTesting.value = false;
  }
}

const hasStoredWorkflow = computed(() => Boolean(comfyUi.value.workflowJson.trim()));

onMounted(() => {
  if (hasStoredWorkflow.value) {
    void runAnalysis(true);
  }
});
</script>

<style scoped>
.setting-card {
  padding: 14px;
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-fast),
    border-color var(--motion-fast),
    transform var(--motion-fast);
}

.setting-card:hover {
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
  transform: translateY(-1px);
}

.card-title {
  margin: 0 0 12px 0;
  font-size: var(--text-base);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title i {
  font-size: calc(14px * var(--ui-font-scale));
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 本地网络授权提示：一直可见，不藏在开关后面 */
.comfy-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 10px;
  padding: 9px 11px;
  border-radius: var(--radius-sm, 8px);
  background: color-mix(in srgb, var(--accent-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-warning) 34%, transparent);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
}

.comfy-notice > i {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--accent-warning);
}

.comfy-notice-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.comfy-notice p {
  margin: 0;
}

.comfy-notice-title {
  font-weight: 600;
  color: var(--text-primary);
}

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

.row-label.sm {
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  min-width: 28px;
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

.toggle-switch input:focus-visible + .toggle-track {
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.2);
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

.comfy-select {
  flex: 1;
  min-width: 0;
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

.comfy-actions {
  display: flex;
  gap: 8px;
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

.comfy-status--warn {
  color: var(--accent-warning);
}

.comfy-status--pending {
  color: var(--accent-primary);
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
  margin-bottom: 6px !important;
}
</style>
