const SETUP_COMPLETED_KEY_PREFIX = 'tavern_helper_1980s_setup_completed';

import { getSafeCurrentChatId } from './hostEnvironment';
import { clearStandaloneRuntimeState } from './standaloneRuntime';
import { clearStandaloneStatData } from './standaloneStatData';

const setupCompletedCache = new Map<string, boolean>();

function getCurrentChatScope(): string {
  return getSafeCurrentChatId();
}

function getScopedStorageKey(): string {
  return `${SETUP_COMPLETED_KEY_PREFIX}:${getCurrentChatScope()}`;
}

export function isSetupCompleted(): boolean {
  const chatScope = getCurrentChatScope();

  if (setupCompletedCache.get(chatScope)) {
    return true;
  }

  try {
    const stored = localStorage.getItem(getScopedStorageKey()) === '1';
    if (stored) {
      setupCompletedCache.set(chatScope, true);
      return true;
    }
  } catch (error) {
    console.warn('[SetupProgress] 读取开局完成标记失败:', error);
  }

  return false;
}

export function markSetupCompleted(): void {
  const chatScope = getCurrentChatScope();
  setupCompletedCache.set(chatScope, true);

  try {
    localStorage.setItem(getScopedStorageKey(), '1');
    console.info('[SetupProgress] 已写入开局完成标记');
  } catch (error) {
    console.warn('[SetupProgress] 写入开局完成标记失败:', error);
  }
}

export function clearSetupCompletedFlag(): void {
  const chatScope = getCurrentChatScope();
  setupCompletedCache.delete(chatScope);

  try {
    localStorage.removeItem(getScopedStorageKey());
    console.info('[SetupProgress] 已清除开局完成标记（保留本地运行状态）');
  } catch (error) {
    console.warn('[SetupProgress] 清除开局完成标记失败:', error);
  }
}

export function clearSetupCompleted(): void {
  clearSetupCompletedFlag();

  try {
    clearStandaloneRuntimeState();
    clearStandaloneStatData();
    console.info('[SetupProgress] 已清除本地运行状态');
  } catch (error) {
    console.warn('[SetupProgress] 清除本地运行状态失败:', error);
  }
}
