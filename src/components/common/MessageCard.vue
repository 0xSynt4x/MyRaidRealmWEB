<template>
  <div
    class="message"
    :class="[
      `${message.role}-message`,
      {
        'message--streaming': Boolean(message.is_streaming),
        'message--partial': Boolean(message.is_partial),
      },
    ]"
    :data-message-id="message.message_id"
  >
    <!-- 消息头部 -->
    <div class="message-header">
      <div class="floor-info">
        <span class="floor-text">{{ floorText }}</span>
      </div>

      <div v-if="streamStateLabel || variableUpdateStatusInfo" class="message-meta">
        <span v-if="streamStateLabel" class="stream-state-badge">{{ streamStateLabel }}</span>
        <span
          v-if="variableUpdateStatusInfo"
          class="phase-state-badge"
          :class="`phase-state-badge--${variableUpdateStatusInfo.tone}`"
        >
          {{ variableUpdateStatusInfo.label }}
        </span>
      </div>

      <div class="message-actions">
        <!-- 编辑按钮（用户和AI楼层都有） -->
        <button class="btn-action btn-edit" :title="t('messageCard.editMessage')" @click="handleEdit">
          <i class="fa fa-edit"></i>
        </button>

        <!-- 用户楼层：重新发送按钮 -->
        <button
          v-if="message.role === 'user'"
          class="btn-action btn-resend"
          :title="t('messageCard.resend')"
          :disabled="actionsDisabled"
          @click="handleResend"
        >
          <i class="fa fa-paper-plane"></i>
        </button>

        <!-- AI楼层：重新生成按钮 -->
        <button
          v-if="message.role === 'assistant'"
          class="btn-action btn-regenerate"
          :title="t('messageCard.regenerate')"
          :disabled="actionsDisabled"
          @click="handleRegenerate"
        >
          <i class="fa fa-refresh"></i>
        </button>

        <!-- 删除按钮（所有楼层都有） -->
        <button
          class="btn-action btn-delete"
          :title="t('messageCard.deleteMessage')"
          :disabled="actionsDisabled"
          @click="handleDelete"
        >
          <i class="fa fa-trash"></i>
        </button>
      </div>
    </div>

    <!-- 消息内容 -->
    <div v-if="!isEditing" class="message-content" :data-size="settingsStore.contentFontSize">
      <template v-if="message.role === 'assistant'">
        <details v-if="thinkFormatted" class="fold-block">
          <summary class="fold-title">
            {{ t('messageCard.thinking') }}
            <span v-if="message.is_streaming" class="inline-stream-indicator">{{ t('messageCard.streaming') }}</span>
            <span v-else-if="message.is_partial" class="inline-stream-indicator inline-stream-indicator--partial">{{
              t('messageCard.partial')
            }}</span>
          </summary>
          <div class="fold-body fold-body--compact text-content" v-html="thinkFormatted"></div>
        </details>
      </template>

      <div v-if="message.is_partial" class="partial-banner">{{ t('messageCard.partialBanner') }}</div>
      <div class="text-content" v-html="message.formatted"></div>

      <template v-if="message.role === 'assistant'">
        <details v-if="summaryFormatted" class="fold-block">
          <summary class="fold-title">
            {{ t('messageCard.summary') }}
            <span v-if="message.is_streaming" class="inline-stream-indicator">{{ t('messageCard.streaming') }}</span>
            <span v-else-if="message.is_partial" class="inline-stream-indicator inline-stream-indicator--partial">{{
              t('messageCard.partial')
            }}</span>
          </summary>
          <div class="fold-body fold-body--compact text-content" v-html="summaryFormatted"></div>
        </details>

        <details v-if="showVariableUpdateSection" class="fold-block">
          <summary class="fold-title">
            {{ t('messageCard.variableUpdate') }}
            <span
              v-if="variableUpdateStatusInfo"
              class="inline-phase-indicator"
              :class="`inline-phase-indicator--${variableUpdateStatusInfo.tone}`"
            >
              {{ variableUpdateStatusInfo.label }}
            </span>
            <span v-if="message.is_streaming" class="inline-stream-indicator">{{ t('messageCard.streaming') }}</span>
            <span v-else-if="message.is_partial" class="inline-stream-indicator inline-stream-indicator--partial">{{
              t('messageCard.partial')
            }}</span>
          </summary>
          <div class="fold-body fold-body--compact">
            <p v-if="variableUpdateStatusInfo?.hint" class="variable-update-hint">
              {{ variableUpdateStatusInfo.hint }}
            </p>
            <p v-if="message.variable_update_warning" class="variable-update-warning">
              <span class="variable-update-warning-label">{{ t('messageCard.variableUpdateReason') }}:</span>
              <span>{{ message.variable_update_warning }}</span>
            </p>
            <div v-if="updateFormatted" class="text-content" v-html="updateFormatted"></div>
          </div>
        </details>
      </template>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="edit-container">
      <textarea
        ref="textareaRef"
        v-model="editContent"
        class="edit-textarea"
        rows="1"
        @input="handleEditInput"
        @keydown.escape="handleCancelEdit"
        @keydown.ctrl.enter="handleSaveEdit"
      ></textarea>
      <div class="edit-buttons">
        <button class="btn-action btn-save" :title="t('messageCard.saveEdit')" @click="handleSaveEdit">
          <i class="fa fa-check"></i>
        </button>
        <button class="btn-action btn-cancel" :title="t('messageCard.cancelEdit')" @click="handleCancelEdit">
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useMessageActions } from '../../composables/useMessageActions';
import { useI18n } from '../../i18n';
import type { MessageRecord } from '../../stores/messages';
import { useMessagesStore } from '../../stores/messages';
import { useSettingsStore } from '../../stores/settings';
import { useStatDataStore } from '../../stores/statData';
import { formatAuxiliaryContentForDisplay } from '../../utils/messageFormatting';
import { parseTaggedAssistantReply } from '../../utils/taggedReply';

const props = defineProps<{
  message: MessageRecord;
}>();

const messagesStore = useMessagesStore();
const actions = useMessageActions();
const statDataStore = useStatDataStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const actionsDisabled = computed(() => messagesStore.isStandaloneGenerationLocked);

const thinkFormatted = computed(() => {
  if (props.message.role !== 'assistant') return '';
  const content = props.message.think_content?.trim();
  if (!content) return '';
  return formatAuxiliaryContentForDisplay(content, props.message.message_id);
});

const summaryFormatted = computed(() => {
  if (props.message.role !== 'assistant') return '';
  const content = props.message.summary_content?.trim();
  if (!content) return '';
  return formatAuxiliaryContentForDisplay(content, props.message.message_id);
});

const streamStateLabel = computed(() => {
  if (props.message.role !== 'assistant') return '';
  if (props.message.is_streaming) return t('messageCard.streamingWithDots');
  if (props.message.is_partial) return t('messageCard.partialPreview');
  return '';
});

const variableUpdateStatusInfo = computed<null | {
  label: string;
  hint: string;
  tone: 'info' | 'success' | 'danger' | 'neutral';
}>(() => {
  if (props.message.role !== 'assistant') return null;

  switch (props.message.variable_update_status) {
    case 'running':
      return {
        label: t('messageCard.variableUpdateStatusRunning'),
        hint: t('messageCard.variableUpdateHintRunning'),
        tone: 'info',
      };
    case 'success':
      return {
        label: t('messageCard.variableUpdateStatusSuccess'),
        hint: t('messageCard.variableUpdateHintSuccess'),
        tone: 'success',
      };
    case 'failed':
      return {
        label: t('messageCard.variableUpdateStatusFailed'),
        hint: t('messageCard.variableUpdateHintFailed'),
        tone: 'danger',
      };
    case 'skipped':
      return {
        label: t('messageCard.variableUpdateStatusSkipped'),
        hint: t('messageCard.variableUpdateHintSkipped'),
        tone: 'neutral',
      };
    default:
      return null;
  }
});

/**
 * 简易 JSON 语法高亮：将 JSON 字符串转换为带颜色 span 的 HTML
 */
function highlightJson(json: string): string {
  // 转义 HTML 特殊字符
  const escapeHtml = (s: string) => s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');

  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([[\]{}])|([,:])/g,
    (match, str?: string, colon?: string, bool?: string, num?: string, bracket?: string, punct?: string) => {
      if (str) {
        const escaped = escapeHtml(str);
        if (colon) {
          // JSON key
          return `<span class="json-key">${escaped}</span><span class="json-punct">:</span>`;
        }
        // JSON string value
        return `<span class="json-string">${escaped}</span>`;
      }
      if (bool) return `<span class="json-bool">${escapeHtml(bool)}</span>`;
      if (num) return `<span class="json-number">${escapeHtml(num)}</span>`;
      if (bracket) return `<span class="json-bracket">${escapeHtml(bracket)}</span>`;
      if (punct) return `<span class="json-punct">${escapeHtml(punct)}</span>`;
      return escapeHtml(match);
    },
  );
}

const updateFormatted = computed(() => {
  if (props.message.role !== 'assistant') return '';
  const content = props.message.update_content?.trim();
  if (!content) return '';

  const parsedReply = parseTaggedAssistantReply(props.message.raw_content);

  let html = '';

  // 分析部分：复用独立页的辅助内容格式化
  if (parsedReply.updateAnalysis?.trim()) {
    const analysisMarkdown = `**${t('messageCard.analysis')}:**\n${parsedReply.updateAnalysis.trim()}`;
    html += formatAuxiliaryContentForDisplay(analysisMarkdown, props.message.message_id);
  }

  // JSON 部分：使用自定义语法高亮
  if (parsedReply.updateJsonPatchText?.trim()) {
    const highlighted = highlightJson(parsedReply.updateJsonPatchText.trim());
    html += `<pre class="json-highlight"><code>${highlighted}</code></pre>`;
  }

  // fallback：都没匹配到时使用原始内容
  if (!html) {
    html = formatAuxiliaryContentForDisplay(content, props.message.message_id);
  }

  return html;
});

const showVariableUpdateSection = computed(() => {
  if (props.message.role !== 'assistant') return false;
  return Boolean(updateFormatted.value || variableUpdateStatusInfo.value || props.message.variable_update_warning);
});

// 楼层文本（简化格式：#楼层号+图标+名称）
const floorText = computed(() => {
  if (props.message.role === 'user') {
    // 从本地状态读取玩家姓名
    const playerName = statDataStore.data.玩家.姓名 || t('messageCard.player');
    return `#${props.message.message_id}👤 ${playerName}`;
  }
  return `#${props.message.message_id}😺 ${t('messageCard.ai')}`;
});

// 编辑状态
const isEditing = computed(() => messagesStore.isEditing(props.message.message_id));
const editContent = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function resizeEditTextarea() {
  const textarea = textareaRef.value;
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

// 监听编辑状态变化，初始化编辑内容
watch(isEditing, editing => {
  if (editing) {
    // 如果是 AI 消息，编辑 content_text；如果是用户消息，编辑 raw_content（两者相同）
    editContent.value = props.message.content_text;
    nextTick(() => {
      resizeEditTextarea();
      textareaRef.value?.focus();
      textareaRef.value?.select();
    });
  }
});

watch(editContent, content => {
  if (isEditing.value) {
    messagesStore.setEditingDraftContent(content);
  }
});

// 事件处理
function handleEdit() {
  actions.startEdit(props.message.message_id);
}

function handleDelete() {
  actions.deleteFromHere(props.message.message_id);
}

function handleRegenerate() {
  actions.regenerate(props.message.message_id);
}

async function handleResend() {
  // 若当前楼层正在编辑，先应用编辑内容，再执行重新发送
  if (isEditing.value) {
    const saved = await actions.editMessage(props.message.message_id, editContent.value);
    if (!saved) {
      toastr.error(t('messageCard.editSaveFailed'));
      return;
    }
  }

  await actions.resend(props.message.message_id);
}

async function handleSaveEdit() {
  await actions.editMessage(props.message.message_id, editContent.value);
}

function handleCancelEdit() {
  actions.cancelEdit();
}

function handleEditInput() {
  resizeEditTextarea();
}
</script>

<style scoped>
/* ===== 消息卡片 - 增强玻璃拟态 ===== */
.message {
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
  animation: messageSlideIn 0.5s var(--ease-out-expo) forwards;
}

.message--streaming {
  border-color: rgba(var(--accent-success-rgb), 0.28);
}

.message--partial {
  border-color: rgba(251, 191, 36, 0.28);
}

/* 消息入场动画 - 增强 */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message:hover {
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-2px);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 用户消息样式 - 蓝色玻璃 */
.user-message {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-primary-rgb), 0.05) 0%,
    rgba(var(--accent-primary-rgb), 0.02) 100%
  );
  border-color: rgba(var(--accent-primary-rgb), 0.08);
}

.user-message .message-header {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-primary-rgb), 0.88) 0%,
    rgba(var(--accent-primary-rgb), 0.72) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: white;
}

/* AI消息样式 - 绿色玻璃 */
.assistant-message {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-success-rgb), 0.05) 0%,
    rgba(var(--accent-success-rgb), 0.02) 100%
  );
  border-color: rgba(var(--accent-success-rgb), 0.08);
}

.assistant-message .message-header {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-success-rgb), 0.88) 0%,
    rgba(var(--accent-success-rgb), 0.72) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: white;
}

.message--streaming.assistant-message .message-header {
  background: linear-gradient(135deg, rgba(var(--accent-success-rgb), 0.98) 0%, rgba(52, 211, 153, 0.84) 100%);
}

.message--partial.assistant-message .message-header {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.9) 0%, rgba(217, 119, 6, 0.84) 100%);
}

/* 消息头部 */
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  gap: 8px;
}

.floor-info {
  display: flex;
  align-items: center;
  min-width: 0;
}

.floor-text {
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.stream-state-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.phase-state-badge,
.inline-phase-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.phase-state-badge--info,
.inline-phase-indicator--info {
  background: var(--tag-status-info-bg);
  border-color: var(--tag-status-info-border);
  color: var(--tag-status-info-text);
}

.phase-state-badge--success,
.inline-phase-indicator--success {
  background: var(--tag-status-success-bg);
  border-color: var(--tag-status-success-border);
  color: var(--tag-status-success-text);
}

.phase-state-badge--danger,
.inline-phase-indicator--danger {
  background: var(--tag-status-danger-bg);
  border-color: var(--tag-status-danger-border);
  color: var(--tag-status-danger-text);
}

.phase-state-badge--neutral,
.inline-phase-indicator--neutral {
  background: var(--tag-status-neutral-bg);
  border-color: var(--tag-status-neutral-border);
  color: var(--tag-status-neutral-text);
}

/* 操作按钮 - 微交互动画 */
.message-actions {
  display: flex;
  gap: 6px;
}

.message-actions button {
  width: max(26px, var(--touch-target-min));
  height: max(26px, var(--touch-target-min));
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  transition: all var(--motion-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 涟漪效果背景 */
.message-actions button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.4s ease;
}

.message-actions button:hover::before {
  opacity: 1;
  transform: scale(2);
}

.message-actions button:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.25);
}

.message-actions button:active {
  transform: scale(0.95);
}

.message-actions button i {
  font-size: 14px;
  position: relative;
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-actions button:hover i {
  transform: scale(1.1);
}

/* 重新发送按钮 - 飞出动画 */
.btn-resend:hover {
  background: rgba(59, 130, 246, 0.5) !important;
}

.btn-resend:hover i {
  animation: fly 0.4s ease-out;
}

@keyframes fly {
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(3px, -3px);
  }
  100% {
    transform: translate(0, 0);
  }
}

/* 重新生成按钮 - 旋转动画 */
.btn-regenerate:hover {
  background: rgba(16, 185, 129, 0.5) !important;
}

.btn-regenerate:hover i {
  animation: spin 0.6s ease-in-out;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 删除按钮特殊样式 */
.btn-delete:hover {
  background: rgba(239, 68, 68, 0.5) !important;
}

/* 编辑按钮特殊样式 */
.btn-edit:hover {
  background: rgba(251, 191, 36, 0.5) !important;
}

/* 消息内容 */
.message-content {
  padding: 16px;
  font-family: var(--font-base);
  font-size: var(--text-base);
  line-height: var(--line-height-base);
  color: var(--text-primary);
  white-space: normal;
  word-break: break-word;
}

.message-content[data-size='1'] {
  font-size: 13px;
}

.message-content[data-size='2'] {
  font-size: 14px;
}

.message-content[data-size='3'] {
  font-size: 16px;
}

.message-content[data-size='4'] {
  font-size: 18px;
}

.message-content[data-size='5'] {
  font-size: 20px;
}

.partial-banner {
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.24);
  color: #b45309;
  font-size: 12px;
  font-weight: 600;
}

.inline-stream-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--accent-success-rgb), 0.12);
  color: var(--accent-success);
  font-size: 11px;
  font-weight: 700;
}

.inline-stream-indicator--partial {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.variable-update-hint,
.variable-update-warning {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  line-height: 1.45;
}

.variable-update-hint {
  color: var(--text-secondary);
}

.variable-update-warning {
  color: var(--tag-status-danger-text);
}

.variable-update-warning-label {
  font-weight: 700;
}

/* 折叠区块 - 玻璃拟态 */
.fold-block {
  margin-bottom: 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--card-border);
  border-left: 3px solid var(--accent-primary);
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  overflow: hidden;
  transition: border-color var(--motion-normal);
}

.fold-block:hover {
  border-left-color: var(--accent-secondary);
}

.fold-block:last-child {
  margin-bottom: 0;
}

.text-content + .fold-block {
  margin-top: 10px;
}

.fold-title {
  cursor: pointer;
  padding: 4px 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-primary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.fold-title::marker {
  color: var(--accent-primary);
}

.fold-block[open] .fold-title {
  color: var(--accent-primary);
}

.fold-body {
  padding: 4px 8px 6px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-primary);
}

/* 折叠展开正文紧凑化：仅作用于思考过程/小总结/变量更新 */
.fold-body--compact {
  font-size: 0.875em;
  line-height: 1.2;
}

.fold-body--compact :deep(p),
.fold-body--compact :deep(li) {
  line-height: 1.2;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.fold-body--compact :deep(ul),
.fold-body--compact :deep(ol) {
  margin-top: 0.35em;
  margin-bottom: 0.35em;
}

.fold-body--compact :deep(pre),
.fold-body--compact :deep(code),
.fold-body--compact :deep(table),
.fold-body--compact :deep(blockquote),
.fold-body--compact :deep(.json-highlight) {
  font-size: inherit;
  line-height: 1.2;
}

/* 编辑模式样式 - 发光边框 */
.edit-container {
  padding: 12px 16px;
}

.edit-textarea {
  width: 100%;
  min-height: 44px;
  padding: 12px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  color: var(--text-primary);
  font-family: var(--font-base);
  font-size: var(--text-base);
  line-height: 1.5;
  resize: none;
  overflow-y: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  box-sizing: border-box;
  transition: all var(--motion-fast);
}

.edit-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.48);
  box-shadow: var(--control-focus-ring), var(--glow-primary);
}

/* 编辑按钮 - 纯图标微交互 */
.edit-buttons {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}

.edit-buttons button {
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.edit-buttons button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transform: scale(0);
  transition: all 0.4s ease;
}

.edit-buttons button:hover::before {
  opacity: 1;
  transform: scale(2);
}

.edit-buttons button i {
  font-size: 18px;
  position: relative;
  z-index: 1;
}

.edit-buttons button:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.edit-buttons button:active {
  transform: scale(0.95);
}

.btn-save {
  background: var(--gradient-success) !important;
  color: white !important;
}

.btn-save:hover {
  box-shadow: var(--glow-success) !important;
}

.btn-cancel {
  background: linear-gradient(135deg, var(--text-secondary) 0%, var(--text-tertiary) 100%) !important;
  color: white !important;
}

.btn-cancel:hover {
  opacity: 0.85;
}

/* 暗色主题适配 - 增强发光 */
:global([data-theme='dark']) .message {
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global([data-theme='dark']) .message:hover {
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
}

:global([data-theme='dark']) .user-message {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-primary-rgb), 0.1) 0%,
    rgba(var(--accent-primary-rgb), 0.03) 100%
  );
}

:global([data-theme='dark']) .user-message .message-header {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-primary-rgb), 0.92) 0%,
    rgba(var(--accent-primary-rgb), 0.78) 100%
  );
}

:global([data-theme='dark']) .assistant-message {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-success-rgb), 0.1) 0%,
    rgba(var(--accent-success-rgb), 0.03) 100%
  );
}

:global([data-theme='dark']) .assistant-message .message-header {
  background: linear-gradient(
    135deg,
    rgba(var(--accent-success-rgb), 0.92) 0%,
    rgba(var(--accent-success-rgb), 0.78) 100%
  );
}

/* 响应式 */
@media (max-width: 768px) {
  .message {
    margin-bottom: 12px;
    border-radius: 14px;
  }

  .message-header {
    padding: 6px 10px;
    flex-wrap: nowrap; /* 禁止换行 */
    gap: 6px;
  }

  .floor-info {
    flex: 1;
    min-width: 0; /* 允许收缩 */
  }

  .floor-text {
    font-size: 11px;
  }

  .message-meta {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-left: 0;
  }

  .message-actions {
    flex-shrink: 0; /* 不收缩 */
    gap: 4px;
  }

  .phase-state-badge,
  .inline-phase-indicator,
  .stream-state-badge {
    padding: 1px 6px;
    font-size: 10px;
  }

  .message-actions button {
    width: 26px;
    height: 26px;
    border-radius: 6px;
  }

  .message-actions button i {
    font-size: 11px;
  }

  .message-content {
    padding: 10px;
  }

  .fold-title {
    padding: 4px 8px;
  }

  .fold-body {
    padding: 4px 8px 6px;
  }

  .edit-buttons {
    gap: 8px;
    margin-top: 8px;
  }

  .edit-buttons button {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }

  .edit-buttons button i {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .message {
    margin-bottom: 8px;
    border-radius: 10px;
  }

  .message-header {
    padding: 5px 8px;
  }

  .floor-text {
    font-size: 10px;
  }

  .message-actions button {
    width: 24px;
    height: 24px;
  }

  .message-actions button i {
    font-size: 10px;
  }

  .message-content {
    padding: 8px;
    font-size: 13px;
  }

  .variable-update-hint,
  .variable-update-warning {
    font-size: 11px;
  }

  .fold-title {
    padding: 3px 6px;
  }

  .fold-body {
    padding: 3px 6px 4px;
  }

  .edit-buttons button {
    width: 32px;
    height: 32px;
  }

  .edit-buttons button i {
    font-size: 13px;
  }
}
</style>
