import { Schema } from '../schema/schema';
import type { LocalContentEntryConfig, PresetConfig } from '../src/presets/types';
import type { MessageBodyPage, MessageRecord } from '../src/stores/messages';
import type { ApiConfig, WorldDifficulty } from '../src/stores/settings';
import {
  mergeStandaloneAssistantDebugTrace,
  type StandaloneAiDebugPassTrace,
  type StandaloneAssistantDebugTrace,
} from '../src/utils/standaloneAiDebug';
import {
  appendStandaloneAiDebugFailure,
  createFallbackFailureTrace,
  readStandaloneProviderFailureTrace,
} from '../src/utils/standaloneAiDebugFailures';
import { normalizeRemoteApiErrorMessage } from '../src/utils/remoteApiError';
import {
  parseTaggedAssistantReply,
  replaceOrAppendUpdateVariableBlock,
  type ParsedTaggedAssistantReply,
} from '../src/utils/taggedReply';
import {
  isStandaloneMainWorldbookBlock,
  renderResolvedStandaloneLocalContentEntry,
  resolveStandaloneLocalContentBlocks,
  resolveStandaloneLocalContentEntries,
  resolveStandaloneMainWorldbookPrompt,
  type StandaloneBuiltinAssetRouteOverrideMap,
} from '../src/utils/standaloneLocalContent';
import {
  getActiveStandaloneTavernPresetDocument,
  parseStandaloneTavernPresetDocument,
  resolveOrderedStandaloneTavernPrompts,
} from '../src/utils/standaloneTavernPreset';
import {
  hasCompleteStandaloneApiConfig,
  requestStandaloneProviderText,
  type StandaloneProviderChatMessage,
  type StandaloneProviderReply,
} from '../src/utils/standaloneProviderApi';
import { formatMessageContentForDisplay } from '../src/utils/messageFormatting';
import { normalizeLineEndingsTrimmed as normalizeLineEndings } from '../src/utils/textNormalize';
import {
  lotteryItemSkillRulesTemplate,
  lotteryRequestPromptTemplate,
  storyReviewPromptTemplate,
  storyRevisePromptTemplate,
} from '../src/assets/standalone-local-content';
import { renderStandaloneLocalContentTemplate } from '../src/utils/standaloneLocalContentEjs';
import {
  applyVariableUpdatePatch,
  filterVariableUpdatePatch,
  parseVariableUpdatePatch,
  type VariableUpdatePatchGuard,
} from '../src/utils/variableUpdate';
import { resolvePatchTextWithRescue } from '../src/utils/variableUpdateRescue';
import { applyStandalonePromptMacroReplacements, buildStandaloneCurrentStatDataBlock } from './standalonePromptUtils';
import { searchStandaloneBm25 } from './standaloneBm25';
import {
  buildStandaloneSnapshotForChain,
  DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS,
  isStandaloneSurvivalDisabled,
  type StandaloneSnapshotTrimSettings,
} from './standaloneSnapshotTrim';

type StandaloneStatData = ReturnType<typeof Schema.parse>;

/** 组装写入层护栏：`_` 前缀一律拦；生存系统关闭时才拦生存状态。 */
function resolveStandalonePatchGuard(statData: StandaloneStatData): VariableUpdatePatchGuard {
  return {
    blockUnderscoreKeys: true,
    blockSurvivalPaths: isStandaloneSurvivalDisabled(statData),
  };
}

export type StandaloneLocalTurnInput = {
  /** 主 API 候选，按顺序尝试 */
  mainApis: ApiConfig[];
  assistantApis?: ApiConfig[];
  /** 前一个失败时是否自动试下一个；缺省 true */
  autoRetry?: boolean;
  /** 正文流式请求的首字超时秒数；0 或未给 = 不启用（行为与之前一致） */
  firstTokenTimeoutSeconds?: number;
  statData: StandaloneStatData;
  /**
   * 读「当前的游戏数据」。正文回来时调一次 → 辅助 API 的输入快照 S；
   * 应用补丁时再调一次 → 应用基底（含辅助 API 生成期间的前端改动）。缺省返回 statData。
   */
  readLiveStatData?: () => StandaloneStatData;
  messages: MessageRecord[];
  latestUserMessage: MessageRecord;
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  /** 玩家在设置里手动添加的条目；没选预设时靠它把内容送进提示词 */
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  /** 发送前快照裁剪开关；缺省用默认值（全开） */
  snapshotTrim?: StandaloneSnapshotTrimSettings;
  onMainReplyPartialText?: (text: string) => void;
  /** 玩家手动归档出来的整体剧情摘要，空＝还没归档过 */
  stageSummary?: string;
  /** 归档水位线：message_id 小于等于它的回合已被上面那段覆盖 */
  archivedUntilMessageId?: number;
  /** 正文请求次数（1~5）；缺省 1 */
  bodyRequestCount?: number;
};

export type StandaloneLocalTurnOutcome = {
  assistantMessage: Omit<MessageRecord, 'message_id'>;
  usedApiLabel: string;
  finalizeVariableUpdate: Promise<StandaloneVariableUpdatePhaseOutcome>;
  /**
   * 并发请求的后续正文候选页（第 2~N 页）。
   * 只有在 bodyRequestCount > 1 时才会发起；后台静默执行，完成后兑现，失败项静默丢弃。
   */
  collectAdditionalPages?: Promise<MessageBodyPage[]>;
};

export type StandaloneVariableUpdateStatus = 'running' | 'success' | 'failed' | 'skipped';

export type StandaloneVariableUpdatePhaseOutcome = {
  assistantMessage: Omit<MessageRecord, 'message_id'>;
  nextStatData: StandaloneStatData;
  variableUpdateApplied: boolean;
  variableUpdateWarning: string | null;
  variableUpdateStatus: StandaloneVariableUpdateStatus;
  usedApiLabel: string;
};

export async function runStandaloneVariableUpdatePass(input: {
  /** 主 API 候选，按顺序尝试 */
  mainApis: ApiConfig[];
  assistantApis?: ApiConfig[];
  /** 前一个失败时是否自动试下一个；缺省 true */
  autoRetry?: boolean;
  statData: StandaloneStatData;
  /**
   * 应用补丁时读「应用基底」。手动刷新时传 `() => 本条回复的输入基底 S`，
   * 让补丁打在 S 上（而不是已含后续回合改动的当前数据，否则会重复累加）。
   * 缺省返回 statData。
   */
  readLiveStatData?: () => StandaloneStatData;
  messages: MessageRecord[];
  latestUserMessage: MessageRecord;
  targetAssistantMessage: MessageRecord;
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  /** 玩家在设置里手动添加的条目；没选预设时靠它把内容送进提示词 */
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  /** 发送前快照裁剪开关；缺省用默认值（全开） */
  snapshotTrim?: StandaloneSnapshotTrimSettings;
}): Promise<StandaloneVariableUpdatePhaseOutcome> {
  const assistantContentText = input.targetAssistantMessage.content_text.trim();
  const sanitizedAssistantRawContent = normalizeLineEndings(
    stripUpdateVariableBlocks(input.targetAssistantMessage.raw_content),
  );
  // 手动刷新只跑这一条辅助链路：输入基底 `input.statData` 本身已是本条回复的 S，
  // 应用基底也走 `readLiveStatData`（同样指向 S）—— 两者同源，读一次即可，补丁只净应用一次。
  const applyBaseStatData = input.readLiveStatData?.() ?? input.statData;
  const patchGuard = resolveStandalonePatchGuard(applyBaseStatData);
  // 主回复不携带变量补丁（提示词明确禁止，且这里已先剥掉变量块），只需解析标签。
  let applyResult = parseReplyWithoutPatch(applyBaseStatData, sanitizedAssistantRawContent);
  let effectiveRawReply = sanitizedAssistantRawContent;
  let variableUpdateWarning: string | null = null;
  let variableUpdateApiLabel: string | null = null;
  let variableUpdateStatus: StandaloneVariableUpdateStatus = 'running';
  let debugTrace = input.targetAssistantMessage.debug_trace;

  if (activeStandaloneTurnController) {
    throw new Error('已有独立模式生成任务正在进行中');
  }

  const controller = new AbortController();
  activeStandaloneTurnController = controller;

  try {
    const secondPassResult = await requestVariableUpdateSecondPass(
      {
        mainApis: input.mainApis,
        assistantApis: input.assistantApis,
        autoRetry: input.autoRetry,
        statData: input.statData,
        messages: input.messages,
        latestUserMessage: input.latestUserMessage,
        worldDifficulty: input.worldDifficulty,
        localContentEnabledMap: input.localContentEnabledMap,
        localContentBuiltinRouteOverrides: input.localContentBuiltinRouteOverrides,
        localContentCustomEntries: input.localContentCustomEntries,
        selectedPreset: input.selectedPreset,
        snapshotTrim: input.snapshotTrim,
      },
      assistantContentText,
      controller.signal,
      // 手动刷新：辅助 API 的输入快照就是本条回复的 S（= input.statData）。
      input.statData,
    );

    variableUpdateApiLabel = secondPassResult.usedApiLabel;
    if (secondPassResult.debugTrace) {
      debugTrace = mergeStandaloneAssistantDebugTrace(debugTrace, {
        variable_update_pass: secondPassResult.debugTrace,
      });
    }

    if (!secondPassResult.updateBlock) {
      variableUpdateWarning = secondPassResult.warning ?? '补写变量更新失败';
      variableUpdateStatus = variableUpdateWarning ? 'failed' : 'skipped';
    } else {
      const mergedRawReply = replaceOrAppendUpdateVariableBlock(
        sanitizedAssistantRawContent,
        secondPassResult.updateBlock,
      );
      const mergedApplyResult = applyVariableUpdateFromReply(applyBaseStatData, mergedRawReply, patchGuard);

      if (mergedApplyResult.errorMessage) {
        variableUpdateWarning = mergedApplyResult.errorMessage;
        variableUpdateStatus = 'failed';
      } else {
        applyResult = mergedApplyResult;
        effectiveRawReply = mergedRawReply;
        // 修复层整形过补丁时在这里留痕：更新本身是成功的，但玩家要能看见「格式被修过」。
        variableUpdateWarning = mergedApplyResult.rescueNote;
        variableUpdateStatus = applyResult.variableUpdateApplied ? 'success' : 'skipped';
      }
    }

    const mainApiLabel = input.mainApis[0] ? toApiLabel(input.mainApis[0]) : '';
    const usedApiLabel =
      variableUpdateApiLabel && variableUpdateApiLabel !== mainApiLabel
        ? mainApiLabel
          ? `${mainApiLabel} + ${variableUpdateApiLabel}`
          : variableUpdateApiLabel
        : mainApiLabel;

    return {
      assistantMessage: {
        ...buildAssistantMessagePayload(applyResult.parsedReply, effectiveRawReply, debugTrace),
        variable_update_status: variableUpdateStatus,
        variable_update_warning: variableUpdateWarning,
      },
      nextStatData: applyResult.nextStatData,
      variableUpdateApplied: applyResult.variableUpdateApplied,
      variableUpdateWarning,
      variableUpdateStatus,
      usedApiLabel,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('standalone_variable_update_aborted');
    }

    throw error;
  } finally {
    if (activeStandaloneTurnController === controller) {
      activeStandaloneTurnController = null;
    }
  }
}

type VariableUpdateApplyResult = {
  parsedReply: ParsedTaggedAssistantReply;
  nextStatData: StandaloneStatData;
  variableUpdateApplied: boolean;
  errorMessage: string | null;
  /** 补丁格式被修复层整形过时的说明，用于在消息上留痕；没整形就是 null。 */
  rescueNote: string | null;
};

type StandalonePromptBundle = {
  systemPrompt: string;
  userPrompt: string;
};

type StandalonePromptMessagesBundle = {
  messages: StandaloneProviderChatMessage[];
};

export type StandaloneMainChainViewEntryKey =
  'system_protocol' | 'current_stat_snapshot' | 'active_worldbook' | 'recent_history' | 'latest_user_input';

export type StandaloneMainChainViewEntry = {
  key: StandaloneMainChainViewEntryKey;
  orderIndex: number;
  role: 'system' | 'user' | 'assistant';
};

export type StandaloneMainChainView = {
  mode: 'full';
  entries: StandaloneMainChainViewEntry[];
  rawPresetReferenceIdentifier: string;
  rawPresetReferenceName: string;
};

type StandalonePresetPromptDefinition = {
  identifier?: string;
  name?: string;
  enabled?: boolean;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
};

type ResolvedStandalonePresetPrompt = StandalonePresetPromptDefinition & {
  enabledInOrder: boolean;
};

type VariableUpdateSecondPassResult = {
  updateBlock: string | null;
  warning: string | null;
  usedApiLabel: string | null;
  debugTrace?: StandaloneAiDebugPassTrace;
};

type StandaloneVariableUpdatePromptSections = {
  variableSnapshotPrompt: string;
  wbPrompt: string;
  previousUserPrompt: string;
  assistantContentPrompt: string;
  metaSystemPrompt: string;
  mvuUpdatePrompt: string;
};

const RECENT_MESSAGE_LIMIT = 8;

const STANDALONE_PRESET_COMPACT_IDENTIFIERS = new Set(['main']);

const STANDALONE_PRESET_SKIP_IDENTIFIERS = new Set(['worldInfoBefore', 'worldInfoAfter', 'dialogueExamples']);

let activeStandaloneTurnController: AbortController | null = null;

export function isStandaloneLocalTurnActive(): boolean {
  return activeStandaloneTurnController !== null;
}

function resolvePromptMessageRole(prompt: StandalonePresetPromptDefinition): 'system' | 'user' | 'assistant' {
  if (prompt.role === 'assistant') {
    return 'assistant';
  }

  if (prompt.role === 'user') {
    return 'user';
  }

  if (prompt.role === 'system' || prompt.system_prompt) {
    return 'system';
  }

  return 'user';
}

function buildStandaloneMainProtocolBlock(localContentBlocks: string[], mainPresetBlock: string): string {
  const protocolLocalContentBlocks = localContentBlocks.filter(
    block =>
      !/^\[本地内容:当前变量快照\]/.test(block.trim()) &&
      // 世界书走独立注入通道（resolveStandaloneMainWorldbookPrompt → 主链路里单独成条），
      // 这里再拼一次会让同一份世界书在提示词里出现两遍。
      !isStandaloneMainWorldbookBlock(block),
  );

  return normalizeLineEndings(`
你的任务：
1. 根据当前游戏状态与最近对话继续剧情。
2. 回复时必须输出且只输出一段标签化结果，不要使用 Markdown 代码块。
3. 结果必须包含且仅包含一个 <contenttext> 正文块。
4. 可以按需输出 <summary>、<analysis_block>、<action_options>。
5. <action_options> 内请给出 3 到 5 行可选行动，每行以 “1.”、“2.” 这样的编号开头。
6. 不要输出 <UpdateVariable>；变量变化会由后续专用流程单独处理。
7. 不要输出与标签协议无关的解释性前言。

标签协议示例：
<contenttext>
这里写剧情正文
</contenttext>
<summary>
这里写简短总结
</summary>
<action_options>
1. 选项一
2. 选项二
3. 选项三
</action_options>

${mainPresetBlock}

${protocolLocalContentBlocks.join('\n\n')}
`);
}

function resolveStandaloneRecentHistoryMessages(input: {
  messages: MessageRecord[];
  /** 要排除的「玩家最新输入」楼层；抽奖等旁路请求没有这一条，可不传 */
  latestUserMessage?: MessageRecord;
}): StandaloneProviderChatMessage[] {
  return input.messages
    .slice(-RECENT_MESSAGE_LIMIT)
    .filter(message => !input.latestUserMessage || message.message_id !== input.latestUserMessage.message_id)
    // 抽奖结果只在聊天流展示，不进剧情历史
    .filter(message => !message.lottery)
    .map(message => ({
      role: message.role,
      content: (message.content_text || message.raw_content || '（空）').trim() || '（空）',
    }));
}

export type StandalonePriorSummaryItem = {
  messageId: number;
  summary: string;
};

/**
 * 收集「已经掉出最近窗口、且还没被阶段总结覆盖」的回合小总结。
 *
 * 提示词拼装与玩家手动归档共用这一份口径 —— 否则两边算出来的条数对不上，
 * 会出现「界面说攒够了、点归档却说没有可归档内容」这种自相矛盾。
 */
export function collectStandalonePriorSummaryItems(input: {
  messages: MessageRecord[];
  archivedUntilMessageId?: number;
  excludeMessageId?: number;
}): StandalonePriorSummaryItem[] {
  const windowStart = Math.max(0, input.messages.length - RECENT_MESSAGE_LIMIT);
  const archivedUntilMessageId = input.archivedUntilMessageId ?? -1;

  return input.messages
    .slice(0, windowStart)
    .filter(message => message.role === 'assistant')
    // 抽奖结果没有小总结，也不进前情提要
    .filter(message => !message.lottery)
    .filter(message => message.message_id !== input.excludeMessageId)
    .filter(message => message.message_id > archivedUntilMessageId)
    .map(message => ({
      messageId: message.message_id,
      summary: typeof message.summary_content === 'string' ? message.summary_content.trim() : '',
    }))
    .filter(item => Boolean(item.summary));
}

/**
 * 从待归档的小总结池中，结合 BM25 检索与近期连贯性筛选注入提示词的前情提要条目。
 * - 当待归档小总结 <= 6 条时，全量保留（条数少，直接按时间顺序呈现）；
 * - 当待归档小总结 > 6 条时，利用 BM25 按当前输入/场景检索最相关的记忆，
 *   并与最近 2 条小总结保底合并去重，控制在 3~5 条以内，防止上下文爆炸。
 */
export function selectPriorSummaryItemsForPrompt(input: {
  pendingItems: StandalonePriorSummaryItem[];
  latestUserMessage: MessageRecord;
  statData?: unknown;
}): StandalonePriorSummaryItem[] {
  const { pendingItems, latestUserMessage, statData } = input;
  if (pendingItems.length <= 6) {
    return pendingItems;
  }

  const docs = pendingItems.map(item => ({
    id: item.messageId,
    text: item.summary,
    meta: item,
  }));

  const queryParts: string[] = [];
  if (typeof latestUserMessage.content_text === 'string' && latestUserMessage.content_text.trim()) {
    queryParts.push(latestUserMessage.content_text.trim());
  }
  if (
    typeof latestUserMessage.raw_content === 'string' &&
    latestUserMessage.raw_content.trim() &&
    latestUserMessage.raw_content !== latestUserMessage.content_text
  ) {
    queryParts.push(latestUserMessage.raw_content.trim());
  }

  if (typeof statData === 'object' && statData !== null) {
    const loc = (statData as Record<string, any>)?.世界?.空间定位?.当前位置;
    if (typeof loc === 'string' && loc.trim()) {
      queryParts.push(loc.trim());
    }
  }

  const query = queryParts.join(' ').trim();
  const searchResults = searchStandaloneBm25(docs, query, {
    topK: 3,
    minScore: 0.1,
    boostRecency: true,
  });

  const selectedMap = new Map<number, StandalonePriorSummaryItem>();

  for (const res of searchResults) {
    if (res.meta) {
      selectedMap.set(Number(res.id), res.meta);
    }
  }

  // 总是保底包含最近 2 条小总结，确保刚出窗口的过渡剧情不脱节
  const recents = pendingItems.slice(-2);
  for (const item of recents) {
    selectedMap.set(item.messageId, item);
  }

  // 如果没有命中强相关的历史（纯新话题），则取最近 4 条
  if (selectedMap.size <= 2) {
    const fallbackRecents = pendingItems.slice(-4);
    for (const item of fallbackRecents) {
      selectedMap.set(item.messageId, item);
    }
  }

  return Array.from(selectedMap.values()).sort((a, b) => a.messageId - b.messageId);
}

function buildStandalonePriorSummaryBlock(input: {
  messages: MessageRecord[];
  latestUserMessage: MessageRecord;
  stageSummary?: string;
  archivedUntilMessageId?: number;
  statData?: unknown;
}): string {
  const stageSummary = typeof input.stageSummary === 'string' ? input.stageSummary.trim() : '';
  const pendingItems = collectStandalonePriorSummaryItems({
    messages: input.messages,
    archivedUntilMessageId: input.archivedUntilMessageId,
    excludeMessageId: input.latestUserMessage.message_id,
  });

  const blocks: string[] = [];

  if (stageSummary) {
    blocks.push(['[阶段总结]', '以下是更早剧情的归档摘要（越靠后越接近当前）：', stageSummary].join('\n'));
  }

  const selectedItems = selectPriorSummaryItemsForPrompt({
    pendingItems,
    latestUserMessage: input.latestUserMessage,
    statData: input.statData,
  });

  if (selectedItems.length > 0) {
    blocks.push(
      [
        '[前情提要]',
        '以下是尚未归档的更早回合剧情总结（按时间顺序，越靠后越接近当前）：',
        ...selectedItems.map(item => item.summary),
      ].join('\n\n'),
    );
  }

  return blocks.join('\n\n');
}

function resolveStandaloneLatestUserMessage(input: MessageRecord): StandaloneProviderChatMessage {
  return {
    role: 'user',
    content: input.content_text.trim() || input.raw_content.trim() || '（空）',
  };
}

function buildStandaloneOrderedMainMessages(input: {
  statData: StandaloneStatData;
  messages: MessageRecord[];
  latestUserMessage: MessageRecord;
  localContentBlocks: string[];
  includeFullPreset: boolean;
  /** 发送用整形快照；缺省回落到 statData（未开启裁剪时） */
  snapshotStatData?: unknown;
  /** 快照是否紧凑输出 */
  compactSnapshot?: boolean;
  /** 玩家手动归档出来的整体剧情摘要，空＝还没归档过 */
  stageSummary?: string;
  /** 归档水位线：message_id 小于等于它的回合已被上面那段覆盖 */
  archivedUntilMessageId?: number;
}): StandaloneProviderChatMessage[] {
  const orderedPrompts = resolveOrderedStandalonePresetPrompts();
  const messages: StandaloneProviderChatMessage[] = [];
  let latestUserInjected = false;
  let statDataInjected = false;
  let worldbookInjected = false;
  let priorSummaryInjected = false;
  let mainPresetBlock = '';
  const activeWorldbookPrompt = resolveStandaloneMainWorldbookPrompt(input.localContentBlocks);
  const priorSummaryBlock = buildStandalonePriorSummaryBlock({
    messages: input.messages,
    latestUserMessage: input.latestUserMessage,
    stageSummary: input.stageSummary,
    archivedUntilMessageId: input.archivedUntilMessageId,
    statData: input.statData,
  });

  orderedPrompts.forEach(prompt => {
    if (!prompt.enabledInOrder || typeof prompt.identifier !== 'string') {
      return;
    }

    if (!input.includeFullPreset && !STANDALONE_PRESET_COMPACT_IDENTIFIERS.has(prompt.identifier)) {
      return;
    }

    if (prompt.identifier === 'main') {
      const content =
        typeof prompt.content === 'string'
          ? normalizeStandalonePresetPromptContent(prompt.content, input.statData, {
              snapshotStatData: input.snapshotStatData,
              compactSnapshot: input.compactSnapshot,
            })
          : '';
      if (!content) {
        return;
      }

      mainPresetBlock = content.trim();
      return;
    }

    if (prompt.identifier === 'chatHistory') {
      if (!statDataInjected) {
        messages.push({
          role: 'user',
          content: buildStandaloneCurrentStatDataBlock(input.snapshotStatData ?? input.statData, {
            compact: input.compactSnapshot === true,
          }),
        });
        statDataInjected = true;
      }

      if (activeWorldbookPrompt && !worldbookInjected) {
        messages.push({
          role: 'user',
          content: activeWorldbookPrompt,
        });
        worldbookInjected = true;
      }

      if (priorSummaryBlock && !priorSummaryInjected) {
        messages.push({
          role: 'user',
          content: priorSummaryBlock,
        });
        priorSummaryInjected = true;
      }

      messages.push(
        ...resolveStandaloneRecentHistoryMessages({
          messages: input.messages,
          latestUserMessage: input.latestUserMessage,
        }),
      );
      messages.push(resolveStandaloneLatestUserMessage(input.latestUserMessage));
      latestUserInjected = true;
      return;
    }

    if (STANDALONE_PRESET_SKIP_IDENTIFIERS.has(prompt.identifier)) {
      return;
    }

    const directContent =
      typeof prompt.content === 'string'
        ? normalizeStandalonePresetPromptContent(prompt.content, input.statData, {
            snapshotStatData: input.snapshotStatData,
            compactSnapshot: input.compactSnapshot,
          })
        : '';
    const resolvedContent = directContent.trim();

    if (!resolvedContent) {
      return;
    }

    messages.push({
      role: resolvePromptMessageRole(prompt),
      content: resolvedContent,
    });
  });

  messages.unshift({
    role: 'system',
    content: buildStandaloneMainProtocolBlock(input.localContentBlocks, mainPresetBlock),
  });

  if (!statDataInjected) {
    messages.push({
      role: 'user',
      content: buildStandaloneCurrentStatDataBlock(input.snapshotStatData ?? input.statData, {
        compact: input.compactSnapshot === true,
      }),
    });
    statDataInjected = true;
  }

  if (activeWorldbookPrompt && !worldbookInjected) {
    messages.push({
      role: 'user',
      content: activeWorldbookPrompt,
    });
    worldbookInjected = true;
  }

  if (priorSummaryBlock && !priorSummaryInjected) {
    messages.push({
      role: 'user',
      content: priorSummaryBlock,
    });
    priorSummaryInjected = true;
  }

  if (!latestUserInjected) {
    messages.push(resolveStandaloneLatestUserMessage(input.latestUserMessage));
  }

  return messages;
}

function normalizeStandalonePresetPromptContent(
  content: string,
  statData?: StandaloneStatData,
  snapshot?: { snapshotStatData?: unknown; compactSnapshot?: boolean },
): string {
  const sanitizedLines = normalizeLineEndings(content)
    .split('\n')
    .filter(line => !/^\s*(忽略之前提示词|ignore previous prompts?)\s*$/i.test(line));

  const sanitized = sanitizedLines.join('\n').trim();

  return applyStandalonePromptMacroReplacements(sanitized, {
    statData,
    snapshotStatData: snapshot?.snapshotStatData,
    compactSnapshot: snapshot?.compactSnapshot,
  });
}

function resolveOrderedStandalonePresetPrompts(): ResolvedStandalonePresetPrompt[] {
  const standalonePresetDocument = parseStandaloneTavernPresetDocument(getActiveStandaloneTavernPresetDocument());
  return resolveOrderedStandaloneTavernPrompts(standalonePresetDocument);
}

function toApiLabel(api: ApiConfig): string {
  return `${api.source}:${api.model}`;
}

/** 挑出配置完整、能真正发起请求的主 API 候选 */
function resolveConfiguredMainApis(mainApis: ApiConfig[] | undefined): ApiConfig[] {
  return (mainApis ?? []).filter(api => hasCompleteStandaloneApiConfig(api));
}

function resolveConfiguredAssistantApis(assistantApis: ApiConfig[] | undefined): ApiConfig[] {
  return (assistantApis ?? []).filter(api => hasCompleteStandaloneApiConfig(api));
}

/**
 * 按「自动重试」开关裁剪候选：关掉时只留第一条，失败就直接报错，不再往后找。
 */
function limitApiCandidates<T>(candidates: T[], autoRetry: boolean | undefined): T[] {
  return autoRetry === false ? candidates.slice(0, 1) : candidates;
}

export function buildMainTurnPrompt(input: StandaloneLocalTurnInput): StandalonePromptMessagesBundle {
  const includeFullPreset = true;
  const recentAssistantText = [...input.messages]
    .reverse()
    .find(m => m.role === 'assistant' && !m.lottery)?.content_text ?? '';
  const scanTexts = [
    input.latestUserMessage?.content_text,
    input.latestUserMessage?.raw_content,
    recentAssistantText,
  ].filter((t): t is string => typeof t === 'string' && Boolean(t.trim()));

  // 发送用快照：正文链不在场 NPC 做轻量化瘦身，在场 NPC 完整保留；剔 `$`、剔「设置」、商城只留路径、生存状态按模式裁。
  // renderContext.statData 保持完整数据（预设主提示词的宏与脚本要读它）。
  const snapshotForSend = buildStandaloneSnapshotForChain({
    statData: input.statData,
    settings: input.snapshotTrim ?? DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS,
    chain: 'main',
    texts: scanTexts,
  });
  const localContentBlocks = resolveStandaloneLocalContentBlocks({
    route: 'main',
    enabledMap: input.localContentEnabledMap,
    builtinRouteOverrides: input.localContentBuiltinRouteOverrides,
    customEntries: input.localContentCustomEntries,
    preset: input.selectedPreset,
    renderContext: {
      statData: input.statData,
      messages: input.messages,
      latestUserMessage: input.latestUserMessage,
      worldDifficulty: input.worldDifficulty,
      snapshotStatData: snapshotForSend.snapshot,
      compactSnapshot: snapshotForSend.compact,
    },
  });
  return {
    messages: buildStandaloneOrderedMainMessages({
      statData: input.statData,
      messages: input.messages,
      latestUserMessage: input.latestUserMessage,
      localContentBlocks,
      includeFullPreset,
      snapshotStatData: snapshotForSend.snapshot,
      compactSnapshot: snapshotForSend.compact,
      stageSummary: input.stageSummary,
      archivedUntilMessageId: input.archivedUntilMessageId,
    }),
  };
}

export function inspectStandaloneMainChainView(): StandaloneMainChainView {
  const orderedPrompts = resolveOrderedStandalonePresetPrompts();
  const mainPrompt = orderedPrompts.find(
    prompt => prompt.enabledInOrder && typeof prompt.identifier === 'string' && prompt.identifier === 'main',
  );

  return {
    mode: 'full',
    rawPresetReferenceIdentifier: mainPrompt?.identifier?.trim() || 'main',
    rawPresetReferenceName: mainPrompt?.name?.trim() || 'main',
    entries: [
      {
        key: 'system_protocol',
        orderIndex: 0,
        role: 'system',
      },
      {
        key: 'current_stat_snapshot',
        orderIndex: 1,
        role: 'user',
      },
      {
        key: 'active_worldbook',
        orderIndex: 2,
        role: 'user',
      },
      {
        key: 'recent_history',
        orderIndex: 3,
        role: 'user',
      },
      {
        key: 'latest_user_input',
        orderIndex: 4,
        role: 'user',
      },
    ],
  };
}

export function buildVariableUpdateSecondPassPrompt(input: {
  statData: StandaloneStatData;
  latestUserMessage: MessageRecord;
  assistantContentText: string;
  messages: MessageRecord[];
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  /** 玩家在设置里手动添加的条目；没选预设时靠它把内容送进提示词 */
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  /** 发送前快照裁剪开关；缺省用默认值（全开） */
  snapshotTrim?: StandaloneSnapshotTrimSettings;
}): StandalonePromptMessagesBundle {
  const promptSections = buildStandaloneVariableUpdatePromptSections(input);
  return {
    messages: [
      {
        role: 'user',
        content: promptSections.variableSnapshotPrompt,
      },
      ...(promptSections.wbPrompt
        ? [
            {
              role: 'user' as const,
              content: promptSections.wbPrompt,
            },
          ]
        : []),
      {
        role: 'assistant',
        content: promptSections.assistantContentPrompt,
      },
      ...(promptSections.previousUserPrompt
        ? [
            {
              role: 'user' as const,
              content: promptSections.previousUserPrompt,
            },
          ]
        : []),
      {
        role: 'system',
        content: promptSections.metaSystemPrompt,
      },
      {
        role: 'user',
        content: promptSections.mvuUpdatePrompt,
      },
    ],
  };
}

function buildStandaloneVariableUpdatePromptSections(input: {
  statData: StandaloneStatData;
  latestUserMessage: MessageRecord;
  assistantContentText: string;
  messages: MessageRecord[];
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  /** 玩家在设置里手动添加的条目；没选预设时靠它把内容送进提示词 */
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  /** 发送前快照裁剪开关；缺省用默认值（全开） */
  snapshotTrim?: StandaloneSnapshotTrimSettings;
}): StandaloneVariableUpdatePromptSections {
  // 发送用快照：按在场名单裁 NPC、按生存模式裁生存状态、剔 `$` 字段。
  // 注意 renderContext.statData 仍是**完整数据** —— 规则文案的脚本要读「设置」与「人物档案」，
  // 只有快照宏走这份整形结果。
  const snapshotForSend = buildStandaloneSnapshotForChain({
    statData: input.statData,
    settings: input.snapshotTrim ?? DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS,
    chain: 'variable_update',
    texts: [input.assistantContentText, input.latestUserMessage.content_text, input.latestUserMessage.raw_content],
  });

  const renderContext = {
    statData: input.statData,
    messages: input.messages,
    latestUserMessage: input.latestUserMessage,
    worldDifficulty: input.worldDifficulty,
    snapshotStatData: snapshotForSend.snapshot,
    compactSnapshot: snapshotForSend.compact,
  };

  const manifest = resolveStandaloneLocalContentEntries({
    preset: input.selectedPreset ?? null,
    enabledMap: input.localContentEnabledMap,
    builtinRouteOverrides: input.localContentBuiltinRouteOverrides,
    customEntries: input.localContentCustomEntries,
  });

  const renderedBlocks = manifest
    .filter(asset => asset.enabled && (asset.route === 'variable_update' || asset.route === 'shared'))
    .map(asset => {
      const renderedContent = renderResolvedStandaloneLocalContentEntry({
        entry: asset,
        renderContext,
      });
      return {
        asset,
        block: renderedContent ? `[本地内容:${asset.title}]\n${renderedContent}` : '',
      };
    })
    .filter(item => item.block.trim());

  const wbPrompt = renderedBlocks
    .filter(item => item.asset.kind === 'worldbook')
    .map(item => item.block)
    .join('\n\n');

  const mvuUpdatePrompt = renderedBlocks
    .filter(item => item.asset.kind === 'variable_update_rule')
    .map(item => item.block)
    .join('\n\n');

  const variableSnapshotPrompt = buildStandaloneCurrentStatDataBlock(snapshotForSend.snapshot, {
    compact: snapshotForSend.compact,
  });
  const previousUserPrompt = input.latestUserMessage.content_text.trim() || input.latestUserMessage.raw_content.trim();
  const assistantContentPrompt = input.assistantContentText.trim();
  // Fix 4：当商城刷新被触发时，在元指令顶部注入最高优先级任务，避免刷新要求被埋没在
  // mvuUpdatePrompt 中段而被模型忽略（表现为“商城无刷新内容”）。
  const shopRefreshTriggered = Boolean(
    (input.statData as { 设置?: { 积分系统?: { 商城刷新?: unknown } } })?.设置?.积分系统?.商城刷新,
  );
  const shopRefreshDirective = shopRefreshTriggered
    ? normalizeLineEndings(`
[最高优先级任务 · 商城刷新]
玩家已请求刷新商城，本次变量更新必须刷新商城商品。
硬性要求：
- 必须在 <JSONPatch> 中用 replace 覆盖 "/商城/物品" 与 "/商城/技能"，生成与现有完全不同的商品。
- 品质分布参考：普通40%、精良30%、稀有20%、史诗7%、传说3%。
- 价格参考：普通10-50、精良50-150、稀有150-500、史诗500-2000、传说2000-10000。
- 建议生成 4 个物品 + 4 个技能；稀有及以上品质的技能均为超能力。
- 详细字段结构见下方变量更新规则中的“商城刷新任务”。
- 不要输出空的 <JSONPatch>；本回合至少包含上述商城刷新补丁。
`)
    : '';
  const metaSystemPrompt = normalizeLineEndings(`
[Meta.System]
[元命令]
停止角色扮演
不要输出剧情
上文中的剧情是最新,但变量是该剧情发生之前的状态
按照变量输出格式中的要求,在本次回复中更新变量
${shopRefreshDirective ? `\n${shopRefreshDirective}\n` : ''}
硬性要求：
1. 只输出且必须输出一个 <UpdateVariable> 块。
2. <UpdateVariable> 内必须有且只有一个 <Analysis> 和一个 <JSONPatch>。
3. 不要输出 <contenttext>、<summary>、<action_options>、Markdown 代码块或其他文字。${
    shopRefreshTriggered ? '\n4. 本回合商城刷新已触发，<JSONPatch> 不得为空，必须包含商城刷新补丁。' : ''
  }
`);

  return {
    variableSnapshotPrompt,
    wbPrompt,
    previousUserPrompt,
    assistantContentPrompt,
    metaSystemPrompt,
    mvuUpdatePrompt,
  };
}

async function requestAssistantReply(
  api: ApiConfig,
  prompt: StandalonePromptBundle | StandalonePromptMessagesBundle,
  signal: AbortSignal,
  onPartialText?: (text: string) => void,
  firstTokenTimeoutSeconds?: number,
): Promise<StandaloneProviderReply> {
  return requestStandaloneProviderText({
    api,
    prompt,
    signal,
    logPrefix: '[StandaloneLocalTurn]',
    onPartialText,
    firstTokenTimeoutMs:
      typeof firstTokenTimeoutSeconds === 'number' && firstTokenTimeoutSeconds > 0
        ? firstTokenTimeoutSeconds * 1000
        : undefined,
  });
}

/**
 * 只解析回复里的标签（正文 / 总结 / 可选项），**不碰变量补丁**。
 *
 * 主回复从设计上就不携带补丁：主回合提示词明确要求「不要输出 `<UpdateVariable>`」，
 * 而且送进来之前已经先把整个变量更新块剥掉了。补丁只有辅助 API 那一个来源。
 * 因此主回复只需要解析，不需要再走一遍「查补丁 → 应用」。
 */
function parseReplyWithoutPatch(currentStatData: StandaloneStatData, rawReply: string): VariableUpdateApplyResult {
  return {
    parsedReply: parseTaggedAssistantReply(rawReply),
    nextStatData: currentStatData,
    variableUpdateApplied: false,
    errorMessage: null,
    rescueNote: null,
  };
}

function applyVariableUpdateFromReply(
  currentStatData: StandaloneStatData,
  rawReply: string,
  guard?: VariableUpdatePatchGuard,
): VariableUpdateApplyResult {
  const parsedReply = parseTaggedAssistantReply(rawReply);
  const patchText = parsedReply.updateJsonPatchText;

  if (!patchText) {
    return {
      parsedReply,
      nextStatData: currentStatData,
      variableUpdateApplied: false,
      errorMessage: null,
      rescueNote: null,
    };
  }

  // 补丁格式与路径修复层：原文能用就原样返回，不能用才逐步整形；
  // 文本合法后再补一次「漏写 NPC 中间层」的路径（`/人物档案/<NPC>/<字段>` → 补 `个人信息` / `关系数据`）。
  // 结果仍然交回下面这套原流程（解析 → 护栏 → 写入），解析与写入逻辑一行不改。
  const patchTextResolution = resolvePatchTextWithRescue(patchText, currentStatData);

  try {
    const parsedPatch = parseVariableUpdatePatch(patchTextResolution.text);
    // 护栏在这里生效：越界操作（`_` 前缀、生存关闭时的生存状态）直接丢弃，不写进真数据。
    const effectivePatch = guard ? filterVariableUpdatePatch(parsedPatch.patch, guard) : parsedPatch.patch;
    const nextStatData = applyVariableUpdatePatch(currentStatData, effectivePatch);

    return {
      parsedReply,
      nextStatData,
      variableUpdateApplied: effectivePatch.length > 0,
      errorMessage: null,
      rescueNote: patchTextResolution.rescued
        ? `补丁格式有问题，已自动修复：${patchTextResolution.steps.join('、')}`
        : null,
    };
  } catch (error) {
    return {
      parsedReply,
      nextStatData: currentStatData,
      variableUpdateApplied: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      rescueNote: null,
    };
  }
}

function extractUpdateVariableBlock(text: string): string | null {
  const match = text.match(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/i);
  return match?.[0]?.trim() ?? null;
}

function stripUpdateVariableBlocks(text: string): string {
  return text.replace(/\s*<UpdateVariable>[\s\S]*?<\/UpdateVariable>\s*/gi, '\n').trim();
}

function buildAssistantMessagePayload(
  parsedReply: ParsedTaggedAssistantReply,
  rawContent: string,
  debugTrace?: StandaloneAssistantDebugTrace,
  model?: string,
) {
  const contentText = parsedReply.contentText.trim() || rawContent.trim();
  const createdAt = new Date().toISOString();

  return {
    role: 'assistant' as const,
    raw_content: rawContent,
    content_text: contentText,
    think_content: parsedReply.thinkContent,
    summary_content: parsedReply.summaryContent,
    update_content: parsedReply.updateContent,
    action_options: parsedReply.actionOptions,
    formatted: formatMessageContentForDisplay(contentText, 'assistant', -1),
    createdAt,
    variable_update_warning: null,
    debug_trace: debugTrace,
    model,
  };
}

async function requestVariableUpdateSecondPass(
  input: StandaloneLocalTurnInput,
  assistantContentText: string,
  signal: AbortSignal,
  statDataSnapshot: StandaloneStatData,
): Promise<VariableUpdateSecondPassResult> {
  const secondPassPrompt = buildVariableUpdateSecondPassPrompt({
    statData: statDataSnapshot,
    latestUserMessage: input.latestUserMessage,
    assistantContentText,
    messages: input.messages,
    worldDifficulty: input.worldDifficulty,
    localContentEnabledMap: input.localContentEnabledMap,
    localContentBuiltinRouteOverrides: input.localContentBuiltinRouteOverrides,
    localContentCustomEntries: input.localContentCustomEntries,
    selectedPreset: input.selectedPreset ?? null,
    snapshotTrim: input.snapshotTrim,
  });

  const candidateApis = limitApiCandidates(resolveConfiguredAssistantApis(input.assistantApis), input.autoRetry);

  if (candidateApis.length === 0) {
    return {
      updateBlock: null,
      warning: '未找到已保存且完整可用的辅助 API 配置，无法补写变量更新',
      usedApiLabel: null,
    };
  }

  const failures: string[] = [];
  const patchGuard = resolveStandalonePatchGuard(statDataSnapshot);

  for (let index = 0; index < candidateApis.length; index += 1) {
    const api = candidateApis[index]!;
    const apiLabel = toApiLabel(api);
    const attempt = index + 1;

    try {
      const secondPassReply = await requestAssistantReply(api, secondPassPrompt, signal);
      const normalizedSecondPassReply = normalizeLineEndings(secondPassReply.text);
      const updateBlock = extractUpdateVariableBlock(normalizedSecondPassReply);

      if (!updateBlock) {
        failures.push(`${apiLabel}: 未返回合法的 <UpdateVariable> 块`);
        appendStandaloneAiDebugFailure({
          pass: 'variable_update_pass',
          attempt,
          totalAttempts: candidateApis.length,
          trace: secondPassReply.debugTrace,
        });
        continue;
      }

      // 块存在 ≠ 能用。这里先按正式流程把补丁试算一遍（格式化 → 解析 → 写入护栏 → 应用），
      // 只有真的写进状态、界面上会显示「已更新」的候选才收下；否则换下一个继续试。
      // 试算与后面的正式应用读的是同一份状态、同一套护栏，结果一致。
      const trialResult = applyVariableUpdateFromReply(statDataSnapshot, updateBlock, patchGuard);

      if (trialResult.errorMessage) {
        failures.push(`${apiLabel}: 补丁无法应用（${trialResult.errorMessage}）`);
        appendStandaloneAiDebugFailure({
          pass: 'variable_update_pass',
          attempt,
          totalAttempts: candidateApis.length,
          trace: secondPassReply.debugTrace,
        });
        continue;
      }

      if (!trialResult.variableUpdateApplied) {
        failures.push(`${apiLabel}: 补丁未产生有效更新`);
        appendStandaloneAiDebugFailure({
          pass: 'variable_update_pass',
          attempt,
          totalAttempts: candidateApis.length,
          trace: secondPassReply.debugTrace,
        });
        continue;
      }

      return {
        updateBlock,
        warning: null,
        usedApiLabel: apiLabel,
        debugTrace: secondPassReply.debugTrace,
      };
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      failures.push(`${apiLabel}: ${normalizeRemoteApiErrorMessage(error)}`);
      appendStandaloneAiDebugFailure({
        pass: 'variable_update_pass',
        attempt,
        totalAttempts: candidateApis.length,
        trace:
          readStandaloneProviderFailureTrace(error) ??
          createFallbackFailureTrace({ api_label: apiLabel, api_mode: api.source }),
      });
    }
  }

  return {
    updateBlock: null,
    warning: failures.join(' | ') || '变量更新补写失败',
    usedApiLabel: null,
  };
}

const activeParallelVariantControllers = new Set<AbortController>();

export function cancelStandaloneLocalTurn(): void {
  activeStandaloneTurnController?.abort();
  for (const controller of activeParallelVariantControllers) {
    controller.abort();
  }
  activeParallelVariantControllers.clear();
}

async function requestSilentBodyVariant(
  candidateApis: ApiConfig[],
  prompt: StandalonePromptBundle | StandalonePromptMessagesBundle,
  autoRetry: boolean | undefined,
  parentController: AbortController,
): Promise<MessageBodyPage | null> {
  const variantController = new AbortController();
  activeParallelVariantControllers.add(variantController);

  const onParentAbort = () => {
    variantController.abort();
  };
  parentController.signal.addEventListener('abort', onParentAbort, { once: true });

  try {
    for (let index = 0; index < candidateApis.length; index += 1) {
      if (variantController.signal.aborted || parentController.signal.aborted) {
        return null;
      }
      const api = candidateApis[index]!;
      try {
        const reply = await requestAssistantReply(
          api,
          prompt,
          variantController.signal,
          undefined,
          0,
        );
        const rawReply = normalizeLineEndings(reply.text);
        const sanitizedReply = normalizeLineEndings(stripUpdateVariableBlocks(rawReply));
        const parsed = parseTaggedAssistantReply(sanitizedReply);
        const contentText = parsed.contentText.trim() || sanitizedReply;
        if (!contentText) {
          continue;
        }
        return {
          text: contentText,
          raw: sanitizedReply,
          model: reply.model,
        };
      } catch (err) {
        if (variantController.signal.aborted || parentController.signal.aborted) {
          return null;
        }
        console.warn('[StandaloneLocalTurn] 并行正文变体生成失败（静默丢弃）:', err);
        if (!autoRetry && candidateApis.length > 1) {
          break;
        }
      }
    }
    return null;
  } finally {
    parentController.signal.removeEventListener('abort', onParentAbort);
    activeParallelVariantControllers.delete(variantController);
  }
}

export async function runStandaloneLocalTurn(input: StandaloneLocalTurnInput): Promise<StandaloneLocalTurnOutcome> {
  const candidateMainApis = limitApiCandidates(resolveConfiguredMainApis(input.mainApis), input.autoRetry);
  if (candidateMainApis.length === 0) {
    throw new Error('未找到已保存且完整可用的 API 配置');
  }

  if (activeStandaloneTurnController) {
    throw new Error('已有独立模式生成任务正在进行中');
  }

  const controller = new AbortController();
  activeStandaloneTurnController = controller;
  let deferControllerCleanup = false;

  try {
    const prompt = buildMainTurnPrompt(input);
    const failures: string[] = [];
    let lastErrorMessage = '';

    const totalRequests = Math.max(1, Math.min(5, Math.floor(input.bodyRequestCount ?? 1)));
    const extraCount = totalRequests - 1;

    let collectAdditionalPages: Promise<MessageBodyPage[]> | undefined = undefined;
    if (extraCount > 0) {
      const variantPromises: Promise<MessageBodyPage | null>[] = [];
      for (let i = 0; i < extraCount; i += 1) {
        variantPromises.push(
          requestSilentBodyVariant(candidateMainApis, prompt, input.autoRetry, controller),
        );
      }
      collectAdditionalPages = Promise.all(variantPromises).then(results =>
        results.filter((item): item is MessageBodyPage => Boolean(item && item.text.trim())),
      );
    }

    // 主 API 可以有多个候选：第一个失败就换下一个；关掉自动重试时只剩一个
    for (let index = 0; index < candidateMainApis.length; index += 1) {
      const candidateApi = candidateMainApis[index]!;
      const candidateApiLabel = toApiLabel(candidateApi);
      // 请求成功、但后续处理失败时（如「主 API 未返回正文内容」）也要能留档这次的 trace。
      // 每轮重置，避免上一轮的 trace 被误当成这一轮的。
      let lastMainTrace: StandaloneAiDebugPassTrace | null = null;

      try {
        const mainReply = await requestAssistantReply(
          candidateApi,
          prompt,
          controller.signal,
          input.onMainReplyPartialText,
          input.firstTokenTimeoutSeconds,
        );
        lastMainTrace = mainReply.debugTrace;
        const rawReply = normalizeLineEndings(mainReply.text);
        const sanitizedMainReply = normalizeLineEndings(stripUpdateVariableBlocks(rawReply));

        const mainReplyApplyResult = parseReplyWithoutPatch(input.statData, sanitizedMainReply);
        const mainDebugTrace = mergeStandaloneAssistantDebugTrace(undefined, {
          main_pass: {
            ...mainReply.debugTrace,
            extracted_text: sanitizedMainReply,
          },
        });
        const assistantMessage = buildAssistantMessagePayload(
          mainReplyApplyResult.parsedReply,
          sanitizedMainReply,
          mainDebugTrace,
          mainReply.model,
        );
        const assistantContentText = mainReplyApplyResult.parsedReply.contentText.trim() || sanitizedMainReply;
        if (!assistantContentText.trim()) {
          throw new Error('主 API 未返回正文内容，请检查模型是否按要求输出 <contenttext> 正文块');
        }

        deferControllerCleanup = true;

        const finalizeVariableUpdate = (async (): Promise<StandaloneVariableUpdatePhaseOutcome> => {
          await new Promise<void>(resolve => setTimeout(resolve, 0));

          // 正文回来那一刻的数据 = 本回合变量更新的输入基底 S（已含主 API 生成期间的前端改动）。
          // 辅助 API 的提示词与「筛候选」试算都用它 —— 只读这一次，重试候选也复用同一份，
          // 保证候选筛选与正式应用同源，不会因重试期间数据变动而错位。
          const baseStatData = input.readLiveStatData?.() ?? input.statData;

          let applyResult = mainReplyApplyResult;
          let effectiveRawReply = sanitizedMainReply;
          let variableUpdateWarning: string | null = null;
          let variableUpdateApiLabel: string | null = null;
          let variableUpdateStatus: StandaloneVariableUpdateStatus = 'running';
          let debugTrace = mainDebugTrace;

          try {
            const secondPassResult = await requestVariableUpdateSecondPass(
              input,
              assistantContentText,
              controller.signal,
              baseStatData,
            );
            variableUpdateApiLabel = secondPassResult.usedApiLabel;
            if (secondPassResult.debugTrace) {
              debugTrace = mergeStandaloneAssistantDebugTrace(debugTrace, {
                variable_update_pass: secondPassResult.debugTrace,
              });
            }

            if (!secondPassResult.updateBlock) {
              variableUpdateWarning = secondPassResult.warning ?? '补写变量更新失败';
              variableUpdateStatus = variableUpdateWarning ? 'failed' : 'skipped';
            } else {
              const mergedRawReply = replaceOrAppendUpdateVariableBlock(
                sanitizedMainReply,
                secondPassResult.updateBlock,
              );
              // 应用那一刻再读一次：拿到最新的当前数据（含辅助 API 生成期间的前端改动）。
              // 补丁全程只在这一处应用一次，修复层因此成为唯一必经关口，没有第二条路能绕过它。
              const applyBaseStatData = input.readLiveStatData?.() ?? input.statData;
              const mergedApplyResult = applyVariableUpdateFromReply(
                applyBaseStatData,
                mergedRawReply,
                resolveStandalonePatchGuard(applyBaseStatData),
              );

              if (mergedApplyResult.errorMessage) {
                variableUpdateWarning = mergedApplyResult.errorMessage;
                variableUpdateStatus = 'failed';
              } else {
                applyResult = mergedApplyResult;
                effectiveRawReply = mergedRawReply;
                // 修复层整形过补丁时在这里留痕：更新本身是成功的，但玩家要能看见「格式被修过」。
                variableUpdateWarning = mergedApplyResult.rescueNote;
                variableUpdateStatus = applyResult.variableUpdateApplied ? 'success' : 'skipped';
              }
            }
          } catch (error) {
            if (controller.signal.aborted) {
              throw error;
            }

            variableUpdateWarning = error instanceof Error ? error.message : String(error);
            variableUpdateStatus = 'failed';
          }

          const usedApiLabel =
            variableUpdateApiLabel && variableUpdateApiLabel !== candidateApiLabel
              ? `${candidateApiLabel} + ${variableUpdateApiLabel}`
              : candidateApiLabel;

          return {
            assistantMessage: {
              ...buildAssistantMessagePayload(applyResult.parsedReply, effectiveRawReply, debugTrace, mainReply.model),
              variable_update_status: variableUpdateStatus,
              variable_update_warning: variableUpdateWarning,
            },
            nextStatData: applyResult.nextStatData,
            variableUpdateApplied: applyResult.variableUpdateApplied,
            variableUpdateWarning,
            variableUpdateStatus,
            usedApiLabel,
          };
        })().finally(() => {
          if (activeStandaloneTurnController === controller) {
            activeStandaloneTurnController = null;
          }
        });

        const initialPages: MessageBodyPage[] = [
          {
            text: assistantContentText,
            raw: sanitizedMainReply,
            model: mainReply.model,
          },
        ];

        return {
          assistantMessage: {
            ...assistantMessage,
            body_pages: extraCount > 0 ? initialPages : undefined,
            body_page_index: extraCount > 0 ? 0 : undefined,
            variable_update_status: 'running',
            variable_update_warning: null,
          },
          usedApiLabel: candidateApiLabel,
          finalizeVariableUpdate,
          collectAdditionalPages,
        };
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error('standalone_local_turn_aborted');
        }

        const message = normalizeRemoteApiErrorMessage(error);
        lastErrorMessage = message;
        failures.push(`${candidateApiLabel}: ${message}`);

        console.warn('[StandaloneLocalTurn] 主 API 调用失败:', {
          source: candidateApi.source,
          model: candidateApi.model,
          message,
          attempt: index + 1,
          totalAttempts: candidateMainApis.length,
        });

        // 失败请求也留档：弹窗消失后，AI 调试页仍能看到「打到哪、服务端回了什么」。
        appendStandaloneAiDebugFailure({
          pass: 'main_pass',
          attempt: index + 1,
          totalAttempts: candidateMainApis.length,
          trace:
            readStandaloneProviderFailureTrace(error) ??
            lastMainTrace ??
            createFallbackFailureTrace({ api_label: candidateApiLabel, api_mode: candidateApi.source }),
        });
      }
    }

    throw new Error(failures.length > 1 ? failures.join(' | ') : lastErrorMessage || '独立模式主 API 调用失败');
  } finally {
    if (!deferControllerCleanup) {
      for (const parallelController of activeParallelVariantControllers) {
        parallelController.abort();
      }
      activeParallelVariantControllers.clear();
      if (activeStandaloneTurnController === controller) {
        activeStandaloneTurnController = null;
      }
    }
  }
}

// ===== 抽奖独立请求 =====

export type StandaloneLotteryTurnInput = {
  /** 抽奖 API 候选；为空时回退主 API */
  lotteryApis?: ApiConfig[];
  /** 主 API 候选（抽奖 API 未配置时回退用） */
  mainApis: ApiConfig[];
  autoRetry?: boolean;
  firstTokenTimeoutSeconds?: number;
  statData: StandaloneStatData;
  messages: MessageRecord[];
  /** 前端算好的本次每次抽奖品质，顺序对应第 1..N 次 */
  qualities: string[];
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  snapshotTrim?: StandaloneSnapshotTrimSettings;
  onPartialText?: (text: string) => void;
};

export type StandaloneLotteryTurnOutcome = {
  assistantMessage: Omit<MessageRecord, 'message_id'>;
  nextStatData: StandaloneStatData;
  variableUpdateApplied: boolean;
  variableUpdateWarning: string | null;
  usedApiLabel: string;
};

/**
 * 审稿 / 改稿请求的输入：两者共用同一套上下文取数。
 */
export type StandaloneStoryPromptInput = {
  /** 待审 / 待改的正文 */
  contentText: string;
  /** 审稿意见；只有改稿用得到 */
  reviewIssues?: string;
  statData: StandaloneStatData;
  messages: MessageRecord[];
  /** 待审 / 待改的那条 AI 回复；组装上下文时排除它，避免与正文重复 */
  targetMessage: MessageRecord;
  worldDifficulty: WorldDifficulty;
  localContentEnabledMap: Record<string, boolean>;
  localContentBuiltinRouteOverrides: StandaloneBuiltinAssetRouteOverrideMap;
  /** 玩家在设置里手动添加的条目；没选预设时靠它把内容送进提示词 */
  localContentCustomEntries?: LocalContentEntryConfig[];
  selectedPreset?: PresetConfig | null;
  /** 发送前快照裁剪开关；缺省用默认值（全开） */
  snapshotTrim?: StandaloneSnapshotTrimSettings;
  /** 玩家手动归档出来的整体剧情摘要，空＝还没归档过 */
  stageSummary?: string;
  /** 归档水位线：message_id 小于等于它的回合已被上面那段覆盖 */
  archivedUntilMessageId?: number;
};

/**
 * 组装审稿 / 改稿的上下文取值（快照 / 世界书 / 前情提要 / 最近 8 轮）。
 *
 * 口径与正文链完全一致：同一套取数、同一个窗口大小、同一个世界书筛选，
 * 保证「审稿看到的历史」就是「写正文时看到的历史」。
 * 唯一区别：排除待审的那条 AI 回复本身 —— 它的正文由模板里的「待审正文」单独给出，避免重复。
 */
function buildStoryPromptContextValues(input: StandaloneStoryPromptInput): Record<string, string> {
  const snapshotForSend = buildStandaloneSnapshotForChain({
    statData: input.statData,
    settings: input.snapshotTrim ?? DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS,
    chain: 'main',
  });

  const localContentBlocks = resolveStandaloneLocalContentBlocks({
    route: 'main',
    enabledMap: input.localContentEnabledMap,
    builtinRouteOverrides: input.localContentBuiltinRouteOverrides,
    customEntries: input.localContentCustomEntries,
    preset: input.selectedPreset,
    renderContext: {
      statData: input.statData,
      messages: input.messages,
      latestUserMessage: null,
      worldDifficulty: input.worldDifficulty,
      snapshotStatData: snapshotForSend.snapshot,
      compactSnapshot: snapshotForSend.compact,
    },
  });

  const worldbookPrompt = resolveStandaloneMainWorldbookPrompt(localContentBlocks);
  const priorSummaryBlock = buildStandalonePriorSummaryBlock({
    messages: input.messages,
    latestUserMessage: input.targetMessage,
    stageSummary: input.stageSummary,
    archivedUntilMessageId: input.archivedUntilMessageId,
    statData: input.statData,
  });

  const historyText = resolveStandaloneRecentHistoryMessages({
    messages: input.messages.filter(message => message.message_id !== input.targetMessage.message_id),
  })
    .map(message => `${message.role === 'user' ? '玩家' : '剧情'}：${message.content}`)
    .join('\n\n');

  return {
    快照: buildStandaloneCurrentStatDataBlock(snapshotForSend.snapshot, {
      compact: snapshotForSend.compact,
    }),
    世界书条目: worldbookPrompt || '（本预设未配置世界书）',
    '更早的小总结': priorSummaryBlock || '（无）',
    '最近 8 轮原文': historyText || '（无）',
    正文: input.contentText,
    问题清单: input.reviewIssues ?? '',
  };
}

/** 把模板里的 `{{槽位}}` 换成实际内容；未命中的槽位原样保留，方便发现漏配。 */
function fillStoryPromptTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key]! : match,
  );
}

/** 组装审稿请求：上下文 + 审稿规则 + 待审正文（一条 user 消息）。 */
export function buildStoryReviewPrompt(input: StandaloneStoryPromptInput): StandalonePromptMessagesBundle {
  return {
    messages: [
      {
        role: 'user',
        content: fillStoryPromptTemplate(storyReviewPromptTemplate, buildStoryPromptContextValues(input)).trim(),
      },
    ],
  };
}

/** 组装改稿请求：上下文 + 改稿规则 + 待改正文 + 审稿意见（一条 user 消息）。 */
export function buildStoryRevisePrompt(input: StandaloneStoryPromptInput): StandalonePromptMessagesBundle {
  return {
    messages: [
      {
        role: 'user',
        content: fillStoryPromptTemplate(storyRevisePromptTemplate, buildStoryPromptContextValues(input)).trim(),
      },
    ],
  };
}

export type StandaloneReviewReviseInput = StandaloneStoryPromptInput & {
  /** 审稿 / 改稿 API 都为空时回退到它 */
  mainApis: ApiConfig[];
  reviewApis?: ApiConfig[];
  reviseApis?: ApiConfig[];
  /** 前一个失败时是否自动试下一个；缺省 true */
  autoRetry?: boolean;
};

export type StandaloneReviewReviseOutcome = {
  /** 改稿后的正文；失败时为 null（调用方据此决定「不动原正文」） */
  revisedContentText: string | null;
  /** 审稿问题清单：只用于控制台留档，不给玩家看 */
  reviewIssues: string | null;
  /** 失败原因；成功时为 null */
  warning: string | null;
  usedReviewApiLabel: string | null;
  usedReviseApiLabel: string | null;
  /**
   * 本次改稿实际用到的模型名（优先服务端回传的名字，拿不到就用配置里的名字）。
   *
   * 正文换手给改稿模型之后，楼层标题要跟着换 —— 否则显示的还是「原始正文是谁写的」。
   * 只有成功改稿才有值；失败时为 undefined，调用方据此不动原模型名。
   */
  revisedModel?: string;
  reviewTrace?: StandaloneAiDebugPassTrace;
  reviseTrace?: StandaloneAiDebugPassTrace;
};

/**
 * 「审稿 → 改稿」独立请求：先审出问题清单，再按清单改一遍正文（只改文字表面）。
 *
 * - 与正文链共用同一套上下文取数（口径见 `buildStoryPromptContextValues`）；
 * - 审稿 / 改稿 API 为空时各自回退主 API；
 * - 任一步失败都不返回新正文（`revisedContentText: null`），调用方据此不动原正文；
 * - 两次请求的 trace 都会回传，供「控制台调试」留档；
 * - 自建取消控制器并登记为当前任务，界面「停止」按钮可中断（与抽奖同一套规矩）。
 */
export async function runStandaloneReviewRevise(
  input: StandaloneReviewReviseInput,
): Promise<StandaloneReviewReviseOutcome> {
  if (activeStandaloneTurnController) {
    throw new Error('已有独立模式生成任务正在进行中');
  }

  const controller = new AbortController();
  activeStandaloneTurnController = controller;

  try {
    return await runStandaloneReviewReviseInner(input, controller.signal);
  } finally {
    if (activeStandaloneTurnController === controller) {
      activeStandaloneTurnController = null;
    }
  }
}

async function runStandaloneReviewReviseInner(
  input: StandaloneReviewReviseInput,
  signal: AbortSignal,
): Promise<StandaloneReviewReviseOutcome> {
  const reviewCandidates = limitApiCandidates(
    resolveConfiguredMainApis(input.reviewApis?.length ? input.reviewApis : input.mainApis),
    input.autoRetry,
  );
  if (reviewCandidates.length === 0) {
    return {
      revisedContentText: null,
      reviewIssues: null,
      warning: '未找到已保存且完整可用的审稿 API 配置',
      usedReviewApiLabel: null,
      usedReviseApiLabel: null,
    };
  }

  const reviewPrompt = buildStoryReviewPrompt(input);
  const reviewFailures: string[] = [];
  let reviewIssues: string | null = null;
  let reviewTrace: StandaloneAiDebugPassTrace | undefined;
  let usedReviewApiLabel: string | null = null;

  for (const api of reviewCandidates) {
    const apiLabel = toApiLabel(api);
    try {
      const reply = await requestAssistantReply(api, reviewPrompt, signal);
      reviewTrace = reply.debugTrace;
      const reviewText = normalizeLineEndings(reply.text).trim();
      if (!reviewText) {
        reviewFailures.push(`${apiLabel}: 审稿未返回内容`);
        continue;
      }
      reviewIssues = reviewText;
      usedReviewApiLabel = apiLabel;
      break;
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      // 失败的请求也要能在「控制台调试」里看到 —— 从异常上把请求快照取回来。
      reviewTrace = readStandaloneProviderFailureTrace(error) ?? reviewTrace;
      reviewFailures.push(`${apiLabel}: ${normalizeRemoteApiErrorMessage(error)}`);
    }
  }

  if (!reviewIssues) {
    return {
      revisedContentText: null,
      reviewIssues: null,
      warning: reviewFailures.join(' | ') || '审稿失败',
      usedReviewApiLabel: null,
      usedReviseApiLabel: null,
      reviewTrace,
    };
  }

  const reviseCandidates = limitApiCandidates(
    resolveConfiguredMainApis(input.reviseApis?.length ? input.reviseApis : input.mainApis),
    input.autoRetry,
  );
  if (reviseCandidates.length === 0) {
    return {
      revisedContentText: null,
      reviewIssues,
      warning: '未找到已保存且完整可用的改稿 API 配置',
      usedReviewApiLabel,
      usedReviseApiLabel: null,
      reviewTrace,
    };
  }

  const revisePrompt = buildStoryRevisePrompt({ ...input, reviewIssues });
  const reviseFailures: string[] = [];
  let reviseTrace: StandaloneAiDebugPassTrace | undefined;

  for (const api of reviseCandidates) {
    const apiLabel = toApiLabel(api);
    try {
      const reply = await requestAssistantReply(api, revisePrompt, signal);
      reviseTrace = reply.debugTrace;
      const revisedText = parseTaggedAssistantReply(normalizeLineEndings(reply.text)).contentText.trim();
      if (!revisedText) {
        reviseFailures.push(`${apiLabel}: 改稿未返回正文`);
        continue;
      }
      return {
        revisedContentText: revisedText,
        reviewIssues,
        warning: null,
        usedReviewApiLabel,
        usedReviseApiLabel: apiLabel,
        reviewTrace,
        reviseTrace,
        revisedModel: reply.model ?? api.model,
      };
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      // 同上：改稿失败也要留痕，控制台才看得到这次请求。
      reviseTrace = readStandaloneProviderFailureTrace(error) ?? reviseTrace;
      reviseFailures.push(`${apiLabel}: ${normalizeRemoteApiErrorMessage(error)}`);
    }
  }

  return {
    revisedContentText: null,
    reviewIssues,
    warning: reviseFailures.join(' | ') || '改稿失败',
    usedReviewApiLabel,
    usedReviseApiLabel: null,
    reviewTrace,
    reviseTrace,
  };
}

/**
 * 组装抽奖请求：变量快照 + 物品 / 技能规则 + 最近一段剧情上下文 + 抽奖专用提示词。
 *
 * 刻意不带预设主提示词与世界书 —— 抽奖不是剧情回合，只给模型「当前局势 + 最近剧情 + 抽奖规则」，
 * 让它专注按前端指定的品质生成物品/技能，避免把抽奖写成剧情。
 */
function buildLotteryTurnPrompt(input: StandaloneLotteryTurnInput): StandalonePromptMessagesBundle {
  const snapshotForSend = buildStandaloneSnapshotForChain({
    statData: input.statData,
    settings: input.snapshotTrim ?? DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS,
    chain: 'main',
  });

  const rendered = renderStandaloneLocalContentTemplate({
    template: lotteryRequestPromptTemplate,
    renderContext: {
      statData: input.statData,
      messages: input.messages,
      latestUserMessage: null,
      worldDifficulty: input.worldDifficulty,
      snapshotStatData: snapshotForSend.snapshot,
      compactSnapshot: snapshotForSend.compact,
      extraVars: {
        lottery: { qualities: input.qualities },
      },
    },
    sourceName: 'lottery-request-prompt',
  });

  const messages: StandaloneProviderChatMessage[] = [
    {
      role: 'user',
      content: buildStandaloneCurrentStatDataBlock(snapshotForSend.snapshot, {
        compact: snapshotForSend.compact,
      }),
    },
    // 物品与技能规则紧跟快照：先给「当前局势」，再给「物品 / 技能 / 品质的定义」，
    // 最后才是抽奖规则。抽奖请求不带 variable-update-rules，这份是它的字段契约来源。
    {
      role: 'user',
      content: lotteryItemSkillRulesTemplate.trim(),
    },
  ];

  // 带上最近一段剧情上下文：只给一条 AI 回复时，模型看不到「玩家此刻在哪、在做什么」，
  // 只能凭变量快照猜。这里复用主链的最近窗口（同一常量、同一过滤口径），保留原始
  // user / assistant 角色，让抽奖请求看到最近几轮实际发生了什么。
  messages.push(...resolveStandaloneRecentHistoryMessages({ messages: input.messages }));

  messages.push({ role: 'user', content: rendered.content.trim() });

  return { messages };
}

/**
 * 抽奖独立请求：一次请求返回抽奖结果（`<contenttext>`）+ 写入补丁（`<JSONPatch>`）。
 *
 * - 与主链共用同一个「正在生成」控制器，因此抽奖期间无法发起剧情回合；
 * - 补丁复用与变量更新完全相同的修复层与写入护栏；
 * - 候选 API 逐个尝试：正文缺失 / 补丁无法应用 / 补丁没产生更新，都换下一个。
 */
export async function runStandaloneLotteryTurn(
  input: StandaloneLotteryTurnInput,
): Promise<StandaloneLotteryTurnOutcome> {
  const lotteryCandidates = input.lotteryApis?.length ? input.lotteryApis : input.mainApis;
  const candidateApis = limitApiCandidates(resolveConfiguredMainApis(lotteryCandidates), input.autoRetry);

  if (candidateApis.length === 0) {
    throw new Error('未找到已保存且完整可用的抽奖 API 配置');
  }

  if (activeStandaloneTurnController) {
    throw new Error('已有独立模式生成任务正在进行中');
  }

  const controller = new AbortController();
  activeStandaloneTurnController = controller;

  try {
    const prompt = buildLotteryTurnPrompt(input);
    const failures: string[] = [];
    let lastErrorMessage = '';

    for (let index = 0; index < candidateApis.length; index += 1) {
      const api = candidateApis[index]!;
      const apiLabel = toApiLabel(api);

      try {
        const reply = await requestAssistantReply(
          api,
          prompt,
          controller.signal,
          input.onPartialText,
          input.firstTokenTimeoutSeconds,
        );
        const rawReply = normalizeLineEndings(reply.text);
        // 每次候选 API 尝试都从「发送抽奖那一刻」的同一份快照重算，不在上一次尝试的结果上累积。
        const applyBaseStatData = input.statData;
        const applyResult = applyVariableUpdateFromReply(
          applyBaseStatData,
          rawReply,
          resolveStandalonePatchGuard(applyBaseStatData),
        );
        const assistantContentText = applyResult.parsedReply.contentText.trim();

        if (!assistantContentText) {
          failures.push(`${apiLabel}: 未返回抽奖结果内容`);
          appendStandaloneAiDebugFailure({
            pass: 'lottery_pass',
            attempt: index + 1,
            totalAttempts: candidateApis.length,
            trace: reply.debugTrace,
          });
          continue;
        }

        if (applyResult.errorMessage) {
          failures.push(`${apiLabel}: 补丁无法应用（${applyResult.errorMessage}）`);
          appendStandaloneAiDebugFailure({
            pass: 'lottery_pass',
            attempt: index + 1,
            totalAttempts: candidateApis.length,
            trace: reply.debugTrace,
          });
          continue;
        }

        if (!applyResult.variableUpdateApplied) {
          failures.push(`${apiLabel}: 未返回有效的抽奖补丁`);
          appendStandaloneAiDebugFailure({
            pass: 'lottery_pass',
            attempt: index + 1,
            totalAttempts: candidateApis.length,
            trace: reply.debugTrace,
          });
          continue;
        }

        const debugTrace = mergeStandaloneAssistantDebugTrace(undefined, {
          main_pass: {
            ...reply.debugTrace,
            extracted_text: rawReply,
          },
        });
        const nextStatData = applyResult.nextStatData;
        const warning = applyResult.rescueNote;

        return {
          assistantMessage: {
            ...buildAssistantMessagePayload(applyResult.parsedReply, rawReply, debugTrace, reply.model),
            variable_update_status: 'success',
            variable_update_warning: warning,
          },
          nextStatData,
          variableUpdateApplied: true,
          variableUpdateWarning: warning,
          usedApiLabel: apiLabel,
        };
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error('standalone_lottery_aborted');
        }

        const message = normalizeRemoteApiErrorMessage(error);
        lastErrorMessage = message;
        failures.push(`${apiLabel}: ${message}`);

        appendStandaloneAiDebugFailure({
          pass: 'lottery_pass',
          attempt: index + 1,
          totalAttempts: candidateApis.length,
          trace:
            readStandaloneProviderFailureTrace(error) ??
            createFallbackFailureTrace({ api_label: apiLabel, api_mode: api.source }),
        });
      }
    }

    throw new Error(failures.length > 1 ? failures.join(' | ') : lastErrorMessage || '抽奖 API 调用失败');
  } finally {
    if (activeStandaloneTurnController === controller) {
      activeStandaloneTurnController = null;
    }
  }
}
