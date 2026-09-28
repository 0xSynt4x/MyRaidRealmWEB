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
              class="ui-icon-btn action-btn confirm"
              :class="confirmButtonClass"
              :title="confirmButtonText"
              :aria-label="confirmButtonText"
              @click="handleConfirm"
            >
              <i class="ti ti-check"></i>
            </button>
            <button
              class="ui-icon-btn action-btn cancel"
              :title="t('dialog.cancel')"
              :aria-label="t('dialog.cancel')"
              @click="handleCancel"
            >
              <i class="ti ti-x"></i>
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
      return 'ti ti-alert-circle';
    case 'warning':
      return 'ti ti-alert-triangle';
    case 'info':
    default:
      return 'ti ti-help-circle';
  }
});

// 语义色类名走全局 .ui-icon-btn 的变体（.accent / .warning / .danger）。
// 不用 .btn-* —— 那是全局实底按钮类，套到图标按钮上会把实底一起带进来。
const confirmButtonClass = computed(() => {
  switch (confirmDialog.value.options.type) {
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'accent';
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
  border-radius: var(--ui-radius-lg);
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
  border-bottom: 1px solid var(--card-border);
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
  font-size: calc(14px * var(--ui-font-scale));
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

/* 尺寸与图标字号留在局部（设置面板那排是 40×38、这里是 30×30，锁进公共类会被拉成一样大），
   底色 / 描边 / 圆角 / 悬停 / 语义色全部走全局 .ui-icon-btn。 */
.action-btn {
  width: 30px;
  height: 30px;
  padding: 0;
}

.action-btn i {
  font-size: calc(12px * var(--ui-font-scale));
}

.dialog-body {
  padding: 12px;
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
    font-size: calc(12px * var(--ui-font-scale));
  }

  .header-title {
    font-size: calc(12px * var(--ui-font-scale));
  }

  .header-actions {
    gap: 4px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
  }

  .action-btn i {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .dialog-message {
    font-size: var(--text-xs);
  }
}
</style>
