import { nextTick } from 'vue';
import { tCurrent } from '../i18n';
import { useNotificationStore } from '../stores/notification';

/**
 * 删除配置选项
 */
export interface DeleteOptions {
  /** 删除对象的类型名称(用于提示) */
  typeName: string;
  /** 删除对象的显示名称 */
  displayName: string;
  /** 删除操作的回调函数 */
  onDelete: () => void;
  /** 删除成功后的回调(可选) */
  onSuccess?: () => void;
  /** 是否需要确认对话框(默认true) */
  needConfirm?: boolean;
  /** 是否显示成功提示(默认true) */
  showToast?: boolean;
  /** 自定义确认消息(可选) */
  confirmMessage?: string;
}

/**
 * 统一的删除确认函数
 * @param options 删除配置选项
 * @returns Promise<boolean> 是否成功删除
 */
export async function confirmDelete(options: DeleteOptions): Promise<boolean> {
  const { typeName, displayName, onDelete, onSuccess, needConfirm = true, showToast = true, confirmMessage } = options;

  if (needConfirm) {
    const notificationStore = useNotificationStore();
    const confirmed = await notificationStore.confirm({
      title: tCurrent('common.deleteConfirmTitle'),
      message: confirmMessage || tCurrent('common.deleteConfirmMessage', { name: displayName }),
      type: 'danger',
    });

    if (!confirmed) return false;
  }

  onDelete();

  if (showToast) {
    nextTick(() => {
      toastr.success(tCurrent('common.deleteSuccess', { name: displayName }));
      onSuccess?.();
    });
  } else {
    nextTick(() => onSuccess?.());
  }

  return true;
}
