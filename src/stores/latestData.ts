import { defineStore } from 'pinia';
import { useStatDataStore } from './statData';

/**
 * latestData 兼容层
 *
 * 旧的 latestData 可写快照职责已退役：
 * - 正式读取统一来自 statData store
 * - 正式写入必须走 statDataActions
 *
 * 保留本 store 仅用于平滑迁移仍在读取 latestData 的调用方。
 * 当前它只承担读取代理，不再暴露任何等待放行语义。
 */
export const useLatestDataStore = defineStore('latest-data', () => {
  const statDataStore = useStatDataStore();

  function refreshData(reason = 'manual') {
    statDataStore.refreshData(reason);
  }

  async function commitDataChange(reason = 'manual'): Promise<never> {
    console.error(`[LatestDataStore] commitDataChange 已退役，禁止继续使用。reason=${reason}`);
    throw new Error('latestData.commitDataChange 已退役，请改用 useStatDataActions().mutateStatData()');
  }

  return {
    data: statDataStore.data,
    latestMessageId: statDataStore.latestMessageId,
    refreshData,
    commitDataChange,
  };
});
