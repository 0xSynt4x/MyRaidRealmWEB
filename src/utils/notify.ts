import { useNotificationStore } from '../stores/notification';

/**
 * 界面提示的唯一入口。
 *
 * 为什么要有这个文件：
 * 界面上「保存成功 / 操作失败」这类小提示，原本是直接调用运行环境提供的提示库
 * （源码里裸写 `toastr.xxx()`，不写 import）。但本产物是独立网页，
 * 那个库根本不存在 —— 一旦走到这些分支就会抛 ReferenceError，
 * 用户看到的是「点了没反应」，控制台里是一堆报错。
 *
 * 现在的策略：能拿到运行环境自带的提示就用它（保持与宿主一致的观感），
 * 拿不到就回落到项目自己的通知系统。
 * 全项目只此一处做这个判断，调用方只关心「提示什么」，不关心「怎么提示」。
 */
type NotifyType = 'success' | 'error' | 'warning' | 'info';

type HostNotifier = Partial<Record<NotifyType, (message: string) => void>>;

const hostNotifier = (globalThis as unknown as { toastr?: HostNotifier }).toastr;

function show(type: NotifyType, message: string) {
  const hostMethod = hostNotifier?.[type];

  if (typeof hostMethod === 'function') {
    hostMethod.call(hostNotifier, message);
    return;
  }

  // 回落到项目自己的通知系统。这里是在组件外调用 Pinia，
  // 依赖应用启动时已安装 pinia —— 实际的提示都发生在用户交互之后，时机没问题。
  const notificationStore = useNotificationStore();
  notificationStore[type](message);
}

export const notify = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  warning: (message: string) => show('warning', message),
  info: (message: string) => show('info', message),
};
