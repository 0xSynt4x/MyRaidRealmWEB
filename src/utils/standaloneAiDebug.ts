import { resolveStandaloneMainWorldbookPrompt } from './standaloneLocalContent';

export type StandaloneProviderChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StandaloneAiDebugTransportMode = 'streaming' | 'non_streaming';

export interface StandaloneAiDebugPassTrace {
  api_label: string;
  api_mode: string;
  requested_at: string;
  transport_mode: StandaloneAiDebugTransportMode;
  request_messages: StandaloneProviderChatMessage[];
  request_body_text: string;
  raw_response_text: string;
  extracted_text: string;
  error_message?: string | null;
  /**
   * 实际请求的完整地址（含 query）。
   * 🔴 必须是可选 —— 老消息里没有这个键，缺了要能正常读进来。
   */
  api_url?: string;
  /**
   * HTTP 状态码；网络 / CORS / 首字超时时为 null。
   * 🔴 同上，老数据没有这个键。
   */
  http_status?: number | null;
}

export interface StandaloneAssistantDebugTrace {
  main_pass?: StandaloneAiDebugPassTrace;
  variable_update_pass?: StandaloneAiDebugPassTrace;
  assistant_api_pass?: StandaloneAiDebugPassTrace;
}

export function mergeStandaloneAssistantDebugTrace(
  current: StandaloneAssistantDebugTrace | null | undefined,
  patch: Partial<StandaloneAssistantDebugTrace>,
): StandaloneAssistantDebugTrace | undefined {
  const next = {
    ...(current ?? {}),
    ...patch,
  };

  return next.main_pass || next.variable_update_pass || next.assistant_api_pass ? next : undefined;
}

export function resolvePreferredVariableDebugPass(
  trace: StandaloneAssistantDebugTrace | null | undefined,
): StandaloneAiDebugPassTrace | undefined {
  if (!trace) {
    return undefined;
  }

  return trace.assistant_api_pass ?? trace.variable_update_pass;
}

export function resolveMainPassWorldbookPromptFromTrace(
  trace: StandaloneAssistantDebugTrace | null | undefined,
): string {
  return resolveStandaloneMainWorldbookPrompt(
    (trace?.main_pass?.request_messages ?? []).map(message => message.content),
  );
}
