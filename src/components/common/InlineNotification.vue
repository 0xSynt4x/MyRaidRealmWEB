<template>
  <div class="inline-notification" :class="[`notification-${type}`]">
    <i :class="iconClass"></i>
    <span class="notification-message">{{ message }}</span>
    <button class="notification-close" :title="t('common.close')" @click="$emit('close')">
      <i class="fa fa-times"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';
import type { NotificationType } from '../../stores/notification';

const props = defineProps<{
  type: NotificationType;
  message: string;
}>();

const { t } = useI18n();

defineEmits<{
  close: [];
}>();

const iconClass = computed(() => {
  switch (props.type) {
    case 'success':
      return 'fa fa-check-circle';
    case 'warning':
      return 'fa fa-exclamation-triangle';
    case 'error':
      return 'fa fa-times-circle';
    case 'info':
    default:
      return 'fa fa-info-circle';
  }
});
</script>

<style scoped>
.inline-notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
  border-left: 4px solid;
  font-size: var(--text-sm);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.inline-notification i:first-child {
  font-size: 18px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  color: var(--text-primary);
  line-height: 1.4;
}

.notification-close {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

/* 类型样式 */
.notification-info {
  border-left-color: #3b82f6;
}

.notification-info i:first-child {
  color: #3b82f6;
}

.notification-success {
  border-left-color: #10b981;
}

.notification-success i:first-child {
  color: #10b981;
}

.notification-warning {
  border-left-color: #f59e0b;
}

.notification-warning i:first-child {
  color: #f59e0b;
}

.notification-error {
  border-left-color: #ef4444;
}

.notification-error i:first-child {
  color: #ef4444;
}

/* 暗色主题 */
:global([data-theme='dark']) .notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
