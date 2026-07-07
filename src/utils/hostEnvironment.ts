import { loadStandaloneRuntimeMessages, loadStandaloneRuntimeSession } from './standaloneRuntime';
import { isStandaloneLocalTurnActive } from './standaloneLocalTurn';

export function getSafeCurrentMessageId(): number {
  const runtimeMessages = loadStandaloneRuntimeMessages();
  const lastMessage = runtimeMessages?.records[runtimeMessages.records.length - 1];
  return lastMessage?.message_id ?? 0;
}

export function getSafeCurrentChatId(): string {
  return loadStandaloneRuntimeSession()?.id ?? 'standalone';
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
