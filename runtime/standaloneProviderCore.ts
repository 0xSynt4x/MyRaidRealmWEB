import {
  normalizeOpenAiCompatibleApiUrl,
  normalizeOpenAiCompatibleChatCompletionsApiUrl,
} from './openAiCompatibleApiUrl';

type RecordLike = Record<string, unknown>;

export type StandaloneProviderApiConfig = {
  apiurl: string;
  key: string;
  model: string;
  source: 'openai_compatible';
};

export type StandaloneProviderChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StandaloneProviderPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type StandaloneProviderReplyDebugTrace = {
  api_label: string;
  api_mode: string;
  requested_at: string;
  transport_mode: 'streaming' | 'non_streaming';
  request_messages: StandaloneProviderChatMessage[];
  request_body_text: string;
  raw_response_text: string;
  extracted_text: string;
  error_message: string | null;
  /** 实际请求的完整地址（含 query）；用于失败时定位「打到哪」。 */
  api_url: string;
  /** HTTP 状态码；连响应都没拿到（网络 / CORS / 超时）时为 null。 */
  http_status?: number | null;
};

export type StandaloneProviderReply = {
  text: string;
  debugTrace: StandaloneProviderReplyDebugTrace;
  /**
   * 服务端在响应里回传的模型名（OpenAI 兼容协议下流式 chunk 与非流式响应体都带）。
   * 拿不到时为 undefined —— 它只用于界面展示，缺失时展示层回退到占位文案。
   */
  model?: string;
};

export type RequestStandaloneProviderTextCoreInput = {
  api: StandaloneProviderApiConfig;
  prompt: StandaloneProviderPrompt | { messages: StandaloneProviderChatMessage[] };
  signal: AbortSignal;
  logPrefix: string;
  onPartialText?: (text: string) => void;
  temperature?: number;
  /**
   * 首字超时（毫秒）：流式请求从发出算起，超过这个时间没收到任何正文增量就掐断、判为失败。
   * 缺省或非正数 = 不启用，行为与之前完全一致。
   */
  firstTokenTimeoutMs?: number;
};

/**
 * 首字超时错误的机器码前缀，消息形如 `standalone_first_token_timeout:30`。
 * 上层（`src/utils/remoteApiError.ts`）据此换成对应语言的界面文案。
 *
 * ⚠️ 这里刻意不带 abort / cancel / stopped 字样：上层用正则识别「用户主动取消」，
 * 误命中会把一次失败当成玩家自己掐的，静默吞掉错误提示。
 */
export const STANDALONE_FIRST_TOKEN_TIMEOUT_CODE = 'standalone_first_token_timeout';

function isRecord(value: unknown): value is RecordLike {
  return typeof value === 'object' && value !== null;
}

function extractOpenAiContentText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map(item => {
      if (typeof item === 'string') {
        return item;
      }

      if (!isRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      if (isRecord(item.text) && typeof item.text.value === 'string') {
        return item.text.value;
      }

      if (typeof item.output_text === 'string') {
        return item.output_text;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractOpenAiOutputText(payload: RecordLike): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      return extractOpenAiContentText(item.content);
    })
    .filter(Boolean)
    .join('\n');
}

function extractOpenAiResponseText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new Error('OpenAI 响应格式无效');
  }

  const directOutputText = extractOpenAiOutputText(payload);
  if (directOutputText.trim()) {
    return directOutputText;
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new Error('OpenAI 响应中没有可用结果');
  }

  const firstChoice = choices[0];
  if (typeof firstChoice.text === 'string' && firstChoice.text.trim()) {
    return firstChoice.text;
  }

  const message = firstChoice.message;
  if (!isRecord(message)) {
    throw new Error('OpenAI 响应缺少 message 内容');
  }

  const text = extractOpenAiContentText(message.content);
  if (!text.trim()) {
    throw new Error('OpenAI 响应文本为空');
  }

  return text;
}

/**
 * 从 OpenAI 兼容响应里取出服务端回传的模型名。
 * 流式时每个 chunk 都带；非流式时响应体顶层带。拿不到就返回 undefined。
 */
function extractOpenAiResponseModel(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const model = payload.model;
  if (typeof model === 'string' && model.trim()) {
    return model.trim();
  }

  return undefined;
}

async function readErrorResponseText(response: Response, logPrefix: string): Promise<string> {
  try {
    const text = await response.text();
    return text.trim();
  } catch (error) {
    console.warn(`${logPrefix} 读取错误响应内容失败:`, error);
    return '';
  }
}

function extractOpenAiDeltaText(payload: unknown): string {
  if (!isRecord(payload)) {
    return '';
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
    const firstChoice = choices[0];
    const delta = firstChoice.delta;
    if (isRecord(delta)) {
      return extractOpenAiContentText(delta.content) || (typeof delta.content === 'string' ? delta.content : '');
    }
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isRecord(item)) {
        return '';
      }
      if (typeof item.text === 'string') {
        return item.text;
      }
      return extractOpenAiContentText(item.content);
    })
    .filter(Boolean)
    .join('');
}

async function readOpenAiStreamingResponse(
  response: Response,
  onPartialText: (text: string) => void,
): Promise<{ text: string; rawTranscript: string; model?: string }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const rawResponseText = await response.text();
    const parsedPayload = JSON.parse(rawResponseText) as unknown;
    return {
      text: extractOpenAiResponseText(parsedPayload),
      rawTranscript: rawResponseText,
      model: extractOpenAiResponseModel(parsedPayload),
    };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';
  let rawTranscript = '';
  let responseModel: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const decodedChunk = decoder.decode(value, { stream: true });
    rawTranscript += decodedChunk;
    buffer += decodedChunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) {
        continue;
      }

      const payloadText = line.slice(5).trim();
      if (!payloadText || payloadText === '[DONE]') {
        continue;
      }

      try {
        const payload = JSON.parse(payloadText);
        // 模型名要在 continue 之前抓：首个 chunk 通常只有 role、没有正文增量
        const chunkModel = extractOpenAiResponseModel(payload);
        if (chunkModel) {
          responseModel = chunkModel;
        }

        const deltaText = extractOpenAiDeltaText(payload);
        if (!deltaText) {
          continue;
        }

        accumulatedText += deltaText;
        onPartialText(accumulatedText);
      } catch {
        continue;
      }
    }
  }

  const finalChunk = decoder.decode();
  rawTranscript += finalChunk;
  buffer += finalChunk;
  const trailingLine = buffer.trim();
  if (trailingLine.startsWith('data:')) {
    const payloadText = trailingLine.slice(5).trim();
    if (payloadText && payloadText !== '[DONE]') {
      try {
        const payload = JSON.parse(payloadText);
        const chunkModel = extractOpenAiResponseModel(payload);
        if (chunkModel) {
          responseModel = chunkModel;
        }

        const deltaText = extractOpenAiDeltaText(payload);
        if (deltaText) {
          accumulatedText += deltaText;
          onPartialText(accumulatedText);
        }
      } catch {
        // ignore malformed trailing chunk
      }
    }
  }

  if (!accumulatedText.trim() && rawTranscript.trim()) {
    try {
      const parsedPayload = JSON.parse(rawTranscript) as unknown;
      return {
        text: extractOpenAiResponseText(parsedPayload),
        rawTranscript,
        model: extractOpenAiResponseModel(parsedPayload) ?? responseModel,
      };
    } catch {
      // keep original streaming result when transcript is not a full JSON payload
    }
  }

  return {
    text: accumulatedText,
    rawTranscript,
    model: responseModel,
  };
}

export function hasCompleteStandaloneProviderApiConfig(api: Partial<StandaloneProviderApiConfig>): boolean {
  return Boolean(normalizeOpenAiCompatibleApiUrl(api.apiurl) && api.model);
}

/**
 * 把失败 trace 挂到抛出的异常上，交给上层留档。
 *
 * 用「挂属性」而不是自定义 Error 子类：调用链上有多处 `error instanceof Error`
 * 与消息文案判断，换子类会改变它们的走向；挂属性对既有逻辑完全透明。
 */
function attachFailureTrace(error: unknown, trace: StandaloneProviderReplyDebugTrace): Error {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  (wrapped as Error & { standaloneDebugTrace?: StandaloneProviderReplyDebugTrace }).standaloneDebugTrace = trace;
  return wrapped;
}

export async function requestStandaloneProviderTextCore(
  input: RequestStandaloneProviderTextCoreInput,
): Promise<StandaloneProviderReply> {
  const normalizedApiUrl = normalizeOpenAiCompatibleChatCompletionsApiUrl(input.api.apiurl);
  if (!normalizedApiUrl) {
    throw new Error('API 地址无效，请填写完整的 OpenAI 接口地址');
  }

  const messages =
    'messages' in input.prompt
      ? input.prompt.messages
      : [
          { role: 'system' as const, content: input.prompt.systemPrompt },
          { role: 'user' as const, content: input.prompt.userPrompt },
        ];

  const requestedAt = new Date().toISOString();
  const requestBody = {
    model: input.api.model,
    temperature: typeof input.temperature === 'number' ? input.temperature : 1,
    stream: Boolean(input.onPartialText),
    messages,
  };
  const requestBodyText = JSON.stringify(requestBody);
  const apiMode = input.api.source;
  const apiLabel = `${input.api.source}:${input.api.model}`;

  /**
   * 失败留档的公共字段：请求一发出就有这些，失败时只缺响应侧的信息。
   * 上层拿它拼 `standaloneDebugTrace`，让「失败的请求」在 AI 调试页里也能回看。
   */
  const failureTraceBase = {
    api_label: apiLabel,
    api_mode: apiMode,
    requested_at: requestedAt,
    request_messages: messages,
    request_body_text: requestBodyText,
    api_url: normalizedApiUrl,
  };
  /** HTTP 非 2xx 时已经拼好的 trace，在 catch 里原样复用，避免被兜底逻辑覆盖。 */
  let httpFailureTrace: StandaloneProviderReplyDebugTrace | null = null;
  /** 非流式路径读到的响应原文；解析失败时用它当「服务端回了什么」。 */
  let nonStreamingRawText: string | null = null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (input.api.key) {
    headers.Authorization = `Bearer ${input.api.key}`;
  }

  // 首字看门狗与「玩家主动取消」共用同一个控制器：谁先触发都掐断这次请求。
  // 外部 signal 原样桥接进来，保证点停止仍然立即生效。
  const requestController = new AbortController();
  const abortFromExternal = () => requestController.abort();
  if (input.signal.aborted) {
    requestController.abort();
  } else {
    input.signal.addEventListener('abort', abortFromExternal, { once: true });
  }

  const firstTokenTimeoutMs =
    typeof input.firstTokenTimeoutMs === 'number' && input.firstTokenTimeoutMs > 0 ? input.firstTokenTimeoutMs : 0;
  const onPartialText = input.onPartialText;
  let firstTokenTimer: ReturnType<typeof setTimeout> | null = null;
  let firstTokenTimedOut = false;
  const stopFirstTokenWatch = () => {
    if (firstTokenTimer !== null) {
      clearTimeout(firstTokenTimer);
      firstTokenTimer = null;
    }
  };

  try {
    // 计时从「请求发出」开始：连接挂死、响应头都不回的情况同样算失败。
    if (onPartialText && firstTokenTimeoutMs > 0) {
      firstTokenTimer = setTimeout(() => {
        firstTokenTimedOut = true;
        requestController.abort();
      }, firstTokenTimeoutMs);
    }

    const response = await fetch(normalizedApiUrl, {
      method: 'POST',
      headers,
      body: requestBodyText,
      signal: requestController.signal,
    });

    if (!response.ok) {
      const details = await readErrorResponseText(response, input.logPrefix);
      const httpErrorMessage = `HTTP ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`;
      // 先把 trace 备好再抛：catch 里直接复用，不会被下面的兜底逻辑覆盖掉。
      httpFailureTrace = {
        ...failureTraceBase,
        transport_mode: onPartialText && response.body ? 'streaming' : 'non_streaming',
        raw_response_text: details,
        extracted_text: '',
        error_message: httpErrorMessage,
        http_status: response.status,
      };
      throw new Error(httpErrorMessage);
    }

    if (onPartialText && response.body) {
      // 收到第一段正文增量就停表；之后出字再慢也不再按首字超时处理。
      const streamingResult = await readOpenAiStreamingResponse(response, text => {
        stopFirstTokenWatch();
        onPartialText(text);
      });
      return {
        text: streamingResult.text,
        model: streamingResult.model,
        debugTrace: {
          api_label: apiLabel,
          api_mode: apiMode,
          requested_at: requestedAt,
          transport_mode: 'streaming',
          request_messages: messages,
          request_body_text: requestBodyText,
          // 🔴 不落盘：流式原始抄本是整条 SSE 的逐字节转录（一个字要裹 150-200 字节的 JSON 包装），
          // 体积可达正文的上百倍，而它只被调试面板在正文提取失败时当兜底用。正文已由 extracted_text 保存。
          raw_response_text: '',
          extracted_text: streamingResult.text,
          error_message: null,
          api_url: normalizedApiUrl,
        },
      };
    }

    const rawResponseText = await response.text();
    nonStreamingRawText = rawResponseText;
    const parsedPayload = JSON.parse(rawResponseText) as unknown;
    const extractedText = extractOpenAiResponseText(parsedPayload);

    return {
      text: extractedText,
      model: extractOpenAiResponseModel(parsedPayload),
      debugTrace: {
        api_label: apiLabel,
        api_mode: apiMode,
        requested_at: requestedAt,
        transport_mode: 'non_streaming',
        request_messages: messages,
        request_body_text: requestBodyText,
        raw_response_text: rawResponseText,
        extracted_text: extractedText,
        error_message: null,
        api_url: normalizedApiUrl,
      },
    };
  } catch (error) {
    if (firstTokenTimedOut) {
      const timeoutCode = `${STANDALONE_FIRST_TOKEN_TIMEOUT_CODE}:${Math.round(firstTokenTimeoutMs / 1000)}`;
      throw attachFailureTrace(new Error(timeoutCode), {
        ...failureTraceBase,
        transport_mode: 'streaming',
        raw_response_text: '',
        extracted_text: '',
        error_message: timeoutCode,
        http_status: null,
      });
    }

    // 玩家主动取消不算失败，不记档：原样抛出，上层按「已取消」处理。
    if (requestController.signal.aborted) {
      throw error;
    }

    // HTTP 非 2xx 的 trace 已在上面备好，别用兜底信息把它覆盖掉。
    if (httpFailureTrace) {
      throw attachFailureTrace(error, httpFailureTrace);
    }

    // 网络 / CORS / 响应解析失败：拿不到状态码，但非流式路径读到的原文要留下。
    throw attachFailureTrace(error, {
      ...failureTraceBase,
      transport_mode: onPartialText ? 'streaming' : 'non_streaming',
      raw_response_text: nonStreamingRawText ?? '',
      extracted_text: '',
      error_message: error instanceof Error ? error.message : String(error),
      http_status: null,
    });
  } finally {
    stopFirstTokenWatch();
    input.signal.removeEventListener('abort', abortFromExternal);
  }
}
