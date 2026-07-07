<template>
  <div class="action-bar">
    <!-- 弹出选项层 -->
    <Transition name="slide-up">
      <div v-if="showOptions && options.length > 0" class="options-popup">
        <button
          v-for="(option, index) in options"
          :key="index"
          class="option-btn"
          :style="{ color: `var(--option-color-${(index % 4) + 1})` }"
          @click="handleOptionClick(option)"
        >
          {{ option.description }}
        </button>
      </div>
    </Transition>

    <!-- 输入区域（始终可见） -->
    <div class="input-container">
      <!-- 展开/收起按钮 -->
      <button
        v-if="options.length > 0"
        class="toggle-options-btn"
        :class="{ active: showOptions }"
        :title="showOptions ? t('actionBar.collapseOptions') : t('actionBar.expandOptions')"
        :disabled="isInputLocked"
        @click="toggleOptions"
      >
        <i :class="showOptions ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"></i>
        <span class="btn-text">{{ showOptions ? t('actionBar.collapse') : t('actionBar.options') }}</span>
      </button>

      <textarea
        ref="inputRef"
        v-model="inputText"
        class="input-field"
        :placeholder="t('actionBar.inputPlaceholder')"
        :disabled="isInputLocked"
        rows="1"
        @keydown.enter.exact.prevent="handleSend"
        @input="autoResize"
      ></textarea>
      <button
        class="send-btn"
        :class="{
          generating: isGenerating,
          'send-btn--phase-sync': isAssistantApiGenerating && !isMainApiGenerating,
        }"
        :title="isGenerating ? t('actionBar.cancelGeneration') : t('actionBar.sendMessage')"
        @click="handleSend"
      >
        <i :class="isGenerating ? 'fa-solid fa-stop' : 'fa-solid fa-paper-plane'"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import { useMessageActions } from '../../composables/useMessageActions';
import { useActionInputStore } from '../../stores/actionInput';
import { useMessagesStore } from '../../stores/messages';
import { useSettingsStore } from '../../stores/settings';
import { useNotificationStore } from '../../stores/notification';
import { cancelStandaloneLocalTurn, isStandaloneLocalTurnActive } from '../../utils/standaloneLocalTurn';

interface ActionOption {
  description: string;
  rawText: string;
}

const actionInputStore = useActionInputStore();
const { inputText } = storeToRefs(actionInputStore);
const { t } = useI18n();

const settingsStore = useSettingsStore();
const { actionOptionBehavior } = storeToRefs(settingsStore);
const notificationStore = useNotificationStore();

// textarea 引用，用于自动调整高度
const inputRef = ref<HTMLTextAreaElement | null>(null);

function autoResize() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function resetTextareaHeight() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
}

// 发送前自动保存状态（用于防止重复点击）
const isPreparingSend = ref(false);

const messageActions = useMessageActions();
// 消息状态 - 用于监听消息变化
const messagesStore = useMessagesStore();
const {
  lastMessageId: storeLastMessageId,
  messages,
  editingMessageId,
  editingDraftContent,
  hasRunningVariableUpdate,
  standaloneMainGenerationBusy,
  standaloneAssistantGenerationBusy,
} = storeToRefs(messagesStore);

// AI 生成状态 - 本地响应式状态
const isMainApiGenerating = computed(() => standaloneMainGenerationBusy.value);
// 辅助API生成状态
const isAssistantApiGenerating = computed(
  () => standaloneAssistantGenerationBusy.value || hasRunningVariableUpdate.value || busySources.value.size > 0,
);
// 综合生成状态：主API、辅助API、变量更新或发送前自动保存任一进行中时为 true。
// 注意：这里直接聚合三个原子状态，而不复用 store 的 isStandaloneGenerationLocked 派生属性。
// 因为经 storeToRefs 解构的深层 computed 在同一响应式批次内可能读到未及时重算的旧值，
// 导致主 API 忙碌（standaloneMainGenerationBusy=true）时按钮仍显示为闲置。
const isGenerating = computed(
  () =>
    standaloneMainGenerationBusy.value ||
    standaloneAssistantGenerationBusy.value ||
    hasRunningVariableUpdate.value ||
    busySources.value.size > 0 ||
    isPreparingSend.value,
);
const isInputLocked = computed(() => isGenerating.value);

// 控制选项展开状态
const showOptions = ref(false);

// 用于强制刷新 options 的响应式变量
const optionsRefreshKey = ref(0);

const options = computed(() => {
  // 依赖 refreshKey 来触发重新计算
  void optionsRefreshKey.value;
  // 同时依赖 messagesStore 的状态，确保消息变化时自动刷新
  void storeLastMessageId.value;
  void messages.value.length;
  return parseActionOptions();
});

async function runStandaloneAssistantTurn(text: string) {
  actionInputStore.clearInput();
  resetTextareaHeight();
  showOptions.value = false;

  try {
    await messageActions.sendStandaloneUserMessage(text, 'standalone_send');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage !== 'standalone_local_turn_aborted') {
      notificationStore.error(
        settingsStore.locale === 'en'
          ? `Standalone reply generation failed: ${errorMessage}`
          : `独立模式生成回复失败：${errorMessage}`,
      );
    }
  }
}

function toggleOptions() {
  showOptions.value = !showOptions.value;
}

function parseActionOptions(): ActionOption[] {
  const lastStandaloneMessage = messages.value
    .filter(message => message.role === 'assistant')
    .slice()
    .reverse()[0];

  if (!lastStandaloneMessage) return [];

  const actionOptions = (lastStandaloneMessage as typeof lastStandaloneMessage & { action_options?: string[] })
    .action_options;
  return (actionOptions ?? []).map(line => ({
    description: line.trim(),
    rawText: line,
  }));
}

// 辅助API事件监听器
let assistantApiStartedHandler: EventOnReturn | null = null;
let assistantApiCompletedHandler: EventOnReturn | null = null;

const BUSY_EVENT_SOURCES = new Set(['assistant_api', 'archive_save']);
const busySources = ref<Set<string>>(new Set());

function resolveBusyEventSource(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'source' in payload) {
    const source = (payload as { source?: unknown }).source;
    if (typeof source === 'string' && source.trim()) {
      return source;
    }
  }

  // 兼容旧版未携带 source 的事件
  return 'assistant_api';
}

function markBusySource(source: string) {
  busySources.value.add(source);
}

function clearBusySource(source: string) {
  busySources.value.delete(source);
}

function settleOrphanedVariableUpdates(reason: string): boolean {
  if (isStandaloneLocalTurnActive()) {
    return false;
  }

  const runningMessages = messagesStore.messages.filter(
    message => message.role === 'assistant' && message.variable_update_status === 'running',
  );

  if (runningMessages.length === 0) {
    return false;
  }

  runningMessages.forEach(message => {
    messagesStore.patchMessageRecord(message.message_id, {
      variable_update_status: 'failed',
      variable_update_warning:
        settingsStore.locale === 'en'
          ? 'Variable update did not finish cleanly and was auto-settled.'
          : '变量更新未正常收尾，已自动结束。',
    });
  });
  messagesStore.clearStandaloneGenerationBusy();
  console.warn(`[ActionBar] 已收口孤立的变量更新状态 reason=${reason} count=${runningMessages.length}`);
  return true;
}

/**
 * 刷新选项列表
 * 使用 nextTick 确保在 Vue 更新周期后执行
 */
async function refreshOptions() {
  await nextTick();
  optionsRefreshKey.value++;
}

// 监听 messagesStore 的消息变化，自动刷新选项
// 这比监听 MESSAGE_DELETED 事件更可靠，因为 deleteFromHere 直接操作 messagesStore
watch(
  () => messagesStore.messages.length,
  () => {
    console.info('[ActionBar] 检测到消息数量变化，刷新选项');
    refreshOptions();
  },
);

watch(
  [standaloneMainGenerationBusy, standaloneAssistantGenerationBusy, hasRunningVariableUpdate],
  ([mainBusy, assistantBusy, variableBusy]) => {
    if (!mainBusy && !assistantBusy && variableBusy) {
      const settled = settleOrphanedVariableUpdates('authority_busy_missing');
      if (settled) {
        return;
      }
    }

    if (!mainBusy && !assistantBusy && !variableBusy && busySources.value.size > 0) {
      console.info('[ActionBar] 权威忙碌状态均已结束，清理残留 busySources');
      busySources.value.clear();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (typeof eventOn !== 'function') {
    return;
  }

  // 方案A：监听辅助API/存档事件
  assistantApiStartedHandler = eventOn('assistant_api_started', (payload: unknown) => {
    const source = resolveBusyEventSource(payload);
    if (!BUSY_EVENT_SOURCES.has(source)) {
      return;
    }

    console.info(`[ActionBar] 收到 assistant_api_started 事件 source=${source}，禁用发送按钮`);
    markBusySource(source);
  });
  assistantApiCompletedHandler = eventOn('assistant_api_completed', (payload: unknown) => {
    const source = resolveBusyEventSource(payload);
    if (!BUSY_EVENT_SOURCES.has(source)) {
      return;
    }

    console.info(`[ActionBar] 收到 assistant_api_completed 事件 source=${source}，启用发送按钮`);
    clearBusySource(source);
  });
});

onUnmounted(() => {
  assistantApiStartedHandler?.stop();
  assistantApiCompletedHandler?.stop();

  busySources.value.clear();
});

function handleOptionClick(option: ActionOption) {
  // 过滤掉]之前的内容（包括]本身）
  const text = option.description.includes(']') ? option.description.split(']')[1].trim() : option.description;

  // 根据配置选择追加或替换
  if (actionOptionBehavior.value === 'append') {
    actionInputStore.appendInputText(text);
  } else {
    actionInputStore.setInputText(text);
  }

  // 追加后触发 textarea 自动调整高度
  nextTick(() => {
    autoResize();
  });

  // 点击选项后自动收起
  showOptions.value = false;
}

async function preSendAutoSaveEditing(): Promise<boolean> {
  const messageId = editingMessageId.value;
  if (messageId === null) {
    return true;
  }

  try {
    isPreparingSend.value = true;
    const saved = await messageActions.editMessage(messageId, editingDraftContent.value);

    if (!saved) {
      toastr.error(t('actionBar.editSaveFailed'));
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ActionBar] 发送前自动保存编辑内容失败:', error);
    toastr.error(t('actionBar.editSaveFailed'));
    return false;
  } finally {
    isPreparingSend.value = false;
  }
}

async function handleSend() {
  if (isGenerating.value) {
    await cancelGeneration();
    return;
  }

  const text = inputText.value.trim();

  if (!text) return;

  // 发送前：若存在任意楼层编辑中，先自动保存
  const readyToSend = await preSendAutoSaveEditing();
  if (!readyToSend) return;

  // 二次检查：防止自动保存期间状态变化导致并发发送
  if (isGenerating.value) {
    await cancelGeneration();
    return;
  }

  await runStandaloneAssistantTurn(text);
}

async function cancelGeneration() {
  cancelStandaloneLocalTurn();
  isPreparingSend.value = false;
  busySources.value.clear();
  settleOrphanedVariableUpdates('manual_cancel');

  console.info('[ActionBar] 已取消独立页本地生成');

  if (inputText.value.trim()) {
    toastr.info(t('actionBar.generationCancelledCanResend'));
  }
}
</script>

<style scoped>
/* ===== ActionBar - 玻璃拟态底栏 ===== */
.action-bar {
  position: relative;
  background: var(--card-bg-strong);
  background-image: var(--card-sheen);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--card-border);
  box-shadow: 0 -14px 34px rgba(15, 23, 42, 0.08);
}

/* 顶部渐变装饰线 */
.action-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--gradient-primary);
  opacity: 0.4;
}

.action-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 42%);
}

/* ===== 弹出选项层 - 玻璃拟态 ===== */
.options-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-bottom: none;
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  box-shadow: 0 -14px 36px rgba(15, 23, 42, 0.12);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  max-height: 200px;
  overflow-y: auto;
  z-index: 20;
  overflow: hidden auto;
}

.option-btn {
  width: 100%;
  padding: 11px 16px;
  border: none;
  border-bottom: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-base);
  font-size: var(--text-sm);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-normal);
  line-height: 1.4;
  position: relative;
  overflow: hidden;
}

/* 选项悬停 - 左侧彩色指示条 */
.option-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: currentColor;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.option-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 48%);
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.option-btn:hover {
  background: var(--gradient-subtle);
  padding-left: 20px;
}

.option-btn:hover::before {
  opacity: 0.6;
}

.option-btn:hover::after {
  opacity: 1;
}

.option-btn:active:not(:disabled) {
  transform: scale(0.99);
}

/* ===== 弹出动画 - 增强 ===== */
.slide-up-enter-active {
  transition: all 300ms var(--ease-out-expo);
}

.slide-up-leave-active {
  transition: all 200ms var(--ease-spring);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ===== 输入容器 ===== */
.input-container {
  display: flex;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  align-items: flex-end;
}

/* ===== 展开按钮 - 渐变活跃态 ===== */
.toggle-options-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
  border: none;
  background: var(--control-bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  border-right: 1px solid var(--border-light);
  font-size: var(--text-xs);
  font-family: var(--font-base);
  white-space: nowrap;
}

.toggle-options-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--control-bg));
  box-shadow: inset -1px 0 0 rgba(var(--accent-primary-rgb), 0.08);
}

.toggle-options-btn.active {
  background: color-mix(in srgb, var(--accent-primary) 16%, var(--control-bg));
  color: var(--accent-primary);
  border-right-color: rgba(var(--accent-primary-rgb), 0.18);
  box-shadow: inset -1px 0 0 rgba(var(--accent-primary-rgb), 0.1);
}

.toggle-options-btn i {
  font-size: 12px;
  transition: transform var(--transition-spring);
}

.toggle-options-btn.active i {
  transform: rotate(180deg);
}

.btn-text {
  font-weight: 500;
}

/* ===== 输入框 ===== */
.input-field {
  flex: 1;
  padding: 13px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-base);
  font-size: var(--text-sm);
  outline: none;
  resize: none;
  overflow-y: auto;
  line-height: 1.4;
  max-height: 120px;
  min-height: unset;
  box-sizing: border-box;
  transition:
    background var(--transition-normal),
    color var(--transition-fast);
}

.input-field:focus {
  background: linear-gradient(
    180deg,
    rgba(var(--accent-primary-rgb), 0.035) 0%,
    rgba(var(--accent-primary-rgb), 0.015) 100%
  );
}

.input-field::placeholder {
  color: var(--text-tertiary);
  transition: color var(--transition-normal);
}

.input-field:focus::placeholder {
  color: rgba(var(--accent-primary-rgb), 0.3);
}

/* ===== 发送按钮 - 渐变 + 发光 ===== */
.send-btn {
  min-width: 52px;
  padding: 12px 16px;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.14);
  background: var(--gradient-primary);
  color: white;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.12);
}

.send-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.send-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, transparent 44%);
  opacity: 0.82;
  pointer-events: none;
}

.send-btn:hover:not(:disabled) {
  box-shadow: 0 12px 28px rgba(var(--accent-primary-rgb), 0.24);
  transform: translateY(-1px);
}

.send-btn:hover:not(:disabled)::after {
  opacity: 1;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn i {
  position: relative;
  z-index: 1;
  transition: transform var(--transition-spring);
}

.send-btn:hover:not(:disabled) i {
  transform: translateX(1px) translateY(-1px);
}

/* 发送按钮生成中状态（取消按钮） */
.send-btn.generating {
  background: color-mix(in srgb, var(--accent-danger) 88%, white 12%);
  cursor: pointer;
}

.send-btn.send-btn--phase-sync {
  background: color-mix(in srgb, var(--accent-primary) 82%, white 18%);
}

.send-btn.generating:hover {
  box-shadow: 0 12px 28px rgba(var(--accent-danger-rgb), 0.24);
}

.send-btn.send-btn--phase-sync:hover {
  box-shadow: 0 12px 28px rgba(var(--accent-primary-rgb), 0.24);
}

.send-btn:disabled {
  opacity: 0.6;
}

/* 输入框禁用状态 */
.input-field:disabled {
  background: rgba(var(--accent-primary-rgb), 0.02);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

/* 展开按钮禁用状态 */
.toggle-options-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .toggle-options-btn {
    padding: 10px 10px;
  }

  .toggle-options-btn .btn-text {
    display: none;
  }

  .option-btn {
    padding: 8px 10px;
    font-size: var(--text-xs);
    line-height: 1.3;
  }

  .input-field {
    padding: 10px 12px;
    font-size: var(--text-xs);
  }

  .send-btn {
    padding: 10px 12px;
  }
}
</style>
