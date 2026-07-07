<template>
  <div class="notification-container">
    <TransitionGroup name="notification-slide">
      <InlineNotification
        v-for="notification in notifications"
        :key="notification.id"
        :type="notification.type"
        :message="notification.message"
        @close="removeNotification(notification.id)"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '../../stores/notification';
import InlineNotification from './InlineNotification.vue';

const notificationStore = useNotificationStore();
const { notifications } = storeToRefs(notificationStore);
const { removeNotification } = notificationStore;
</script>

<style scoped>
.notification-container {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  width: calc(100% - 32px);
  pointer-events: none;
}

.notification-container > * {
  pointer-events: auto;
}

/* 过渡动画 */
.notification-slide-enter-active {
  transition: all 0.3s ease;
}

.notification-slide-leave-active {
  transition: all 0.2s ease;
}

.notification-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-slide-move {
  transition: transform 0.3s ease;
}

/* 响应式 */
@media (max-width: 480px) {
  .notification-container {
    top: 8px;
    right: 8px;
    left: 8px;
    max-width: none;
    width: auto;
  }
}
</style>
