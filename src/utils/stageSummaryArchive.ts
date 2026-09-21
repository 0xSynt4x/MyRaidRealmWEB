import {
  collectStandalonePriorSummaryItems,
  isStandaloneLocalTurnActive,
  type StandalonePriorSummaryItem,
} from '../../runtime/standaloneTurn';
import { useSettingsStore } from '../stores/settings';
import { hasCompleteStandaloneApiConfig, requestStandaloneProviderText } from './standaloneProviderApi';
import {
  loadStandaloneRuntimeMessages,
  persistStandaloneStageSummary,
  resolveStandaloneStageSummaryState,
  type StandaloneStageSummaryState,
} from './standaloneRuntime';
import { DEFAULT_STAGE_SUMMARY_THRESHOLD, normalizeStageSummaryThreshold } from './stageSummaryThreshold';

/**
 * 阶段总结归档
 *
 * 这张卡不依赖上下文缓存，每轮都当新会话重新拼提示词，所以「小总结」是唯一的跨轮记忆。
 * 但小总结只覆盖掉出最近窗口的那部分 —— 剧情越走越长，那段「前情提要」就会无限膨胀。
 *
 * 这里给玩家一个手动按钮：把「旧的阶段总结 + 这一批还没归档的小总结」丢给主 API，
 * 压成一段新的阶段总结替换旧的，同时推进归档水位线。压完之后，提示词里
 * 那批小总结就不用再逐条发了，长度回到可控范围。
 */

/** 归档后希望压到多长（字），超了就让模型优先保留最近发生的事 */
const STAGE_SUMMARY_TARGET_MAX_CHARS = 1200;

export type StandaloneStageSummaryProgress = {
  /** 已经掉出最近窗口、还没被阶段总结覆盖的小总结条数 */
  pendingCount: number;
  /** 已被阶段总结覆盖的条数 */
  archivedCount: number;
  /** 当前生效的阈值 */
  threshold: number;
  /** 待归档条数是否已达到阈值 */
  isDue: boolean;
  stageSummary: string;
  archivedUntilMessageId: number;
};

function resolveConfiguredThreshold(thresholdOverride?: number): number {
  // 显式传入的阈值按原值用（给测试和外部计算留口子），只有从设置里读的才做档位校验
  if (typeof thresholdOverride === 'number' && Number.isFinite(thresholdOverride)) {
    return Math.max(1, Math.round(thresholdOverride));
  }

  try {
    const settingsStore = useSettingsStore();
    return normalizeStageSummaryThreshold(settingsStore.stageSummaryThreshold);
  } catch (error) {
    console.warn('[StageSummary] 读取归档阈值失败，已回退默认值:', error);
    return DEFAULT_STAGE_SUMMARY_THRESHOLD;
  }
}

function countArchivedSummaries(
  messages: { message_id: number; role: string; summary_content?: string | null }[],
  archivedUntilMessageId: number,
): number {
  if (archivedUntilMessageId < 0) {
    return 0;
  }

  return messages.filter(message => {
    if (message.role !== 'assistant' || message.message_id > archivedUntilMessageId) {
      return false;
    }

    return typeof message.summary_content === 'string' && Boolean(message.summary_content.trim());
  }).length;
}

export function resolveStandaloneStageSummaryProgress(thresholdOverride?: number): StandaloneStageSummaryProgress {
  const state = resolveStandaloneStageSummaryState();
  const messages = loadStandaloneRuntimeMessages()?.records ?? [];
  const pendingItems = collectStandalonePriorSummaryItems({
    messages,
    archivedUntilMessageId: state.archivedUntilMessageId,
  });
  const threshold = resolveConfiguredThreshold(thresholdOverride);

  return {
    pendingCount: pendingItems.length,
    archivedCount: countArchivedSummaries(messages, state.archivedUntilMessageId),
    threshold,
    isDue: pendingItems.length >= threshold,
    stageSummary: state.stageSummary,
    archivedUntilMessageId: state.archivedUntilMessageId,
  };
}

function buildStageSummarySystemPrompt(): string {
  return [
    '你是剧情归档助手。玩家会给你「旧的阶段总结」和「一批新的回合总结」，',
    '请把它们合并成一段连贯的剧情摘要，作为后续对话的长期记忆。',
    '',
    '要求：',
    '1. 按时间顺序叙述，越靠后越接近当前。',
    '2. 保留对后续剧情有影响的信息：人物与关系变化、地点变动、已完成和未完成的事件、重要物品、关键数值变化、埋下的伏笔。',
    '3. 丢掉可以复述的细节：场景描写、对话原文、心理描写、一次性路人的名字。',
    '4. 写成连贯的段落，不要分点罗列，不要写「玩家」「AI」这类称呼，直接用人名。',
    `5. 合并后的篇幅尽量控制在 ${STAGE_SUMMARY_TARGET_MAX_CHARS} 字以内；如果内容实在太多，优先保留最近发生的事，更早的只留结果。`,
    '6. 只输出摘要正文，不要前言、标题、Markdown 标记或代码块。',
  ].join('\n');
}

function buildStageSummaryUserPrompt(input: {
  previousStageSummary: string;
  pendingItems: StandalonePriorSummaryItem[];
}): string {
  const previous = input.previousStageSummary.trim();

  return [
    '【旧的阶段总结】',
    previous || '（无，这是第一次归档）',
    '',
    '【新的回合总结（按时间顺序）】',
    ...input.pendingItems.map((item, index) => `${index + 1}. ${item.summary}`),
    '',
    '请输出合并后的阶段总结。',
  ].join('\n');
}

export type StandaloneStageSummaryArchiveOutcome = {
  /** 这次归档吃进去的小总结条数 */
  archivedCount: number;
  stageSummary: string;
  archivedUntilMessageId: number;
};

/**
 * 手动归档：把「旧阶段总结 + 未归档的窗口外小总结」压成一段新的阶段总结。
 *
 * 只在玩家点按钮时调用，没有任何自动触发。
 */
export async function archiveStandaloneStageSummary(input?: {
  signal?: AbortSignal;
}): Promise<StandaloneStageSummaryArchiveOutcome> {
  if (isStandaloneLocalTurnActive()) {
    throw new Error('当前有回合正在生成，等这一轮跑完再归档');
  }

  const settingsStore = useSettingsStore();
  if (!hasCompleteStandaloneApiConfig(settingsStore.mainApi)) {
    throw new Error('主 API 配置不完整，无法归档阶段总结');
  }

  const state: StandaloneStageSummaryState = resolveStandaloneStageSummaryState();
  const messages = loadStandaloneRuntimeMessages()?.records ?? [];
  const pendingItems = collectStandalonePriorSummaryItems({
    messages,
    archivedUntilMessageId: state.archivedUntilMessageId,
  });

  if (pendingItems.length === 0) {
    return {
      archivedCount: 0,
      stageSummary: state.stageSummary,
      archivedUntilMessageId: state.archivedUntilMessageId,
    };
  }

  const controller = new AbortController();
  const externalSignal = input?.signal;
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener('abort', abortFromExternal);

  try {
    const reply = await requestStandaloneProviderText({
      api: settingsStore.mainApi,
      prompt: {
        systemPrompt: buildStageSummarySystemPrompt(),
        userPrompt: buildStageSummaryUserPrompt({
          previousStageSummary: state.stageSummary,
          pendingItems,
        }),
      },
      signal: controller.signal,
      logPrefix: '[StageSummary]',
      temperature: 0.3,
    });

    const nextStageSummary = reply.text.trim();
    if (!nextStageSummary) {
      throw new Error('主 API 没有返回阶段总结内容');
    }

    const nextArchivedUntilMessageId = pendingItems.reduce(
      (max, item) => Math.max(max, item.messageId),
      state.archivedUntilMessageId,
    );
    const persisted = persistStandaloneStageSummary({
      stageSummary: nextStageSummary,
      archivedUntilMessageId: nextArchivedUntilMessageId,
    });

    return {
      archivedCount: pendingItems.length,
      stageSummary: persisted.stageSummary,
      archivedUntilMessageId: persisted.archivedUntilMessageId,
    };
  } finally {
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}
