import { defineStore } from 'pinia';
import { ref } from 'vue';
import { persistStandaloneLotteryState, resolveStandaloneLotteryState } from '../utils/standaloneRuntime';

export { LOTTERY_PITY_THRESHOLD } from '../utils/lottery';

/**
 * 抽奖进度 Store。
 *
 * 抽奖的次数与保底完全由前端维护，不进 stat_data（AI 看不到），
 * 但跟着会话与楼层快照走：读档、回退楼层时都能恢复。
 */
export const useLotteryStore = defineStore('lottery', () => {
  /** 累计抽奖次数，同时用于保底进度展示与保底判定 */
  const pityCount = ref(0);

  /** 从当前会话读入抽奖进度（应用启动 / 读档后调用） */
  function initFromSession() {
    pityCount.value = resolveStandaloneLotteryState().保底计数;
  }

  /** 写入抽奖进度：同时更新内存与会话（存档） */
  function applyState(state: { 保底计数: number }) {
    pityCount.value = Math.max(0, Math.floor(state.保底计数));
    persistStandaloneLotteryState({ 保底计数: pityCount.value });
  }

  /** 只刷新内存（回退楼层恢复快照时用，快照值已随会话一起写入） */
  function setPityCountInMemory(value: number) {
    pityCount.value = Math.max(0, Math.floor(value));
  }

  function reset() {
    applyState({ 保底计数: 0 });
  }

  return {
    pityCount,
    initFromSession,
    applyState,
    setPityCountInMemory,
    reset,
  };
});
