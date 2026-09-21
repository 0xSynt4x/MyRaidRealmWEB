import { loadStandaloneRuntimeMessages, loadStandaloneRuntimeSession } from './standaloneRuntime';
import { isStandaloneLocalTurnActive } from './standaloneLocalTurn';

export function getSafeCurrentMessageId(): number {
  const runtimeMessages = loadStandaloneRuntimeMessages();
  const lastMessage = runtimeMessages?.records[runtimeMessages.records.length - 1];
  return lastMessage?.message_id ?? 0;
}

/**
 * 当前会话作用域。
 *
 * 会话 id 是「一个存档」的身份：选中的预设、世界书条目、进度都挂在它下面。
 * 🔴 正常情况它**必须稳定不变**——同一个会话刷新多少次都是同一个 id。
 * 读不出来时才回退到 'standalone'（此时说明会话还没建立，见 hasStandaloneRuntimeSession）。
 */
export function getSafeCurrentChatId(): string {
  return loadStandaloneRuntimeSession()?.id ?? 'standalone';
}

/**
 * 会话是否已经建立。
 *
 * 🔴 会话是在开局向导里点「开始游戏」那一刻才建立的，而「选中预设」比它更早。
 * 所以写会话作用域的数据前必须先问一句：现在到底有没有会话？
 * 没有就先别写（否则会落到兜底作用域，等会话建立后就再也读不回来了）。
 */
export function hasStandaloneRuntimeSession(): boolean {
  return loadStandaloneRuntimeSession() !== null;
}

interface BuiltinGenerationRuntime {
  duringGenerating?: () => boolean;
}

export function isBuiltinGenerationActive(): boolean {
  const runtime = (globalThis as typeof globalThis & { builtin?: BuiltinGenerationRuntime }).builtin;
  if (isStandaloneLocalTurnActive()) {
    return true;
  }

  return typeof runtime?.duringGenerating === 'function' ? runtime.duringGenerating() : false;
}

export function getHostModeLabel(): 'standalone' {
  return 'standalone';
}
