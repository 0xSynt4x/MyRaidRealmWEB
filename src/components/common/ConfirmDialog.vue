<template>
  <Transition name="dialog-fade">
    <div v-if="confirmDialog.visible" class="confirm-dialog-overlay" @click.self="handleCancel">
      <div class="confirm-dialog" :class="[`dialog-${confirmDialog.options.type}`]">
        <!-- 紧凑型头部：图标 + 标题 + 操作按钮 -->
        <div class="dialog-header">
          <div class="header-icon">
            <i :class="iconClass"></i>
          </div>
          <span class="header-title">{{ confirmDialog.options.title }}</span>
          <div class="header-actions">
            <button
              class="action-btn confirm"
              :class="confirmButtonClass"
              :title="confirmButtonText"
              :aria-label="confirmButtonText"
              @click="handleConfirm"
            >
              <i class="fa fa-check"></i>
            </button>
            <button
              class="action-btn cancel"
              :title="t('dialog.cancel')"
              :aria-label="t('dialog.cancel')"
              @click="handleCancel"
            >
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="dialog-body">
          <p class="dialog-message">{{ confirmDialog.options.message }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from '../../i18n';
import { useNotificationStore } from '../../stores/notification';

const notificationStore = useNotificationStore();
const { confirmDialog } = storeToRefs(notificationStore);
const { t } = useI18n();

const iconClass = computed(() => {
  switch (confirmDialog.value.options.type) {
    case 'danger':
      return 'fa fa-exclamation-circle';
    case 'warning':
      return 'fa fa-exclamation-triangle';
    case 'info':
    default:
      return 'fa fa-question-circle';
  }
});

const confirmButtonClass = computed(() => {
  switch (confirmDialog.value.options.type) {
    case 'danger':
      return 'btn-danger';
    case 'warning':
      return 'btn-warning';
    case 'info':
    default:
      return 'btn-primary';
  }
});

const confirmButtonText = computed(() => confirmDialog.value.options.confirmText || t('dialog.confirm'));

function handleConfirm() {
  notificationStore.resolveConfirm(true);
}

function handleCancel() {
  notificationStore.resolveConfirm(false);
}
</script>

<style scoped>
/* 遮罩层 */
.confirm-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--overlay-gap);
  isolation: isolate;
  backdrop-filter: blur(10px);
}

.confirm-dialog-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--overlay-highlight);
  pointer-events: none;
}

.confirm-dialog {
  background: var(--card-bg-strong);
  background-image: var(--card-sheen);
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-xl);
  max-width: 360px;
  width: min(100%, 360px);
  overflow: hidden;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  animation: dialogEnter 0.2s var(--ease-out-expo);
}

@keyframes dialogEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Dashboard 风格头部 */
.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-subtle);
}

.header-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.1);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.header-icon i {
  font-size: 14px;
}

/* 图标类型颜色 */
.dialog-info .header-icon i {
  color: var(--accent-primary);
}

.dialog-warning .header-icon i {
  color: var(--accent-warning);
}

.dialog-warning .header-icon {
  background: rgba(var(--accent-warning-rgb), 0.12);
  border-color: rgba(var(--accent-warning-rgb), 0.18);
}

.dialog-danger .header-icon i {
  color: var(--accent-danger);
}

.dialog-danger .header-icon {
  background: rgba(var(--accent-danger-rgb), 0.12);
  border-color: rgba(var(--accent-danger-rgb), 0.18);
}

.header-title {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 头部操作按钮组 */
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-surface-subtle);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--control-text-rest);
  box-shadow: var(--control-shadow), var(--control-emboss);
  text-shadow: var(--control-text-shadow);
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.action-btn i {
  font-size: 12px;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-btn:active {
  transform: scale(0.95);
}

/* 取消按钮 */
.action-btn.cancel {
  background: var(--control-surface-subtle);
  color: var(--control-text-strong);
}

.action-btn.cancel:hover {
  border-color: rgba(var(--accent-danger-rgb), 0.3);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent-danger) 16%, var(--control-bg) 84%) 0%,
    color-mix(in srgb, var(--accent-danger) 8%, var(--control-bg) 92%) 100%
  );
  color: var(--accent-danger);
}

/* 确认按钮 - 主要（信息） */
.action-btn.confirm.btn-primary {
  border-color: var(--compact-confirm-primary-border);
  color: var(--control-accent-ink);
  text-shadow: var(--control-accent-text-shadow);
}

.action-btn.confirm.btn-primary i,
.action-btn.confirm.btn-warning i,
.action-btn.confirm.btn-danger i {
  position: relative;
  z-index: 1;
}

.action-btn.confirm.btn-primary::before,
.action-btn.confirm.btn-warning::before,
.action-btn.confirm.btn-danger::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.92;
}

.action-btn.confirm.btn-primary::before {
  background: var(--compact-confirm-primary-bg);
}

.action-btn.confirm.btn-primary:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.44);
  box-shadow:
    0 10px 22px rgba(var(--accent-primary-rgb), 0.18),
    var(--control-emboss);
}

/* 确认按钮 - 警告 */
.action-btn.confirm.btn-warning {
  border-color: var(--compact-confirm-warning-border);
  color: var(--control-accent-ink);
  text-shadow: var(--control-accent-text-shadow);
}

.action-btn.confirm.btn-warning::before {
  background: var(--compact-confirm-warning-bg);
}

.action-btn.confirm.btn-warning:hover {
  box-shadow:
    0 10px 22px rgba(var(--accent-warning-rgb), 0.18),
    var(--control-emboss);
}

/* 确认按钮 - 危险 */
.action-btn.confirm.btn-danger {
  border-color: var(--compact-confirm-danger-border);
  color: var(--control-accent-ink);
  text-shadow: var(--control-accent-text-shadow);
}

.action-btn.confirm.btn-danger::before {
  background: var(--compact-confirm-danger-bg);
}

.action-btn.confirm.btn-danger:hover {
  box-shadow:
    0 10px 22px rgba(var(--accent-danger-rgb), 0.2),
    var(--control-emboss);
}

.dialog-body {
  padding: 14px;
  background: transparent;
}

.dialog-message {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-line;
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: all 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .confirm-dialog,
.dialog-fade-leave-to .confirm-dialog {
  transform: scale(0.96) translateY(-8px);
}

/* 暗色主题适配 */
:global([data-theme='dark']) .confirm-dialog {
  box-shadow: var(--shadow-lg);
}

:global([data-theme='dark']) .action-btn.cancel {
  background: var(--bg-card);
}

:global([data-theme='dark']) .action-btn.cancel:hover {
  background: var(--border-light);
}

:global([data-theme='everforest1980s']) .action-btn.cancel {
  border-color: rgba(211, 198, 170, 0.4);
}

/* 响应式 - 移动端微调 */
@media (max-width: 480px) {
  .confirm-dialog {
    width: 100%;
    max-width: none;
  }

  .dialog-header {
    padding: 10px 12px;
    gap: 6px;
  }

  .header-icon {
    width: 24px;
    height: 24px;
  }

  .header-icon i {
    font-size: 12px;
  }

  .header-title {
    font-size: 12px;
  }

  .header-actions {
    gap: 4px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
  }

  .action-btn i {
    font-size: 11px;
  }

  .dialog-body {
    padding: 12px;
  }

  .dialog-message {
    font-size: var(--text-xs);
  }
}
</style>
