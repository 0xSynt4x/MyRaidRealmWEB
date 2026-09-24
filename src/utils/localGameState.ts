import { clearStandaloneRuntimeState } from './standaloneRuntime';
import { clearStandaloneStatData } from './standaloneStatData';

/**
 * 清空本机留存的一局数据：运行时会话 + 统计数据。
 * 「回到首页」走这里，清完等于回到没开过局的状态。
 */
export function clearLocalGameState(): void {
  try {
    clearStandaloneRuntimeState();
    clearStandaloneStatData();
    console.info('[LocalGameState] 已清除本地运行状态');
  } catch (error) {
    console.warn('[LocalGameState] 清除本地运行状态失败:', error);
  }
}
