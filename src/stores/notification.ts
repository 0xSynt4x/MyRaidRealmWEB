import { defineStore } from 'pinia';
import { ref } from 'vue';
import { tCurrent } from '../i18n';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger';
  confirmText?: string;
}

/**
 * 通知状态管理 Store
 *
 * 职责：
 * 1. 管理页面内通知消息
 * 2. 管理确认对话框状态
 * 3. 提供便捷的通知方法
 */
export const useNotificationStore = defineStore('notification', () => {
  // ========== 通知状态 ==========
  const notifications = ref<Notification[]>([]);
  let notificationId = 0;

  // ========== 确认对话框状态 ==========
  const confirmDialog = ref<{
    visible: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    visible: false,
    options: { title: '', message: '' },
    resolve: null,
  });

  // ========== 通知方法 ==========

  /**
   * 显示通知
   * @param type 通知类型
   * @param message 通知消息
   * @param duration 显示时长（毫秒），0 表示不自动关闭
   */
  function notify(type: NotificationType, message: string, duration = 3000) {
    const id = ++notificationId;
    notifications.value.push({ id, type, message, duration });

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    console.info(`[Notification] ${type}: ${message}`);
  }

  /**
   * 移除指定通知
   */
  function removeNotification(id: number) {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  /**
   * 清空所有通知
   */
  function clearNotifications() {
    notifications.value = [];
  }

  // ========== 确认对话框方法 ==========

  /**
   * 显示确认对话框
   * @param options 对话框选项
   * @returns Promise<boolean> 用户确认返回 true，取消返回 false
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise(resolve => {
      confirmDialog.value = {
        visible: true,
        options: {
          ...options,
          type: options.type ?? 'warning',
          confirmText: options.confirmText ?? tCurrent('common.confirm'),
        },
        resolve,
      };
    });
  }

  /**
   * 解决确认对话框
   * @param result 用户选择结果
   */
  function resolveConfirm(result: boolean) {
    if (confirmDialog.value.resolve) {
      confirmDialog.value.resolve(result);
    }
    confirmDialog.value.visible = false;
    confirmDialog.value.resolve = null;
  }

  // ========== 便捷方法 ==========
  const info = (message: string, duration?: number) => notify('info', message, duration);
  const success = (message: string, duration?: number) => notify('success', message, duration);
  const warning = (message: string, duration?: number) => notify('warning', message, duration);
  const error = (message: string, duration?: number) => notify('error', message, duration ?? 5000);

  return {
    // 状态
    notifications,
    confirmDialog,

    // 通知方法
    notify,
    removeNotification,
    clearNotifications,

    // 确认对话框方法
    confirm,
    resolveConfirm,

    // 便捷方法
    info,
    success,
    warning,
    error,
  };
});
