import { defineStore } from 'pinia';
import { Schema } from '../../schema/schema';
import { commitStandaloneRuntimeStateFromStores } from '../utils/standaloneRuntime';
import { resolveCurrentFormalStatDataSnapshot, useStatDataStore } from './statData';

type StatData = ReturnType<typeof Schema.parse>;

function resolveFormalWriteTarget(reason: string) {
  const snapshot = resolveCurrentFormalStatDataSnapshot(`write_target:${reason}`);
  if (!snapshot) {
    throw new Error('未找到可写入的正式账页');
  }

  return snapshot;
}

export const useStatDataActions = defineStore('stat-data-actions', () => {
  const statDataStore = useStatDataStore();

  async function mutateStatData(
    reason: string,
    updater: (draft: StatData) => void | Promise<void>,
  ): Promise<{ messageId: number; data: StatData }> {
    const targetSnapshot = resolveFormalWriteTarget(reason);
    const targetMessageId = targetSnapshot.messageId;

    const nextStatData = _.cloneDeep(targetSnapshot.data);

    await updater(nextStatData);

    const parsedStatData = Schema.parse(_.cloneDeep(nextStatData));
    commitStandaloneRuntimeStateFromStores({
      statData: parsedStatData,
    });
    console.info(`[StatDataActions] standalone 状态已通过统一运行时提交 reason=${reason}`);

    statDataStore.refreshData(`write:${reason}`);

    return {
      messageId: targetMessageId,
      data: parsedStatData,
    };
  }

  async function updateStatDataAtPath<T>(
    reason: string,
    path: string,
    valueOrUpdater: T | ((currentValue: T) => T),
  ): Promise<{ messageId: number; data: StatData }> {
    return mutateStatData(reason, draft => {
      const currentValue = _.cloneDeep(_.get(draft, path)) as T;
      const nextValue =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (currentValue: T) => T)(currentValue)
          : valueOrUpdater;
      _.set(draft, path, nextValue);
    });
  }

  async function removeStatDataAtPath(reason: string, path: string): Promise<{ messageId: number; data: StatData }> {
    return mutateStatData(reason, draft => {
      _.unset(draft, path);
    });
  }

  return {
    mutateStatData,
    updateStatDataAtPath,
    removeStatDataAtPath,
  };
});
