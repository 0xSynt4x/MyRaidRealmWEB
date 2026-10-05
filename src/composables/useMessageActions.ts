import { Schema } from '../../schema/schema';
import { nextTick } from 'vue';
import { useActionInputStore } from '../stores/actionInput';
import { tCurrent } from '../i18n';
import { useMessagesStore, type MessageRecord } from '../stores/messages';
import { useNotificationStore } from '../stores/notification';
import { useStatDataStore } from '../stores/statData';
import { useSetupStore } from '../stores/setup';
import { saveStandaloneAutoArchive } from '../utils/archive';
import { formatMessageContentForDisplay } from '../utils/messageFormatting';
import { notify } from '../utils/notify';
import { commitStandaloneRuntimeStateFromStores, resolveStandaloneStageSummaryState } from '../utils/standaloneRuntime';
import { resolveStandaloneStageSummaryProgress } from '../utils/stageSummaryArchive';
import { loadStandaloneStatData } from '../utils/standaloneStatData';
import { replaceOrAppendSummaryBlock, splitEditableBodyAndSummary } from '../utils/taggedReply';
import { FRONTEND_AUTHORITATIVE_FIELD_PATHS } from '../utils/frontendAuthoritativeState';
import {
  runStandaloneLocalTurn,
  runStandaloneLotteryTurn,
  runStandaloneVariableUpdatePass,
  type StandaloneVariableUpdatePhaseOutcome,
} from '../utils/standaloneLocalTurn';
import { useSettingsStore } from '../stores/settings';
import { useLotteryStore } from '../stores/lottery';
import { useStatDataActions } from '../stores/statDataActions';

/**
 * 一次抽奖的入参。品质清单、扣费与保底进度都由前端算好再传进来 ——
 * 抽奖 AI 只负责「按前端指定的品质生成物品/技能」，不参与概率与保底判定。
 */
type SendStandaloneLotteryDrawOptions = {
  /** 本次抽奖次数（1 = 单抽、10 = 十连…） */
  count: number;
  /** 前端算好的每次品质，顺序对应第 1..N 次 */
  qualities: string[];
  /** 抽奖后的累计抽奖次数（保底进度），落地到会话存档 */
  pityCountAfter: number;
  /** 本次扣除的积分 */
  cost: number;
  /** 聊天流里那条抽奖请求的显示文案 */
  requestLabel: string;
};

/**
 * 消息操作 Composable
 *
 * 职责：
 * 1. 封装删除、编辑、重新生成等操作逻辑
 * 2. 统一处理确认对话框（使用页面内对话框）
 * 3. 协调多个 Store 的状态更新
 */
export function useMessageActions() {
  const messagesStore = useMessagesStore();
  const actionInputStore = useActionInputStore();
  const statDataStore = useStatDataStore();
  const notificationStore = useNotificationStore();
  const settingsStore = useSettingsStore();
  const setupStore = useSetupStore();
  const lotteryStore = useLotteryStore();
  const statDataActions = useStatDataActions();
  const STANDALONE_GENERATION_EVENT = 'th1980s:standalone-generation-state';

  function emitStandaloneGenerationState(active: boolean, reason: string) {
    messagesStore.setStandaloneMainGenerationBusy(active);
    window.dispatchEvent(
      new CustomEvent(STANDALONE_GENERATION_EVENT, {
        detail: { active, reason },
      }),
    );
  }

  function isStandaloneTurnBusy() {
    return messagesStore.isStandaloneGenerationLocked;
  }

  function guardStandaloneBusyAction() {
    if (!isStandaloneTurnBusy()) {
      return false;
    }

    notificationStore.info(
      settingsStore.locale === 'en'
        ? 'Please wait for the current standalone reply to finish or stop it first.'
        : '请先等待当前独立模式回复结束，或先停止生成。',
    );
    return true;
  }

  function syncAfterTimelineChange(reason: string) {
    messagesStore.syncVisibleWindow(reason);
    statDataStore.handleTimelineRollback(reason);
    // 抽奖进度也跟着楼层走：剩下的最后一条抽奖记录决定当前保底进度
    restoreLotteryStateAfterTimelineChange(reason);
  }

  function resolveStandaloneSnapshotForMessage(
    record: MessageRecord | undefined,
    reason: string,
  ): ReturnType<typeof Schema.parse> {
    if (record?.stat_data_snapshot) {
      return Schema.parse(record.stat_data_snapshot);
    }

    console.warn(`[MessageActions] 未找到楼层快照，改用当前 standalone stat_data reason=${reason}`);
    return Schema.parse(loadStandaloneStatData());
  }

  function restoreStandaloneSnapshot(snapshot: ReturnType<typeof Schema.parse>, reason: string) {
    // 回退到历史楼层旧快照：所有字段（含积分 / 商城刷新 / 签到日期）一起回退，
    // 保证「回滚 = 回到过去」—— 资源与物品不会脱钩（买了东西回滚，物品和积分一起回来）。
    commitStandaloneRuntimeStateFromStores({
      statData: snapshot,
    });
    statDataStore.refreshData(`${reason}:restore_snapshot`);
    // 回退到旧快照时，抽奖进度同样回退到该楼层记录的值
    restoreLotteryStateAfterTimelineChange(`${reason}:restore_snapshot`);
  }

  function isAbortLikeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /abort|aborted|cancel|stopped/i.test(message);
  }

  function markStandaloneVariableUpdateInterrupted(input: { reason: string; messageId: number }) {
    const warning =
      settingsStore.locale === 'en' ? 'Variable update was stopped before it finished.' : '变量更新在完成前已停止。';

    messagesStore.patchMessageRecord(input.messageId, {
      variable_update_status: 'failed',
      variable_update_warning: warning,
      stat_data_snapshot: loadStandaloneStatData(),
    });
    messagesStore.setStandaloneAssistantGenerationBusy(false);
    messagesStore.syncStandaloneRuntimeContentContext(`${input.reason}:variable_update_aborted`);
    notificationStore.info(
      settingsStore.locale === 'en'
        ? 'The main reply was kept, but variable update was stopped.'
        : '正文已保留，但变量更新已停止。',
    );
  }

  function markStandaloneVariableUpdateFailed(input: { reason: string; messageId: number; errorMessage: string }) {
    messagesStore.setStandaloneAssistantGenerationBusy(false);
    messagesStore.patchMessageRecord(input.messageId, {
      variable_update_status: 'failed',
      variable_update_warning: input.errorMessage,
      stat_data_snapshot: loadStandaloneStatData(),
    });
    messagesStore.syncStandaloneRuntimeContentContext(`${input.reason}:failed`);
  }

  /**
   * 每轮收尾检查一次：掉出窗口、还没被阶段总结覆盖的小总结攒够阈值了，
   * 就提醒玩家去「设置 → 存档管理」手动归档。
   *
   * 只提醒不自动跑 —— 归档要花主 API 的钱，必须玩家自己点。
   */
  function notifyStageSummaryArchiveDueIfNeeded(reason: string) {
    try {
      const progress = resolveStandaloneStageSummaryProgress();

      if (!progress.isDue) {
        return;
      }

      notify.warning(
        tCurrent('contentCenter.archive.stageSummaryDueToast', {
          pending: progress.pendingCount,
          threshold: progress.threshold,
        }),
      );
      console.info('[StageSummary] 已提示玩家归档:', {
        reason,
        pendingCount: progress.pendingCount,
        threshold: progress.threshold,
      });
    } catch (error) {
      console.warn('[StageSummary] 检查归档提示失败:', error);
    }
  }

  async function generateStandaloneAssistantReply(
    latestUserMessageId: number,
    reason: string,
  ): Promise<boolean> {
    const latestUserMessage = messagesStore.getMessage(latestUserMessageId);
    if (!latestUserMessage || latestUserMessage.role !== 'user') {
      notificationStore.error(tCurrent('messageActions.resendUnavailable'));
      return false;
    }

    try {
      emitStandaloneGenerationState(true, reason);
      messagesStore.lockMainReplyTarget(latestUserMessage.message_id, reason);
      messagesStore.beginStreamingSession(reason);

      // 记录本回合「开始时」的商城刷新基线值，供收尾对账区分「历史触发」与「回合中途玩家新点击的刷新」。
      const turnStartStatData = loadStandaloneStatData();
      const turnStartShopRefresh = Boolean(_.get(turnStartStatData, '设置.积分系统.商城刷新', false));
      // 阶段总结 + 归档水位线：告诉拼提示词的那一层，哪些早期回合已经被压过了
      const stageSummaryState = resolveStandaloneStageSummaryState();

      const outcome = await runStandaloneLocalTurn({
        mainApis: settingsStore.mainApis,
        assistantApis: settingsStore.assistantApis,
        autoRetry: settingsStore.apiAutoRetry,
        // 关掉开关就传 0，运行时不启用看门狗，行为与之前一致
        firstTokenTimeoutSeconds: settingsStore.apiFirstTokenTimeout ? settingsStore.apiFirstTokenTimeoutSeconds : 0,
        statData: turnStartStatData,
        // 让运行时在「正文回来」与「应用补丁」两个时点都能读到最新的当前数据：
        // 辅助 API 的输入基底 S 与最终的应用基底都从这里取，生成期间的前端改动因此不会丢。
        readLiveStatData: () => loadStandaloneStatData(),
        messages: messagesStore.messages,
        latestUserMessage,
        worldDifficulty: settingsStore.worldDifficulty,
        localContentEnabledMap: settingsStore.standaloneLocalContent.enabledAssets,
        localContentBuiltinRouteOverrides: settingsStore.standaloneLocalContent.builtinAssetRouteOverrides,
        localContentCustomEntries: setupStore.customWorldbookEntries,
        selectedPreset: setupStore.selectedPreset,
        snapshotTrim: settingsStore.snapshotTrim,
        stageSummary: stageSummaryState.stageSummary,
        archivedUntilMessageId: stageSummaryState.archivedUntilMessageId,
        onMainReplyPartialText: partialText => {
          messagesStore.updateStandaloneStreamingPreview(partialText, reason);
        },
      });

      messagesStore.flushStreamingProjection(`${reason}:main_reply_completed`);

      // 正文回来那一刻的数据，同时落两份：
      // - stat_data_snapshot：本楼层的展示 / 回退快照（回合收尾会被覆盖成最终状态）；
      // - variable_update_base_snapshot：本回合变量更新的输入基底 S（此后不再改动），供手动刷新取基点。
      // 🔴 这份 S 必须与 runtime finalize 起点 readLiveStatData() 读到的值相等 ——
      //    从 append 到那里之间不写 session，两者读的是同一份数据。
      const baseSnapshot = loadStandaloneStatData();
      const appendedAssistantMessage = messagesStore.appendStandaloneMessage({
        ...outcome.assistantMessage,
        stat_data_snapshot: baseSnapshot,
        variable_update_base_snapshot: baseSnapshot,
      });
      messagesStore.settleStreamingWithFormalMessage(appendedAssistantMessage.message_id);
      messagesStore.syncStandaloneRuntimeContentContext(`${reason}:${outcome.usedApiLabel}:main_reply`);
      emitStandaloneGenerationState(false, reason);
      await nextTick();

      messagesStore.patchMessageRecord(appendedAssistantMessage.message_id, {
        variable_update_status: 'running',
        variable_update_warning: null,
        stat_data_snapshot: loadStandaloneStatData(),
        debug_trace: outcome.assistantMessage.debug_trace,
      });
      messagesStore.setStandaloneAssistantGenerationBusy(true);
      await nextTick();

      try {
        const variableUpdateOutcome = await outcome.finalizeVariableUpdate;
        applyStandaloneVariableUpdatePhase({
          reason,
          messageId: appendedAssistantMessage.message_id,
          phaseOutcome: variableUpdateOutcome,
          turnStartShopRefresh,
        });
      } catch (error) {
        if (isAbortLikeError(error)) {
          markStandaloneVariableUpdateInterrupted({
            reason,
            messageId: appendedAssistantMessage.message_id,
          });
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          markStandaloneVariableUpdateFailed({
            reason,
            messageId: appendedAssistantMessage.message_id,
            errorMessage,
          });
          notificationStore.error(
            settingsStore.locale === 'en'
              ? `Reply received, but variable update failed: ${errorMessage}`
              : `正文已收到，但变量更新失败：${errorMessage}`,
          );
        }
      } finally {
        emitStandaloneGenerationState(false, reason);
      }

      // 这一轮彻底收尾了，看看该不该提醒玩家归档阶段总结
      notifyStageSummaryArchiveDueIfNeeded(reason);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === 'standalone_local_turn_aborted') {
        messagesStore.flushStreamingProjection(`${reason}:aborted`);
        messagesStore.keepStreamingPreviewAsPartial(`${reason}:aborted`);
      }
      if (errorMessage !== 'standalone_local_turn_aborted') {
        notificationStore.error(
          settingsStore.locale === 'en'
            ? `Standalone reply generation failed: ${errorMessage}`
            : `独立模式生成回复失败：${errorMessage}`,
        );
      }
      return false;
    } finally {
      // 总保险：无论上面走到哪个分支、是否有异常，都强制把两个忙碌标志清零，
      // 确保发送按钮一定能恢复闲置态。消息的 variable_update_status 由各分支单独处理。
      emitStandaloneGenerationState(false, reason);
      messagesStore.setStandaloneAssistantGenerationBusy(false);
    }
  }

  /**
   * 回合收尾时对前端权威状态做兜底对账，避免依赖 AI 自觉维护触发标志与前端专属字段。
   *
   * - Fix 1（商城刷新兜底重置）：`设置.积分系统.商城刷新` 是前端一次性触发开关。它只应清除「本
   *   回合开始时就已存在的那次刷新请求」，绝不能连带清除「本回合生成期间玩家新点击刷新写入的
   *   请求」——否则会出现竞态吞请求：上一回合的异步收尾晚于玩家新点的刷新执行，就会把玩家刚写的
   *   true 覆盖回 false，导致下一回合 AI 收不到刷新任务（表现为商城无刷新内容）。因此这里用
   *   `turnStartShopRefresh`（回合开始基线值）判断：仅当回合开始时该标志本就为 true，且本回合商城
   *   内容确实变化（AI 已执行刷新）时才归零；其余情况一律保留 candidate/实时里的最新值，让玩家新
   *   请求或未完成的刷新得以在下一回合重试。
   * - Fix 2（签到日期前端权威）：`设置.积分系统.上次签到日期` 由前端签到逻辑独占维护。AI 若对
   *   `设置.积分系统` 做粗粒度覆盖会清掉该字段，导致同一天可重复签到。这里回合结束后统一用回合
   *   开始前的权威值覆盖回去，确保 AI 无法改写签到日期。
   * - Fix 3（积分数量前端权威）：`玩家.货币资源.次级货币.积分.数量` 只由前端签到/兑换/购买增减，
   *   AI 规则明确「不可更新」。AI 若对货币子树做粗粒度 replace 会误改/抹掉积分，这里回合结束后用
   *   实时权威值强制回写，确保积分余额不被 AI 覆盖（对应商城点了签到后积分被打回初始的问题）。
   *
   * @param candidate 回合产出的候选状态（变量更新已应用时为「应用那一刻的当前数据 + 补丁」，
   *                  否则为回合前状态 —— 补丁缺失/应用失败时前端回退到当前数据、丢弃 AI 补丁）
   * @param preTurn 回合收尾时的前端权威状态（含本地签到/刷新/购买写入）
   * @param turnStartShopRefresh 本回合「开始时」抓取基线里的商城刷新值，用于区分历史触发与回合中途的新请求
   */
  function reconcileFrontendAuthoritativeState(
    candidate: ReturnType<typeof Schema.parse>,
    preTurn: ReturnType<typeof Schema.parse>,
    turnStartShopRefresh: boolean,
  ): ReturnType<typeof Schema.parse> {
    const next = _.cloneDeep(candidate);

    // Fix 1：仅归零「回合开始时就存在」的刷新请求，且需 AI 本回合确已刷新商城；否则保留 candidate
    // 里的最新值，避免把玩家在生成期间新点击的刷新请求覆盖掉（竞态吞请求）。
    const shopChanged = !_.isEqual(_.get(candidate, '商城'), _.get(preTurn, '商城'));
    if (turnStartShopRefresh && shopChanged) {
      _.set(next, FRONTEND_AUTHORITATIVE_FIELD_PATHS.shopRefresh, false);
    }

    // Fix 2：签到日期为前端权威字段，回合结束后强制回写回合前的值。
    _.set(
      next,
      FRONTEND_AUTHORITATIVE_FIELD_PATHS.lastSignInDate,
      _.get(preTurn, FRONTEND_AUTHORITATIVE_FIELD_PATHS.lastSignInDate, ''),
    );

    // Fix 3：积分数量为前端权威字段，仅在实时状态里确有该字段时回写，避免破坏尚未初始化的货币结构。
    if (_.has(preTurn, FRONTEND_AUTHORITATIVE_FIELD_PATHS.pointsAmount)) {
      _.set(
        next,
        FRONTEND_AUTHORITATIVE_FIELD_PATHS.pointsAmount,
        _.get(preTurn, FRONTEND_AUTHORITATIVE_FIELD_PATHS.pointsAmount),
      );
    }

    return Schema.parse(next);
  }

  function applyStandaloneVariableUpdatePhase(input: {
    reason: string;
    messageId: number;
    phaseOutcome: StandaloneVariableUpdatePhaseOutcome;
    turnStartShopRefresh: boolean;
  }) {
    const { reason, messageId, phaseOutcome, turnStartShopRefresh } = input;

    // 回合收尾时的实时前端权威状态（此刻 session 尚未写入本回合变量更新结果，仍保留生成期间的
    // 商城签到/刷新/购买写入）。它既是前端权威字段的对账来源，也是「补丁未应用」时的回退基底。
    const preTurnStatData = Schema.parse(loadStandaloneStatData());
    // 统一对账后的最终状态：
    // - 变量更新已应用：直接采用 nextStatData —— 它已经是「应用那一刻的当前数据 + 补丁一次」。
    //   正常回合与手动刷新走的是同一条路（补丁在运行时那侧只应用一次），这里不再重放；
    // - 未应用（补丁缺失 / 应用失败）：以实时状态为基底，保住生成期间的前端改动，AI 补丁整体丢弃。
    // 再叠加前端权威字段（商城刷新标志、签到日期、积分数量）的兜底修正。无论哪条分支都会提交该状态。
    const candidateStatData = phaseOutcome.variableUpdateApplied
      ? Schema.parse(phaseOutcome.nextStatData)
      : preTurnStatData;
    const finalStatData = reconcileFrontendAuthoritativeState(candidateStatData, preTurnStatData, turnStartShopRefresh);

    // 第一优先级：无论后续任何副作用是否抛错，都必须完成 busy 复位与消息状态终态化，
    // 否则发送按钮会永久卡在忙碌态。因此这两步单独包在 try/finally 里，且复位放 finally。
    try {
      messagesStore.patchMessageRecord(messageId, {
        raw_content: phaseOutcome.assistantMessage.raw_content,
        content_text: phaseOutcome.assistantMessage.content_text,
        think_content: phaseOutcome.assistantMessage.think_content,
        summary_content: phaseOutcome.assistantMessage.summary_content,
        update_content: phaseOutcome.assistantMessage.update_content,
        action_options: phaseOutcome.assistantMessage.action_options,
        formatted: phaseOutcome.assistantMessage.formatted,
        variable_update_status: phaseOutcome.variableUpdateStatus,
        variable_update_warning: phaseOutcome.variableUpdateWarning,
        stat_data_snapshot: finalStatData,
        debug_trace: phaseOutcome.assistantMessage.debug_trace,
      });
    } catch (patchError) {
      // patchMessageRecord 内部的 Schema.parse 等可能抛错。此时兜底把该消息强制翻出 running，
      // 避免 hasRunningVariableUpdate 恒 true 导致按钮卡死。
      console.error('[useMessageActions] 变量更新收尾写入消息失败，执行兜底状态归零:', patchError);
      try {
        const fallback = messagesStore.getMessage(messageId);
        if (fallback) {
          fallback.variable_update_status = 'failed';
          fallback.variable_update_warning =
            settingsStore.locale === 'en'
              ? 'Variable update finished but its result could not be saved.'
              : '变量更新已完成，但结果写入失败。';
        }
      } catch (fallbackError) {
        console.error('[useMessageActions] 兜底归零变量更新状态也失败:', fallbackError);
      }
    } finally {
      messagesStore.setStandaloneAssistantGenerationBusy(false);
    }

    // 第二优先级：以下副作用（同步运行时、刷新数据、通知）即使抛错也不能阻止按钮恢复，
    // 因此整体包在 try/catch 里，只记录不外抛。
    // 注意：无论变量更新是否应用，都必须提交对账后的 finalStatData，
    // 以确保 Fix 1（商城刷新归零）与 Fix 2（签到日期回写）持久化到 session。
    try {
      commitStandaloneRuntimeStateFromStores({
        statData: finalStatData,
      });

      if (phaseOutcome.variableUpdateApplied) {
        messagesStore.syncStandaloneRuntimeContentContext(
          `${reason}:${phaseOutcome.usedApiLabel}:variable_update_success`,
        );
        statDataStore.refreshData(`${reason}:${phaseOutcome.usedApiLabel}:variable_update_success`);
        // 变量更新已落盘，紧接着自动存一份（固定编号、每轮覆盖，只留最新局面）。
        // 单独 catch：存档失败不能连累按钮复位与本回合的成功提示。
        void saveStandaloneAutoArchive().catch(error => {
          console.warn('[useMessageActions] 自动存档失败（不影响本回合结果）:', error);
        });
        notificationStore.success(
          settingsStore.locale === 'en'
            ? 'Reply generated and local game state updated.'
            : '已生成回复，并同步更新本地游戏状态。',
        );
        return;
      }

      messagesStore.syncStandaloneRuntimeContentContext(
        `${reason}:${phaseOutcome.usedApiLabel}:variable_update_${phaseOutcome.variableUpdateStatus}`,
      );
      // 变量更新未应用时，前端权威字段的对账结果也需要刷新到界面。
      statDataStore.refreshData(`${reason}:${phaseOutcome.usedApiLabel}:frontend_reconcile`);

      if (phaseOutcome.variableUpdateWarning) {
        notificationStore.warning(
          settingsStore.locale === 'en'
            ? `Reply received, but variable update could not be fully applied: ${phaseOutcome.variableUpdateWarning}`
            : `已收到回复，但变量更新未能完整应用：${phaseOutcome.variableUpdateWarning}`,
          5000,
        );
      }
    } catch (sideEffectError) {
      console.error('[useMessageActions] 变量更新成功收尾的副作用执行失败（不影响按钮恢复）:', sideEffectError);
    }
  }

  async function refreshLatestAssistantVariableUpdate(reason = 'manual_variable_refresh'): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    const targetAssistantMessage = messagesStore.messages
      .filter(message => message.role === 'assistant' && !message.lottery)
      .slice()
      .reverse()[0] as MessageRecord | undefined;

    if (!targetAssistantMessage) {
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'There is no AI reply available to update variables for.'
          : '当前没有可更新变量的 AI 回复。',
      );
      return false;
    }

    const latestUserMessage = messagesStore.messages
      .filter(message => message.role === 'user' && !message.lottery && message.message_id < targetAssistantMessage.message_id)
      .slice()
      .reverse()[0] as MessageRecord | undefined;

    if (!latestUserMessage) {
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'Could not find the player input that belongs to the latest AI reply.'
          : '未找到这条 AI 回复对应的玩家输入，无法重跑变量更新。',
      );
      return false;
    }

    messagesStore.patchMessageRecord(targetAssistantMessage.message_id, {
      variable_update_status: 'running',
      variable_update_warning: null,
      stat_data_snapshot: loadStandaloneStatData(),
    });
    messagesStore.setStandaloneAssistantGenerationBusy(true);

    notificationStore.info(
      settingsStore.locale === 'en'
        ? 'Re-running variable update for the latest AI reply...'
        : '正在为最新一条 AI 回复重跑变量更新...',
    );

    // 重跑基点必须取「这条 AI 回复的主回复完成那一刻」，既不是「当前存档」，也不是「发送时快照」：
    // - 用当前存档：它已含这条回复上次应用过的变量更新与后续回合的改动，再打一次会重复累加
    //（金钱+=X、库存-1、数组 push 等会翻倍）；
    // - 用发送时快照：会丢掉主 API 生成期间玩家的操作。
    // 优先取本条消息上存的输入基底 S；旧存档没有这个字段时，回退到对应用户消息的快照（= 发送时状态）。
    // 补丁只打在 S 上 → S + 补丁，中间的操作全丢（这正是为了不累加）；
    // 玩家的积分/签到等前端权威字段会在收尾对账时从当前存档强制回写，不受影响。
    const replayBaseStatData = targetAssistantMessage.variable_update_base_snapshot
      ? Schema.parse(targetAssistantMessage.variable_update_base_snapshot)
      : resolveStandaloneSnapshotForMessage(
          latestUserMessage,
          `manual-variable-refresh:${targetAssistantMessage.message_id}`,
        );
    // 商城刷新触发标志按「当前存档」判定：区分历史触发与重跑期间玩家新点击的刷新。
    const turnStartShopRefresh = Boolean(_.get(loadStandaloneStatData(), '设置.积分系统.商城刷新', false));

    try {
      const phaseOutcome = await runStandaloneVariableUpdatePass({
        mainApis: settingsStore.mainApis,
        assistantApis: settingsStore.assistantApis,
        autoRetry: settingsStore.apiAutoRetry,
        statData: replayBaseStatData,
        // 应用目标 = S：补丁打在 S 上（不是「现在的当前数据」），避免与后续回合的改动重复累加。
        readLiveStatData: () => replayBaseStatData,
        messages: messagesStore.messages,
        latestUserMessage,
        targetAssistantMessage,
        worldDifficulty: settingsStore.worldDifficulty,
        localContentEnabledMap: settingsStore.standaloneLocalContent.enabledAssets,
        localContentBuiltinRouteOverrides: settingsStore.standaloneLocalContent.builtinAssetRouteOverrides,
        localContentCustomEntries: setupStore.customWorldbookEntries,
        selectedPreset: setupStore.selectedPreset,
        snapshotTrim: settingsStore.snapshotTrim,
      });

      applyStandaloneVariableUpdatePhase({
        reason,
        messageId: targetAssistantMessage.message_id,
        phaseOutcome,
        turnStartShopRefresh,
      });
      return true;
    } catch (error) {
      if (isAbortLikeError(error)) {
        markStandaloneVariableUpdateInterrupted({
          reason,
          messageId: targetAssistantMessage.message_id,
        });
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      markStandaloneVariableUpdateFailed({
        reason,
        messageId: targetAssistantMessage.message_id,
        errorMessage,
      });
      notificationStore.error(
        settingsStore.locale === 'en'
          ? `Failed to update variables: ${errorMessage}`
          : `更新变量失败：${errorMessage}`,
      );
      return false;
    }
  }

  async function sendStandaloneUserMessage(text: string, reason = 'standalone_send'): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      return false;
    }

    try {
      const userMessage = messagesStore.appendStandaloneMessage({
        role: 'user',
        raw_content: normalizedText,
        content_text: normalizedText,
        formatted: formatMessageContentForDisplay(normalizedText, 'user', -1),
        action_options: [],
      });

      return generateStandaloneAssistantReply(userMessage.message_id, reason);
    } catch (error) {
      console.error('[MessageActions] standalone 发送消息失败:', error);
      return false;
    }
  }

  /** 积分货币节点路径；抽奖只动这里的数量 */
  const LOTTERY_POINTS_CURRENCY_PATH = '玩家.货币资源.次级货币.积分';

  /** 扣/退积分前先保证积分货币节点存在，缺了就按老规矩补齐说明字段 */
  function ensureLotteryPointsCurrency(draft: ReturnType<typeof Schema.parse>) {
    if (!_.get(draft, LOTTERY_POINTS_CURRENCY_PATH)) {
      _.set(draft, LOTTERY_POINTS_CURRENCY_PATH, {
        数量: 0,
        兑换比例: '100主货币 = 100积分',
        用途说明: '用于商城购物和抽奖',
      });
    }

    return `${LOTTERY_POINTS_CURRENCY_PATH}.数量`;
  }

  /**
   * 抽奖进度跟着楼层回退：取「还留在历史里的最后一条抽奖消息」的进度快照覆盖当前进度，
   * 一条都没有就归零。删除 / 重发 / 重新生成后调用，保证保底进度与聊天记录一致。
   */
  function restoreLotteryStateAfterTimelineChange(reason: string) {
    const latestLotteryRecord = messagesStore.messages
      .filter(message => typeof message.lottery_state_snapshot !== 'undefined')
      .slice()
      .reverse()[0];
    const nextPityCount = latestLotteryRecord?.lottery_state_snapshot?.保底计数 ?? 0;

    try {
      lotteryStore.applyState({ 保底计数: nextPityCount });
      console.info(`[MessageActions] 抽奖进度已随楼层回退 reason=${reason} 保底计数=${nextPityCount}`);
    } catch (error) {
      // 还没开局（会话不存在）时写不进存档，只刷内存值，不影响回退本身
      lotteryStore.setPityCountInMemory(nextPityCount);
      console.warn('[MessageActions] 抽奖进度回退写入会话失败，已仅更新内存值:', error);
    }
  }

  /**
   * 独立抽奖请求。
   *
   * 与剧情完全解耦：抽奖不是剧情回合，走独立提示词 + 独立 API，返回的正文只进聊天流，
   * 返回的补丁照常写进游戏状态。品质由前端算好（`qualities`）后交给模型严格执行。
   *
   * 忙碌锁与主回合共用同一个控制器，因此抽奖期间发送按钮会变灰，无法继续推剧情。
   */
  async function sendStandaloneLotteryDraw(options: SendStandaloneLotteryDrawOptions): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    const chargeCost = Math.max(0, Math.floor(options.cost));

    // 先扣费再发请求：抽奖补丁的应用基底取的是「扣费后」的快照，
    // 扣费必须发生在它之前，否则补丁会盖在未扣费的余额上，把刚花掉的积分又写回来。
    try {
      await statDataActions.mutateStatData('lottery:charge', draft => {
        const amountPath = ensureLotteryPointsCurrency(draft);
        const current = Number(_.get(draft, amountPath, 0)) || 0;
        _.set(draft, amountPath, Math.max(0, current - chargeCost));
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationStore.error(
        settingsStore.locale === 'en' ? `Lottery could not start: ${errorMessage}` : `抽奖无法开始：${errorMessage}`,
      );
      return false;
    }

    return dispatchStandaloneLotteryTurn({
      requestLabel: options.requestLabel,
      qualities: options.qualities,
      count: options.count,
      pityCountAfter: options.pityCountAfter,
      statData: Schema.parse(loadStandaloneStatData()),
    });
  }

  /**
   * 发一次抽奖请求并把结果落地（**不扣费** —— 扣费由调用方负责）。
   *
   * 首次抽奖在扣费后调用；重来（重新发送抽奖请求）复用原请求楼层的「扣费后」快照直接调用，
   * 因此不会重复扣费。会先追加一条抽奖请求楼层（带本次抽奖参数），成功后追加结果楼层。
   */
  async function dispatchStandaloneLotteryTurn(params: {
    requestLabel: string;
    qualities: string[];
    count: number;
    pityCountAfter: number;
    statData: ReturnType<typeof Schema.parse>;
  }): Promise<boolean> {
    emitStandaloneGenerationState(true, 'standalone_lottery');

    try {
      const lotteryRequestMessage = messagesStore.appendStandaloneMessage({
        role: 'user',
        raw_content: params.requestLabel,
        content_text: params.requestLabel,
        formatted: formatMessageContentForDisplay(params.requestLabel, 'user', -1),
        action_options: [],
        stat_data_snapshot: params.statData,
        // 标记为抽奖消息：只在聊天流展示，不进剧情历史与前情提要
        lottery: true,
        // 存下本次抽奖参数，重来（重新发送）时复用同一份品质清单，避免重摇刷品质
        lottery_request: {
          count: params.count,
          qualities: params.qualities,
          pity_count_after: params.pityCountAfter,
        },
      });
      messagesStore.lockMainReplyTarget(lotteryRequestMessage.message_id, 'standalone_lottery');
      messagesStore.beginStreamingSession('standalone_lottery');

      const outcome = await runStandaloneLotteryTurn({
        lotteryApis: settingsStore.lotteryApis,
        mainApis: settingsStore.mainApis,
        autoRetry: settingsStore.apiAutoRetry,
        firstTokenTimeoutSeconds: settingsStore.apiFirstTokenTimeout ? settingsStore.apiFirstTokenTimeoutSeconds : 0,
        statData: params.statData,
        messages: messagesStore.messages,
        qualities: params.qualities,
        worldDifficulty: settingsStore.worldDifficulty,
        localContentEnabledMap: settingsStore.standaloneLocalContent.enabledAssets,
        localContentBuiltinRouteOverrides: settingsStore.standaloneLocalContent.builtinAssetRouteOverrides,
        localContentCustomEntries: setupStore.customWorldbookEntries,
        selectedPreset: setupStore.selectedPreset,
        snapshotTrim: settingsStore.snapshotTrim,
        onPartialText: partialText => messagesStore.updateStandaloneStreamingPreview(partialText, 'standalone_lottery'),
      });

      messagesStore.flushStreamingProjection('standalone_lottery:completed');

      const finalStatData = Schema.parse(outcome.nextStatData);
      commitStandaloneRuntimeStateFromStores({ statData: finalStatData });
      statDataStore.refreshData('standalone_lottery:applied');

      // 抽奖进度先落会话存档，再写进消息快照 —— 读档与楼层回退都以存档为准
      lotteryStore.applyState({ 保底计数: params.pityCountAfter });

      const appendedLotteryMessage = messagesStore.appendStandaloneMessage({
        ...outcome.assistantMessage,
        lottery: true,
        lottery_state_snapshot: { 保底计数: params.pityCountAfter },
        stat_data_snapshot: finalStatData,
      });
      messagesStore.settleStreamingWithFormalMessage(appendedLotteryMessage.message_id);
      messagesStore.syncStandaloneRuntimeContentContext(`standalone_lottery:${outcome.usedApiLabel}`);
      console.info(
        `[MessageActions] 抽奖完成 message_id=${appendedLotteryMessage.message_id} 次数=${params.count} 保底计数=${params.pityCountAfter}`,
      );
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const aborted = errorMessage === 'standalone_lottery_aborted';

      // 抽奖失败：不退款、不删消息。积分扣了就扣了（玩家删掉这层或重来才会随快照回滚），
      // 抽奖请求楼层原地保留 —— 玩家可以点它的「重新发送」重来，状态停在发送抽奖那一刻。
      messagesStore.clearStreamingState('standalone_lottery:failed');

      if (!aborted) {
        notificationStore.error(
          settingsStore.locale === 'en' ? `Lottery failed: ${errorMessage}` : `抽奖失败：${errorMessage}`,
        );
      }
      return false;
    } finally {
      emitStandaloneGenerationState(false, 'standalone_lottery');
    }
  }

  /**
   * 删除指定楼层及之后的所有楼层
   *
   * @param message_id 起始楼层号
   * @param skipConfirm 是否跳过确认对话框
   */
  async function deleteFromHere(message_id: number, skipConfirm = false): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    if (messagesStore.isPartialPreviewMessage(message_id)) {
      if (!skipConfirm) {
        const confirmed = await notificationStore.confirm({
          title: tCurrent('messageActions.confirmDelete'),
          message: tCurrent('messageActions.deletePartialPreview'),
          type: 'danger',
          confirmText: tCurrent('messageActions.deleteConfirmText'),
        });

        if (!confirmed) {
          return false;
        }
      }

      messagesStore.clearPartialPreview(`delete-partial-preview:${message_id}`);
      notificationStore.success(tCurrent('messageActions.partialPreviewDeleted'));
      return true;
    }

    const targetRecord = messagesStore.getMessage(message_id);
    if (!targetRecord) {
      console.warn(`[MessageActions] 删除失败：未找到第 ${message_id} 层的正式快照记录`);
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'The selected floor is only a preview and has no formal snapshot to delete.'
          : '当前楼层只是预览，没有对应的正式快照，不能直接删除正式历史。',
      );
      return false;
    }

    if (!targetRecord.stat_data_snapshot) {
      console.warn(`[MessageActions] 删除失败：第 ${message_id} 层缺少快照`);
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'The selected floor has no saved snapshot yet, so deletion is blocked.'
          : '当前楼层还没有保存对应快照，已阻止删除，避免回退到错误状态。',
      );
      return false;
    }

    const lastId = messagesStore.lastMessageId;

    // 构建确认消息
    if (!skipConfirm) {
      const willDeleteCount = lastId - message_id + 1;
      const confirmed = await notificationStore.confirm({
        title: tCurrent('messageActions.confirmDelete'),
        message:
          message_id < lastId
            ? tCurrent('messageActions.deleteRangeMessage', {
                messageId: message_id,
                lastId,
                count: willDeleteCount,
              })
            : tCurrent('messageActions.deleteSingleMessage', { messageId: message_id }),
        type: 'danger',
        confirmText: tCurrent('messageActions.deleteConfirmText'),
      });

      if (!confirmed) {
        return false;
      }
    }

    // 计算需要删除的楼层
    const toDelete = _.range(message_id, lastId + 1);
    console.info(`[MessageActions] 删除楼层: ${toDelete.join(', ')}`);

    // 1. 先从本地状态移除（立即响应）
    messagesStore.removeMessages(toDelete);

    // 2. 调用酒馆 API 删除
    console.info(`[MessageActions] standalone 本地删除第 ${message_id} 层到第 ${lastId} 层`);
    notificationStore.success(tCurrent('messageActions.deleteSuccess'));

    // 3. 删除完成后按真实聊天记录重建可视窗口
    syncAfterTimelineChange(`delete-from-here:${message_id}`);

    // 4. 检查是否需要填充用户输入
    return true;
  }

  /**
   * 检查并填充用户输入
   * 当删除后最后一层是用户消息时，将其填入输入框
   */
  async function checkAndFillUserInput() {
    const lastId = messagesStore.lastMessageId;
    if (lastId < 0) return;

    const lastMessage = messagesStore.getMessage(lastId);
    if (!lastMessage) return;

    if (lastMessage.role === 'user') {
      console.info('[MessageActions] 最后一层是用户消息，填入输入框');

      // 填入输入框
      actionInputStore.setInputText(lastMessage.raw_content);

      // 从本地状态移除
      messagesStore.removeMessage(lastId);
      syncAfterTimelineChange(`fill-user-input:${lastId}`);

      notificationStore.info(tCurrent('messageActions.inputRestored'));
    }
  }

  /**
   * 编辑消息
   *
   * @param message_id 要编辑的楼层号
   * @param newContent 编辑框里的内容（AI 楼层 = 正文 + 小总结；用户楼层就是消息本身）
   */
  async function editMessage(message_id: number, newContent: string): Promise<boolean> {
    const record = messagesStore.getMessage(message_id);
    if (!record) {
      console.warn(`[MessageActions] 消息 ${message_id} 不存在`);
      return false;
    }

    // AI 楼层的编辑框里，正文后面还跟着用小总结原格式包起来的 <summary> 段 —— 这里拆回两个字段。
    // 用户楼层没有小总结，整段都是正文。
    const { contentText, summaryContent } =
      record.role === 'assistant'
        ? splitEditableBodyAndSummary(newContent)
        : { contentText: newContent, summaryContent: null };

    // 如果内容没变，直接返回
    const unchanged =
      contentText === record.content_text &&
      (record.role !== 'assistant' || summaryContent === (record.summary_content?.trim() || null));
    if (unchanged) {
      messagesStore.stopEditing();
      return true;
    }

    // 根据消息类型构建要保存到酒馆的消息内容
    let messageToSave: string;

    if (record.role === 'user') {
      // 用户消息：直接使用新内容
      messageToSave = contentText;
    } else {
      // AI 消息：需要将编辑后的内容重新包装回原始格式
      // 1. 从原始内容中提取非 contenttext 部分（如 UpdateVariable 等）
      // 2. 过滤掉 StatusPlaceHolderImpl
      // 3. 用新内容替换 contenttext 部分，再把小总结写回 summary 段

      let rawContent = record.raw_content;

      // 过滤掉 StatusPlaceHolderImpl
      rawContent = rawContent.replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '');

      // 替换 contenttext 内容
      if (/<contenttext>[\s\S]*?<\/contenttext>/i.test(rawContent)) {
        messageToSave = rawContent.replace(
          /<contenttext>[\s\S]*?<\/contenttext>/i,
          () => `<contenttext>${contentText}</contenttext>`,
        );
      } else {
        // 如果没有 contenttext 标签，直接包装
        messageToSave = `<contenttext>${contentText}</contenttext>`;
      }

      // 小总结写回：原本没有就是新加，编辑框里删光了就一并删掉
      messageToSave = replaceOrAppendSummaryBlock(messageToSave, summaryContent);
    }

    // 更新本地状态
    messagesStore.updateMessage(message_id, contentText, messageToSave);
    messagesStore.stopEditing();

    console.info(`[MessageActions] 已编辑第 ${message_id} 层消息`);
    return true;
  }

  /**
   * 重新生成 AI 回复
   *
   * @param message_id 要重新生成的楼层号
   */
  async function regenerate(message_id: number): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    const record = messagesStore.getMessage(message_id);
    if (!record || record.role !== 'assistant') {
      notificationStore.error(tCurrent('messageActions.regenerateFailed'));
      return false;
    }

    // 抽奖结果楼层不提供重新生成（UI 已屏蔽按钮，这里兜底）：要重来就点上面那条抽奖请求的「重新发送」
    if (record.lottery) {
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'Lottery results cannot be regenerated. Resend the lottery request above to rerun it.'
          : '抽奖结果不能重新生成。请点上面那条抽奖请求的「重新发送」重来。',
      );
      return false;
    }

    const preferredSnapshot = resolveStandaloneSnapshotForMessage(record, `standalone-regenerate:${message_id}`);

    const lastId = messagesStore.lastMessageId;
    const willDeleteCount = lastId - message_id + 1;

    const confirmed = await notificationStore.confirm({
      title: tCurrent('messageActions.confirmRegenerate'),
      message:
        message_id < lastId
          ? tCurrent('messageActions.regenerateRangeMessage', {
              messageId: message_id,
              lastId,
              count: willDeleteCount,
            })
          : tCurrent('messageActions.regenerateSingleMessage', { messageId: message_id }),
      type: 'warning',
      confirmText: tCurrent('messageActions.regenerateConfirmText'),
    });

    if (!confirmed) {
      return false;
    }

    const latestUserBeforeReply = messagesStore.messages
      .filter(message => message.role === 'user' && !message.lottery && message.message_id < message_id)
      .slice()
      .reverse()[0];

    if (!latestUserBeforeReply) {
      notificationStore.error(tCurrent('messageActions.regenerateFailed'));
      return false;
    }

    const toDelete = _.range(message_id, lastId + 1);
    messagesStore.removeMessages(toDelete);
    syncAfterTimelineChange(`standalone-regenerate:${message_id}`);
    restoreStandaloneSnapshot(preferredSnapshot, `standalone-regenerate:${message_id}`);

    notificationStore.info(tCurrent('messageActions.regenerating'));
    return generateStandaloneAssistantReply(latestUserBeforeReply.message_id, 'standalone_regenerate');
  }

  /**
   * 重新发送用户消息
   *
   * 逻辑：
   * 1. 显示确认对话框（会删除此楼层之后的所有消息）
   * 2. 获取当前楼层的消息内容
   * 3. 删除此楼层及之后的所有楼层
   * 4. 重新发送消息并触发 AI 生成
   *
   * @param message_id 要重新发送的用户消息楼层号
   */
  async function resend(message_id: number): Promise<boolean> {
    if (guardStandaloneBusyAction()) {
      return false;
    }

    const record = messagesStore.getMessage(message_id);
    if (!record || record.role !== 'user') {
      console.warn(`[MessageActions] 消息 ${message_id} 不存在或不是用户消息`);
      notificationStore.error(tCurrent('messageActions.resendUnavailable'));
      return false;
    }

    // 抽奖请求的「重新发送」= 重来这一次抽奖：复用原楼层的抽奖参数与「扣费后」快照，不重复扣费。
    // 旧存档的抽奖消息没有 lottery_request，无法重来，提示去抽奖面板重抽。
    const lotteryRequest = record.lottery ? record.lottery_request : undefined;
    if (record.lottery && !lotteryRequest) {
      notificationStore.warning(
        settingsStore.locale === 'en'
          ? 'This lottery request has no saved draw parameters and cannot be rerun. Draw again from the lottery panel.'
          : '这条抽奖请求没有保存抽奖参数，无法重来。请到抽奖面板重新抽。',
      );
      return false;
    }

    const lastId = messagesStore.lastMessageId;
    const willDeleteCount = lastId - message_id + 1;

    // 使用页面内确认对话框
    const confirmed = await notificationStore.confirm({
      title: tCurrent('messageActions.confirmResend'),
      message:
        willDeleteCount > 1
          ? tCurrent('messageActions.resendRangeMessage', {
              messageId: message_id,
              lastId,
              count: willDeleteCount,
            })
          : tCurrent('messageActions.resendSingleMessage', { messageId: message_id }),
      type: 'warning',
      confirmText: tCurrent('messageActions.resendConfirmText'),
    });

    if (!confirmed) {
      return false;
    }

    // 保存消息内容
    const messageContent = record.raw_content;
    const preferredSnapshot = resolveStandaloneSnapshotForMessage(record, `standalone-resend:${message_id}`);

    const toDelete = _.range(message_id, lastId + 1);
    console.info(`[MessageActions] standalone 重新发送：删除楼层 ${toDelete.join(', ')}`);

    messagesStore.removeMessages(toDelete);
    syncAfterTimelineChange(`standalone-resend:${message_id}`);
    restoreStandaloneSnapshot(preferredSnapshot, `standalone-resend:${message_id}`);

    // 抽奖重来：恢复到原请求楼层的「扣费后」快照后，直接重走抽奖链路（不重复扣费）。
    if (lotteryRequest) {
      notificationStore.info(tCurrent('messageActions.resending'));
      return dispatchStandaloneLotteryTurn({
        requestLabel: messageContent,
        qualities: lotteryRequest.qualities,
        count: lotteryRequest.count,
        pityCountAfter: lotteryRequest.pity_count_after,
        statData: Schema.parse(loadStandaloneStatData()),
      });
    }

    // 重发用户消息的快照取恢复后的 session，保证记录与 session 一致。
    const resentUserSnapshot = Schema.parse(loadStandaloneStatData());
    const resentUserMessage = messagesStore.appendStandaloneMessage({
      role: 'user',
      raw_content: messageContent,
      content_text: messageContent,
      formatted: formatMessageContentForDisplay(messageContent, 'user', -1),
      action_options: [],
      stat_data_snapshot: resentUserSnapshot,
    });

    notificationStore.info(tCurrent('messageActions.resending'));
    return generateStandaloneAssistantReply(resentUserMessage.message_id, 'standalone_resend');
  }

  /**
   * 开始编辑消息
   */
  function startEdit(message_id: number) {
    messagesStore.startEditing(message_id);
  }

  /**
   * 取消编辑
   */
  function cancelEdit() {
    messagesStore.stopEditing();
  }

  return {
    deleteFromHere,
    editMessage,
    regenerate,
    resend,
    refreshLatestAssistantVariableUpdate,
    sendStandaloneUserMessage,
    sendStandaloneLotteryDraw,
    startEdit,
    cancelEdit,
    checkAndFillUserInput,
  };
}
