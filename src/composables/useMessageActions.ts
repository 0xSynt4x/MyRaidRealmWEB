import { Schema } from '../../schema/schema';
import { nextTick } from 'vue';
import { useActionInputStore } from '../stores/actionInput';
import { tCurrent } from '../i18n';
import { useMessagesStore, type MessageRecord } from '../stores/messages';
import { useNotificationStore } from '../stores/notification';
import { useStatDataStore } from '../stores/statData';
import { useSetupStore } from '../stores/setup';
import { formatMessageContentForDisplay } from '../utils/messageFormatting';
import { commitStandaloneRuntimeStateFromStores } from '../utils/standaloneRuntime';
import { loadStandaloneStatData } from '../utils/standaloneStatData';
import {
  runStandaloneLocalTurn,
  runStandaloneVariableUpdatePass,
  type StandaloneScriptedTurnInput,
  type StandaloneVariableUpdatePhaseOutcome,
} from '../utils/standaloneLocalTurn';
import { useSettingsStore } from '../stores/settings';

type SendStandaloneUserMessageOptions = {
  scriptedTurn?: StandaloneScriptedTurnInput;
};

const STANDALONE_VARIABLE_UPDATE_TIMEOUT_ERROR_MESSAGE = '变量更新补写超时，请稍后重试。';

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
    commitStandaloneRuntimeStateFromStores({
      statData: snapshot,
    });
    statDataStore.refreshData(`${reason}:restore_snapshot`);
  }

  function isAbortLikeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /abort|aborted|cancel|stopped/i.test(message);
  }

  function isVariableUpdateTimeoutError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes(STANDALONE_VARIABLE_UPDATE_TIMEOUT_ERROR_MESSAGE);
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

  async function generateStandaloneAssistantReply(
    latestUserMessageId: number,
    reason: string,
    options: SendStandaloneUserMessageOptions = {},
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

      const outcome = await runStandaloneLocalTurn({
        mainApi: settingsStore.mainApi,
        assistantApis: settingsStore.assistantApis,
        statData: loadStandaloneStatData(),
        messages: messagesStore.messages,
        latestUserMessage,
        worldDifficulty: settingsStore.worldDifficulty,
        localContentEnabledMap: settingsStore.standaloneLocalContent.enabledAssets,
        localContentBuiltinRouteOverrides: settingsStore.standaloneLocalContent.builtinAssetRouteOverrides,
        selectedPreset: setupStore.selectedPreset,
        scriptedTurn: options.scriptedTurn,
        onMainReplyPartialText: partialText => {
          messagesStore.updateStandaloneStreamingPreview(partialText, reason);
        },
      });

      messagesStore.flushStreamingProjection(`${reason}:main_reply_completed`);

      const appendedAssistantMessage = messagesStore.appendStandaloneMessage({
        ...outcome.assistantMessage,
        stat_data_snapshot: loadStandaloneStatData(),
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
          if (isVariableUpdateTimeoutError(error)) {
            notificationStore.warning(
              settingsStore.locale === 'en'
                ? `Reply received, but variable update timed out: ${errorMessage}`
                : `正文已收到，但变量更新超时：${errorMessage}`,
              5000,
            );
          } else {
            notificationStore.error(
              settingsStore.locale === 'en'
                ? `Reply received, but variable update failed: ${errorMessage}`
                : `正文已收到，但变量更新失败：${errorMessage}`,
            );
          }
        }
      } finally {
        emitStandaloneGenerationState(false, reason);
      }

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
   * - Fix 1（商城刷新兜底重置）：`设置.积分系统.商城刷新` 是前端一次性触发开关。仅当本回合商城
   *   内容确实发生变化（说明 AI 已执行刷新任务）时，前端才把标志归零，杜绝标志悬空导致后续每
   *   回合反复刷新；若本回合变量更新失败/跳过或 AI 忽略了刷新任务（商城未变），则保留标志，让
   *   下一回合可以重试刷新，避免刷新请求被静默丢弃。
   * - Fix 2（签到日期前端权威）：`设置.积分系统.上次签到日期` 由前端签到逻辑独占维护。AI 若对
   *   `设置.积分系统` 做粗粒度覆盖会清掉该字段，导致同一天可重复签到。这里回合结束后统一用回合
   *   开始前的权威值覆盖回去，确保 AI 无法改写签到日期。
   *
   * @param candidate 回合产出的候选状态（变量更新已应用时为 nextStatData，否则为回合前状态）
   * @param preTurn 回合开始前的前端权威状态（含本地签到/刷新写入）
   */
  function reconcileFrontendAuthoritativeState(
    candidate: ReturnType<typeof Schema.parse>,
    preTurn: ReturnType<typeof Schema.parse>,
  ): ReturnType<typeof Schema.parse> {
    const next = _.cloneDeep(candidate);

    // Fix 1：仅在商城内容实际发生变化时归零刷新标志；否则保留标志以便下一回合重试。
    const shopRefreshRequested = Boolean(_.get(preTurn, '设置.积分系统.商城刷新', false));
    const shopChanged = !_.isEqual(_.get(candidate, '商城'), _.get(preTurn, '商城'));
    if (!shopRefreshRequested || shopChanged) {
      _.set(next, '设置.积分系统.商城刷新', false);
    }

    // Fix 2：签到日期为前端权威字段，回合结束后强制回写回合前的值。
    _.set(next, '设置.积分系统.上次签到日期', _.get(preTurn, '设置.积分系统.上次签到日期', ''));
    return Schema.parse(next);
  }

  function applyStandaloneVariableUpdatePhase(input: {
    reason: string;
    messageId: number;
    phaseOutcome: StandaloneVariableUpdatePhaseOutcome;
  }) {
    const { reason, messageId, phaseOutcome } = input;

    // 回合开始前的前端权威状态（此刻 session 尚未写入本回合变量更新结果，仍保留商城签到/刷新写入）。
    const preTurnStatData = Schema.parse(loadStandaloneStatData());
    // 统一对账后的最终状态：变量更新应用则以 nextStatData 为基底，否则以回合前状态为基底，
    // 再叠加前端权威字段的兜底修正。无论哪条分支，最终都会提交该状态。
    const finalStatData = reconcileFrontendAuthoritativeState(
      phaseOutcome.variableUpdateApplied ? phaseOutcome.nextStatData : preTurnStatData,
      preTurnStatData,
    );

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
      .filter(message => message.role === 'assistant')
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
      .filter(message => message.role === 'user' && message.message_id < targetAssistantMessage.message_id)
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

    try {
      const phaseOutcome = await runStandaloneVariableUpdatePass({
        mainApi: settingsStore.mainApi,
        assistantApis: settingsStore.assistantApis,
        statData: loadStandaloneStatData(),
        messages: messagesStore.messages,
        latestUserMessage,
        targetAssistantMessage,
        worldDifficulty: settingsStore.worldDifficulty,
        localContentEnabledMap: settingsStore.standaloneLocalContent.enabledAssets,
        localContentBuiltinRouteOverrides: settingsStore.standaloneLocalContent.builtinAssetRouteOverrides,
        selectedPreset: setupStore.selectedPreset,
      });

      applyStandaloneVariableUpdatePhase({
        reason,
        messageId: targetAssistantMessage.message_id,
        phaseOutcome,
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
      if (isVariableUpdateTimeoutError(error)) {
        notificationStore.warning(
          settingsStore.locale === 'en'
            ? `Variable update timed out: ${errorMessage}`
            : `变量更新超时：${errorMessage}`,
          5000,
        );
      } else {
        notificationStore.error(
          settingsStore.locale === 'en'
            ? `Failed to update variables: ${errorMessage}`
            : `更新变量失败：${errorMessage}`,
        );
      }
      return false;
    }
  }

  async function sendStandaloneUserMessage(
    text: string,
    reason = 'standalone_send',
    options: SendStandaloneUserMessageOptions = {},
  ): Promise<boolean> {
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

      return generateStandaloneAssistantReply(userMessage.message_id, reason, options);
    } catch (error) {
      console.error('[MessageActions] standalone 发送消息失败:', error);
      return false;
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
   * @param newContent 新内容（用户编辑的是 content_text，不是 raw_content）
   */
  async function editMessage(message_id: number, newContent: string): Promise<boolean> {
    const record = messagesStore.getMessage(message_id);
    if (!record) {
      console.warn(`[MessageActions] 消息 ${message_id} 不存在`);
      return false;
    }

    // 如果内容没变，直接返回
    if (newContent === record.content_text) {
      messagesStore.stopEditing();
      return true;
    }

    // 根据消息类型构建要保存到酒馆的消息内容
    let messageToSave: string;

    if (record.role === 'user') {
      // 用户消息：直接使用新内容
      messageToSave = newContent;
    } else {
      // AI 消息：需要将编辑后的内容重新包装回原始格式
      // 1. 从原始内容中提取非 contenttext 部分（如 UpdateVariable 等）
      // 2. 过滤掉 StatusPlaceHolderImpl
      // 3. 用新内容替换 contenttext 部分

      let rawContent = record.raw_content;

      // 过滤掉 StatusPlaceHolderImpl
      rawContent = rawContent.replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '');

      // 替换 contenttext 内容
      if (/<contenttext>[\s\S]*?<\/contenttext>/i.test(rawContent)) {
        messageToSave = rawContent.replace(
          /<contenttext>[\s\S]*?<\/contenttext>/i,
          () => `<contenttext>${newContent}</contenttext>`,
        );
      } else {
        // 如果没有 contenttext 标签，直接包装
        messageToSave = `<contenttext>${newContent}</contenttext>`;
      }
    }

    // 更新本地状态
    messagesStore.updateMessage(message_id, newContent, messageToSave);
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
      .filter(message => message.role === 'user' && message.message_id < message_id)
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

    const resentUserMessage = messagesStore.appendStandaloneMessage({
      role: 'user',
      raw_content: messageContent,
      content_text: messageContent,
      formatted: formatMessageContentForDisplay(messageContent, 'user', -1),
      action_options: [],
      stat_data_snapshot: preferredSnapshot,
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
    startEdit,
    cancelEdit,
    checkAndFillUserInput,
  };
}
