import { normalizeStandaloneOpenAiApiUrl, type ApiConfig } from '../stores/settings';
import type { StandaloneAiDebugPassTrace } from './standaloneAiDebug';
import {
  hasCompleteStandaloneProviderApiConfig,
  requestStandaloneProviderTextCore,
  type StandaloneProviderApiConfig,
} from '../../runtime/standaloneProviderCore';

export type StandaloneProviderPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type StandaloneProviderChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StandaloneProviderReply = {
  text: string;
  debugTrace: StandaloneAiDebugPassTrace;
  /** 服务端回传的模型名，拿不到时为 undefined */
  model?: string;
};

type RequestStandaloneProviderTextInput = {
  api: ApiConfig;
  prompt: StandaloneProviderPrompt | { messages: StandaloneProviderChatMessage[] };
  signal: AbortSignal;
  logPrefix: string;
  onPartialText?: (text: string) => void;
  temperature?: number;
  /** 首字超时（毫秒）：流式请求超过这个时间没出首字就判失败；缺省或非正数 = 不启用 */
  firstTokenTimeoutMs?: number;
};

export function hasCompleteStandaloneApiConfig(api: ApiConfig): boolean {
  return hasCompleteStandaloneProviderApiConfig(api as StandaloneProviderApiConfig);
}

export async function requestStandaloneProviderText(
  input: RequestStandaloneProviderTextInput,
): Promise<StandaloneProviderReply> {
  const normalizedApiUrl = normalizeStandaloneOpenAiApiUrl(input.api.apiurl);
  if (!normalizedApiUrl) {
    throw new Error('API 地址无效，请填写完整的 OpenAI 接口地址');
  }

  const reply = await requestStandaloneProviderTextCore({
    api: {
      apiurl: normalizedApiUrl,
      key: input.api.key,
      model: input.api.model,
      source: input.api.source,
    },
    prompt: input.prompt,
    signal: input.signal,
    logPrefix: input.logPrefix,
    onPartialText: input.onPartialText,
    temperature: input.temperature,
    firstTokenTimeoutMs: input.firstTokenTimeoutMs,
  });

  return {
    text: reply.text,
    model: reply.model,
    debugTrace: reply.debugTrace as StandaloneAiDebugPassTrace,
  };
}
