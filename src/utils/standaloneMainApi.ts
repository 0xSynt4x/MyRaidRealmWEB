import { tCurrent } from '../i18n';
import type { ApiConfig } from '../stores/settings';
import { normalizeRemoteApiErrorMessage } from './remoteApiError';
import { hasCompleteStandaloneApiConfig, requestStandaloneProviderText } from './standaloneProviderApi';

export type StandaloneMainApiPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

type GenerationRuntime = {
  controller: AbortController;
  requestId: string;
};

let activeStandaloneMainApiRuntime: GenerationRuntime | null = null;

export function hasCompleteStandaloneMainApiConfig(api: ApiConfig): boolean {
  return hasCompleteStandaloneApiConfig(api);
}

export function assertStandaloneMainApiConfigured(api: ApiConfig): ApiConfig {
  if (hasCompleteStandaloneMainApiConfig(api)) {
    return api;
  }

  throw new Error(tCurrent('settings.mainApiRequired'));
}

export async function requestStandaloneMainApiText(input: {
  api: ApiConfig;
  prompt: StandaloneMainApiPrompt;
  requestId: string;
}): Promise<string> {
  const configuredApi = assertStandaloneMainApiConfigured(input.api);

  if (activeStandaloneMainApiRuntime) {
    throw new Error('已有独立模式生成任务正在进行中');
  }

  const controller = new AbortController();
  activeStandaloneMainApiRuntime = {
    controller,
    requestId: input.requestId,
  };

  try {
    const reply = await requestStandaloneProviderText({
      api: configuredApi,
      prompt: input.prompt,
      signal: controller.signal,
      logPrefix: '[StandaloneMainApi]',
    });
    return reply.text;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('standalone_main_api_aborted');
    }

    const message = normalizeRemoteApiErrorMessage(error);
    console.warn('[StandaloneMainApi] 主 API 调用失败:', {
      source: configuredApi.source,
      model: configuredApi.model,
      message,
    });
    throw new Error(message || '独立模式主 API 调用失败');
  } finally {
    if (activeStandaloneMainApiRuntime?.controller === controller) {
      activeStandaloneMainApiRuntime = null;
    }
  }
}

export function cancelStandaloneMainApiRequest(requestId?: string): boolean {
  if (!activeStandaloneMainApiRuntime) {
    return false;
  }

  if (requestId && activeStandaloneMainApiRuntime.requestId !== requestId) {
    return false;
  }

  activeStandaloneMainApiRuntime.controller.abort();
  return true;
}
