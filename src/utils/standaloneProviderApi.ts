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
};

type RequestStandaloneProviderTextInput = {
  api: ApiConfig;
  prompt: StandaloneProviderPrompt | { messages: StandaloneProviderChatMessage[] };
  signal: AbortSignal;
  logPrefix: string;
  onPartialText?: (text: string) => void;
  temperature?: number;
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
  });

  return {
    text: reply.text,
    debugTrace: reply.debugTrace as StandaloneAiDebugPassTrace,
  };
}
