import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { Schema } from '../../schema/schema';
import { loadStandaloneStatData } from '../utils/standaloneStatData';
import { useBadgeStore } from './badge';

type StatDataSnapshot = {
  messageId: number;
  data: ReturnType<typeof Schema.parse>;
};

export type FormalPageFallbackCause = 'missing_formal_stat_data' | 'parse_failed';

export type ResolvedFormalPageSnapshot = StatDataSnapshot & {
  latestMessageId: number;
  latestMessageRole: 'user' | 'assistant' | null;
  fallbackFromLatestMessage: boolean;
  fallbackCause: FormalPageFallbackCause | null;
};

type StatDataStore = {
  data: Ref<ReturnType<typeof Schema.parse>>;
  latestMessageId: Ref<number>;
  formalMessageId: Ref<number | null>;
  awaitingVariableFlush: Ref<boolean>;
  refreshData: (reason?: string) => void;
  handleTimelineRollback: (reason?: string) => void;
};

function isPollingReason(reason: string) {
  return reason === 'polling';
}

function resolveStandaloneFormalStatDataSnapshot(): ResolvedFormalPageSnapshot {
  return {
    messageId: 0,
    data: loadStandaloneStatData(),
    latestMessageId: 0,
    latestMessageRole: null,
    fallbackFromLatestMessage: false,
    fallbackCause: null,
  };
}

export function resolveCurrentFormalStatDataSnapshot(_reason = 'manual'): ResolvedFormalPageSnapshot | null {
  return resolveStandaloneFormalStatDataSnapshot();
}

export function resolveCurrentFormalMessageId(reason = 'manual'): number {
  const snapshot = resolveCurrentFormalStatDataSnapshot(reason);
  if (!snapshot) {
    throw new Error('未找到当前可写入的正式账页');
  }

  return snapshot.messageId;
}

export const useStatDataStore = defineStore('stat-data', (): StatDataStore => {
  const initialSnapshot = resolveCurrentFormalStatDataSnapshot('store_init');
  const latestMessageId = ref(initialSnapshot?.latestMessageId ?? 0);
  const formalMessageId = ref<number | null>(initialSnapshot?.messageId ?? null);
  const data = ref(initialSnapshot?.data ?? Schema.parse({}));
  const awaitingVariableFlush = ref(false);

  const badgeStore = useBadgeStore();
  badgeStore.ensureInitialized(data.value);

  function applySnapshot(snapshot: ResolvedFormalPageSnapshot, reason: string) {
    formalMessageId.value = snapshot.messageId;

    if (!_.isEqual(data.value, snapshot.data)) {
      badgeStore.applyDataChange(snapshot.data);
      data.value = snapshot.data;
      console.info(
        `[StatDataStore] 正式账页已同步到页面 reason=${reason} formal_message_id=${snapshot.messageId} latest_message_id=${snapshot.latestMessageId}`,
      );
      return;
    }

    if (!isPollingReason(reason)) {
      console.debug(
        `[StatDataStore] 正式账页无变化 reason=${reason} formal_message_id=${snapshot.messageId} latest_message_id=${snapshot.latestMessageId}`,
      );
    }
  }

  function refreshData(reason = 'manual') {
    const snapshot = resolveStandaloneFormalStatDataSnapshot();
    latestMessageId.value = snapshot.latestMessageId;
    applySnapshot(snapshot, reason);
  }

  function handleTimelineRollback(reason = 'manual') {
    console.info(`[StatDataStore] standalone 模式下重新同步本地 stat_data reason=${reason}`);
    refreshData(`standalone_timeline_change:${reason}`);
  }

  return {
    data,
    latestMessageId,
    formalMessageId,
    awaitingVariableFlush,
    refreshData,
    handleTimelineRollback,
  };
});
