<template>
  <div class="action-bar">
    <!-- 弹出选项层 -->
    <Transition name="slide-up">
      <div v-if="showOptions && options.length > 0" class="options-popup">
        <button
          v-for="(option, index) in options"
          :key="index"
          class="option-btn"
          :style="{ '--oc': `var(--option-color-${(index % 4) + 1})` }"
          @click="handleOptionClick(option)"
        >
          <!-- 身份色只给编号，正文保持常规色，悬停时才染上 -->
          <span class="option-no">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="option-text">{{ option.description }}</span>
        </button>
      </div>
    </Transition>

    <!-- 输入区（始终可见） -->
    <div class="input-container">
      <!-- 选项开关：方形辅助键 -->
      <button
        v-if="options.length > 0"
        class="aux-btn"
        :class="{ active: showOptions }"
        :title="showOptions ? t('actionBar.collapseOptions') : t('actionBar.expandOptions')"
        :disabled="isInputLocked"
        @click="toggleOptions"
      >
        <i :class="showOptions ? 'ti ti-chevron-down' : 'ti ti-list'"></i>
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
        <i :class="isGenerating ? 'ti ti-player-stop' : 'ti ti-player-play'"></i>
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
/* ===== ActionBar · 阶段2：无框输入栏 =====
   分区照参照站：方形辅助键 / 无框输入线 / 圆角方块发送键。
   去掉了原来的渐变装饰线、白色高光层、实心渐变发送按钮和圆角。
   颜色一律走皮肤变量（ui-tokens.css），换主题自动跟着变。 */

.action-bar {
  position: relative;
  background: var(--ui-panel);
  border-top: 1px solid var(--ui-line-soft);
  /* 跟正文列严格对齐：同样的最宽限制 + 居中。
     正文列在 ContentText.vue、横幅在 SceneBanner.vue 里用的也都是 var(--ui-reading-w)。
     ⚠️ width: 100% 不能省 —— 手机布局下 .layout-footer 是 flex column，
        光有 max-width + margin:0 auto 的话，flex item 会被 auto margin 抵消 stretch，
        整条输入栏缩到内容宽度（实测 500 视口下只剩 221px）。 */
  width: 100%;
  max-width: var(--ui-reading-w, 750px);
  margin: 0 auto;
}

/* ===== 弹出选项层 ===== */
.options-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--ui-panel);
  border: 1px solid var(--ui-line-soft);
  border-bottom: none;
  box-shadow: none;
  /* 选项改成圆角块后要留一点内缩，不然圆角会贴着直边 */
  padding: var(--ui-space-1);
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-1);
  max-height: 220px;
  overflow: hidden auto;
  z-index: 20;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: var(--ui-space-3);
  width: 100%;
  flex: 0 0 auto;
  padding: var(--ui-space-3) var(--ui-space-4);
  border: none;
  border-radius: var(--ui-radius-md);
  background: transparent;
  color: var(--ui-text);
  font-family: var(--font-base);
  font-size: calc(var(--ui-fs-opt) * var(--ui-font-scale));
  font-weight: 400;
  letter-spacing: 0.02em;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    padding-left var(--transition-fast);
}

/* 选项身份色：彩色编号取代原来的左侧竖条 + 底部分隔线 */
.option-no {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--oc, var(--ui-dim));
}

.option-text {
  flex: 1;
  min-width: 0;
  line-height: 1.45;
}

.option-btn:hover {
  background: var(--ui-surface-2);
  padding-left: var(--ui-space-5);
}

.option-btn:hover .option-text {
  color: var(--oc, var(--ui-text));
}

.option-btn:active:not(:disabled) {
  background: var(--ui-surface-2);
}

/* ===== 弹出动画 ===== */
.slide-up-enter-active {
  transition: all 260ms var(--ease-out-expo);
}

.slide-up-leave-active {
  transition: all 180ms var(--ease-spring);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ===== 输入行 ===== */
.input-container {
  display: flex;
  /* 输入框会随内容长高，按钮贴底才不会跟着往上飘 */
  align-items: flex-end;
  gap: 12px;
  /* 左右内边距跟正文列一致（ContentText 的 .reading-column 也是 18px），
     这样输入框左边缘跟正文文字严格对齐。 */
  padding: 8px 18px;
  background: transparent;
}

/* 辅助键：跟输入框同一套实心块（原来只有 1px 描边、透明底，
   在实心输入框旁边看着像两种风格） */
.aux-btn {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--ui-radius-md);
  background: var(--ui-surface-2);
  color: var(--ui-muted);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.aux-btn:hover {
  color: var(--ui-accent);
  background: var(--ui-surface-3);
}

.aux-btn.active {
  color: var(--ui-on-accent);
  background: var(--ui-accent);
}

.aux-btn i {
  font-size: calc(12px * var(--ui-font-scale));
}

/* 输入区：圆角实心框 —— 跟消息卡片同一套「半透明层」语言。
   原来是底边一条 1px 下划线，那是旧硬边风格的残留。 */
.input-field {
  flex: 1;
  min-width: 0;
  min-height: 36px;
  padding: var(--ui-space-2) var(--ui-space-3);
  border: none;
  border-radius: var(--ui-radius-md);
  background: var(--ui-surface-2);
  color: var(--ui-text);
  font-family: var(--font-base);
  font-size: calc(var(--ui-fs-input) * var(--ui-font-scale));
  letter-spacing: 0.06em;
  outline: none;
  resize: none;
  overflow-y: auto;
  line-height: 1.4;
  max-height: 120px;
  box-sizing: border-box;
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

/* 聚焦：底色提一档 + 一圈强调色光晕，不用描边 */
.input-field:focus {
  background: var(--ui-surface-3);
  box-shadow: 0 0 0 2px var(--ui-accent-soft);
}

.input-field::placeholder {
  color: var(--ui-dim);
  transition: color var(--transition-normal);
}

.input-field:focus::placeholder {
  color: var(--ui-muted);
}

/* 发送键：圆角方块，跟旁边的辅助键同款圆角（--ui-radius-md）。
   填充风格不同是故意的 —— 辅助键是中性实心块，发送键描边 + hover 填充强调色，主次才分得开 */
.send-btn {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-accent);
  border-radius: var(--ui-radius-md);
  background: transparent;
  color: var(--ui-accent);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.send-btn:hover:not(:disabled) {
  background: var(--ui-accent);
  color: var(--ui-on-accent);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.send-btn i {
  font-size: calc(13px * var(--ui-font-scale));
}

/* 生成中 = 取消键 */
.send-btn.generating {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
  background: transparent;
}

.send-btn.generating:hover:not(:disabled) {
  background: var(--accent-danger);
  color: var(--ui-on-accent);
}

.send-btn.send-btn--phase-sync {
  border-color: var(--ui-accent);
  color: var(--ui-accent);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 禁用态 */
.input-field:disabled {
  color: var(--ui-dim);
  cursor: not-allowed;
}

.aux-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 响应式 ===== */
/* 左右留白三档，跟横幅（SceneBanner .banner-slot）和正文列（ContentText .reading-column）
   逐档对齐 —— 输入栏、正文、横幅的内容边缘才会严格在一条线上 */
@media (max-width: 1023px) {
  .input-container {
    padding: 8px 14px;
  }
}

@media (max-width: 768px) {
  .input-container {
    gap: 8px;
    padding: 6px 12px;
  }

  /* 手指点得中：撑高一点；字号仍走缩放系数，不写死 */
  .option-btn {
    padding: var(--ui-space-3);
    font-size: calc(12px * var(--ui-font-scale));
  }

  .input-field {
    font-size: calc(12px * var(--ui-font-scale));
  }

  .send-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .aux-btn {
    width: 32px;
    height: 32px;
  }
}
</style>
