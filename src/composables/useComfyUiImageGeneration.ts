import { computed } from 'vue';
import { useI18n } from '../i18n';
import { useMessagesStore, type MessageGeneratedImage } from '../stores/messages';
import { useNotificationStore } from '../stores/notification';
import {
  DEFAULT_NOVELAI_MODEL,
  DEFAULT_NOVELAI_NOISE_SCHEDULE,
  DEFAULT_NOVELAI_SAMPLER,
  resolveNovelAiSize,
  useSettingsStore,
} from '../stores/settings';
import { ComfyUiError, detectComfyWorkflowFormat, generateComfyUiImage } from '../utils/comfyuiClient';
import { createGeneratedImageId, estimateDataUrlByteSize, saveGeneratedImage } from '../utils/imageStorage';
import { composeImageStylePrompt } from '../utils/imageStylePresets';
import { NovelAiImageError, generateNovelAiImage } from '../utils/novelAiImageClient';

/**
 * 驱动「点一下 → 按当前后端出图 → 结果写回消息记录」这条链路。
 *
 * 🔴 文件名保持 `useComfyUiImageGeneration` 是历史原因（改名会牵动消息组件的引用），
 * 但它的职责已经升级成**两条后端共用的出图入口**：按设置里的后端分发请求。
 *
 * 两条后端的产物形态不同：
 * - 本地 ComfyUI：图留在 ComfyUI 的 output 目录，消息里只存**地址**
 * - 云端 NovelAI：拿到的是图片数据本身，存进本机 IndexedDB，消息里只存**编号**
 */
export function useComfyUiImageGeneration() {
  const { t } = useI18n();
  const settingsStore = useSettingsStore();
  const messagesStore = useMessagesStore();
  const notificationStore = useNotificationStore();

  /** 生图总开关（两条后端共用） */
  const isEnabled = computed(() => settingsStore.imageGeneration.enabled);
  /** 当前生效的后端 */
  const backend = computed(() => settingsStore.imageGeneration.backend);
  const isNovelAi = computed(() => backend.value === 'novelai');

  const hasWorkflow = computed(() => Boolean(settingsStore.comfyUi.workflowJson.trim()));
  const hasPositiveNode = computed(() => Boolean(settingsStore.comfyUi.positiveNodeId));
  const hasNovelAiBaseUrl = computed(() => Boolean(settingsStore.novelAi.baseUrl.trim()));
  const hasNovelAiApiKey = computed(() => Boolean(settingsStore.novelAi.apiKey.trim()));

  /**
   * 出图按钮是否可用 —— 按当前后端判断。
   * 选了 NovelAI 但没填地址或 Key，按钮就该是灰的。
   */
  const isReady = computed(() => {
    if (!isEnabled.value) return false;
    if (isNovelAi.value) return hasNovelAiBaseUrl.value && hasNovelAiApiKey.value;
    return hasWorkflow.value && hasPositiveNode.value;
  });

  /**
   * 把「画风预置」和 AI 写的场景拼成最终正向提示词。
   * 展示与实际提交共用这一个函数，避免「看到的」和「发出去的」对不上。
   */
  function composePrompt(scenePrompt: string): string {
    const stylePrompt = isNovelAi.value ? settingsStore.novelAi.stylePrompt : settingsStore.comfyUi.stylePrompt;
    return composeImageStylePrompt(stylePrompt, scenePrompt);
  }

  function describeComfyUiError(error: ComfyUiError): string {
    switch (error.code) {
      case 'unreachable':
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

  function describeNovelAiError(error: NovelAiImageError): string {
    // 站点不一定给原因，占位符必须有东西可填
    const detail = { detail: error.detail || t('novelaiError.noDetail') };

    switch (error.code) {
      case 'invalid-url':
        return t('novelaiError.invalidUrl');
      case 'unreachable':
        return t('novelaiError.unreachable');
      case 'timeout':
        return t('novelaiError.timeout');
      case 'aborted':
        return t('novelaiError.aborted');
      case 'unauthorized':
        return t('novelaiError.unauthorized');
      case 'payment-required':
        return t('novelaiError.paymentRequired');
      case 'content-rejected':
        return t('novelaiError.contentRejected', detail);
      case 'empty-output':
        return t('novelaiError.emptyOutput');
      case 'storage-full':
        return t('novelaiError.storageFull');
      case 'bad-response':
        return t('novelaiError.badResponse', detail);
      default:
        return t('novelaiError.unknown');
    }
  }

  function describeError(error: unknown): string {
    if (error instanceof NovelAiImageError) return describeNovelAiError(error);
    if (error instanceof ComfyUiError) return describeComfyUiError(error);
    return isNovelAi.value ? t('novelaiError.unknown') : t('comfyuiError.unknown');
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

  /** 本地 ComfyUI 那条路：结果只存图片地址 */
  async function generateWithComfyUi(messageId: number, imageIndex: number, finalPrompt: string) {
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
  }

  /** NovelAI 那条路：图存进本机仓库，消息里只留编号 */
  async function generateWithNovelAi(messageId: number, imageIndex: number, finalPrompt: string) {
    const config = settingsStore.novelAi;
    const size = resolveNovelAiSize(config.sizeId);

    const images = await generateNovelAiImage({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      prompt: finalPrompt,
      negativePrompt: config.negativePrompt,
      model: config.model.trim() || DEFAULT_NOVELAI_MODEL,
      width: size.width,
      height: size.height,
      steps: config.steps,
      scale: config.scale,
      // 三个「下拉 + 自定义」字段可能停在空的自定义框上 —— 空值一律落回默认，别把空串发出去
      sampler: config.sampler.trim() || DEFAULT_NOVELAI_SAMPLER,
      noiseSchedule: config.noiseSchedule.trim() || DEFAULT_NOVELAI_NOISE_SCHEDULE,
      ucPreset: config.ucPreset,
      qualityToggle: config.qualityToggle,
      cfgRescale: config.cfgRescale,
    });

    const first = images[0];
    if (!first) {
      throw new NovelAiImageError('empty-output', 'empty');
    }

    const imageId = createGeneratedImageId();

    try {
      await saveGeneratedImage({
        id: imageId,
        dataUrl: first.dataUrl,
        mimeType: first.mimeType,
        prompt: finalPrompt,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      // 图已经拿到了，只是存不下 —— 说清是「存储满了」而不是「出图失败」
      console.warn('[Image] 云端图片写入本机仓库失败:', error, {
        byteSize: estimateDataUrlByteSize(first.dataUrl),
      });
      throw new NovelAiImageError('storage-full', 'save-failed', String((error as Error)?.message ?? error));
    }

    writeImageRecord(messageId, imageIndex, {
      status: 'done',
      imageId,
      prompt: finalPrompt,
      url: undefined,
      filename: undefined,
      error: undefined,
    });
  }

  async function generateForMessage(messageId: number, imageIndex: number, prompt: string) {
    if (!isEnabled.value) {
      notificationStore.warning(t('comfyuiError.notEnabled'));
      return;
    }
    if (!isReady.value) {
      notificationStore.warning(isNovelAi.value ? t('novelaiError.notConfigured') : t('comfyuiError.notConfigured'));
      return;
    }

    // 画风预置 + AI 写的场景 = 真正提交的正向提示词
    const finalPrompt = composePrompt(prompt);

    writeImageRecord(messageId, imageIndex, { status: 'running', prompt: finalPrompt, error: undefined });

    try {
      if (isNovelAi.value) {
        await generateWithNovelAi(messageId, imageIndex, finalPrompt);
      } else {
        await generateWithComfyUi(messageId, imageIndex, finalPrompt);
      }
    } catch (error) {
      const message = describeError(error);
      writeImageRecord(messageId, imageIndex, { status: 'error', prompt: finalPrompt, error: message });
      notificationStore.error(message);
    }
  }

  return {
    isEnabled,
    isReady,
    backend,
    isNovelAi,
    composePrompt,
    generateForMessage,
    describeError,
  };
}
