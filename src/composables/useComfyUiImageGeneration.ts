import { computed } from 'vue';
import { useI18n } from '../i18n';
import { useMessagesStore, type MessageGeneratedImage } from '../stores/messages';
import { useNotificationStore } from '../stores/notification';
import { useSettingsStore } from '../stores/settings';
import { ComfyUiError, detectComfyWorkflowFormat, generateComfyUiImage } from '../utils/comfyuiClient';
import { composeComfyUiPrompt } from '../utils/comfyuiStylePresets';

/**
 * 驱动「点一下 → 本地 ComfyUI 出图 → 结果写回消息记录」这条链路。
 * 结果只存图片地址，图片本体留在 ComfyUI 的 output 目录。
 */
export function useComfyUiImageGeneration() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const messagesStore = useMessagesStore();
  const notificationStore = useNotificationStore();

  const isEnabled = computed(() => settingsStore.comfyUi.enabled);
  const hasWorkflow = computed(() => Boolean(settingsStore.comfyUi.workflowJson.trim()));
  const hasPositiveNode = computed(() => Boolean(settingsStore.comfyUi.positiveNodeId));
  const isReady = computed(() => isEnabled.value && hasWorkflow.value && hasPositiveNode.value);

  /**
   * 把「画风预置」和 AI 写的场景拼成最终正向提示词。
   * 展示与实际提交共用这一个函数，避免「看到的」和「发出去的」对不上。
   */
  function composePrompt(scenePrompt: string): string {
    return composeComfyUiPrompt(settingsStore.comfyUi.stylePrompt, scenePrompt);
  }

  function describeError(error: unknown): string {
    if (error instanceof ComfyUiError) {
      switch (error.code) {
        case 'unreachable':
          return t('comfyuiError.unreachable');
        case 'cors':
          return t('comfyuiError.unreachable');
        case 'timeout':
          return t('comfyuiError.timeout');
        case 'invalid-url':
          return t('comfyuiError.invalidUrl');
        case 'invalid-node':
          return t('comfyuiError.invalidNode');
        case 'invalid-workflow':
          return t('comfyuiError.invalidWorkflow');
        case 'no-output':
          return t('comfyuiError.noOutput');
        case 'aborted':
          return t('comfyuiError.aborted');
        case 'execution-failed':
          return t('comfyuiError.executionFailed', { detail: error.message });
        default:
          return t('comfyuiError.unknown');
      }
    }
    return t('comfyuiError.unknown');
  }

  function writeImageRecord(messageId: number, imageIndex: number, patch: Partial<MessageGeneratedImage>) {
    const record = messagesStore.getMessage(messageId);
    if (!record) return;

    const list: MessageGeneratedImage[] = [...(record.generated_images ?? [])];
    while (list.length <= imageIndex) {
      list.push({ status: 'idle', prompt: '' });
    }
    list[imageIndex] = { ...list[imageIndex], ...patch };

    messagesStore.patchMessageRecord(messageId, { generated_images: list });
  }

  async function generateForMessage(messageId: number, imageIndex: number, prompt: string) {
    if (!isEnabled.value) {
      notificationStore.warning(t('comfyuiError.notEnabled'));
      return;
    }
    if (!hasWorkflow.value || !hasPositiveNode.value) {
      notificationStore.warning(t('comfyuiError.notConfigured'));
      return;
    }

    const config = settingsStore.comfyUi;

    // 界面格式的工作流要先解析过一次、转成 API 格式才能提交
    const apiSource = config.workflowApiJson.trim() || config.workflowJson;
    if (detectComfyWorkflowFormat(apiSource) !== 'api') {
      notificationStore.warning(t('comfyuiError.workflowNotParsed'));
      return;
    }

    let workflow: Record<string, unknown>;
    try {
      workflow = JSON.parse(apiSource) as Record<string, unknown>;
    } catch {
      notificationStore.error(t('comfyuiError.invalidWorkflow'));
      return;
    }

    // 画风预置 + AI 写的场景 = 真正提交的正向提示词
    const finalPrompt = composePrompt(prompt);

    writeImageRecord(messageId, imageIndex, { status: 'running', prompt: finalPrompt, error: undefined });

    try {
      const images = await generateComfyUiImage({
        baseUrl: config.baseUrl,
        workflow,
        positiveNodeId: config.positiveNodeId,
        negativeNodeId: config.negativeNodeId || undefined,
        prompt: finalPrompt,
        negativePrompt: config.negativePrompt.trim() || undefined,
        width: config.overrideSize ? config.width : undefined,
        height: config.overrideSize ? config.height : undefined,
        randomSeed: config.randomSeed,
      });

      const first = images[0];
      if (!first) {
        throw new ComfyUiError('no-output', 'empty');
      }

      writeImageRecord(messageId, imageIndex, {
        status: 'done',
        url: first.url,
        filename: first.filename,
        prompt: finalPrompt,
        error: undefined,
      });
    } catch (error) {
      const message = describeError(error);
      writeImageRecord(messageId, imageIndex, { status: 'error', prompt: finalPrompt, error: message });
      notificationStore.error(message);
    }
  }

  return {
    isEnabled,
    isReady,
    composePrompt,
    generateForMessage,
    describeError,
  };
}
