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
};

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (input.api.key) {
    headers.Authorization = `Bearer ${input.api.key}`;
  }

  const response = await fetch(normalizedApiUrl, {
    method: 'POST',
    headers,
    body: requestBodyText,
    signal: input.signal,
  });

  if (!response.ok) {
    const details = await readErrorResponseText(response, input.logPrefix);
    throw new Error(`HTTP ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`);
  }

  if (input.onPartialText && response.body) {
    const streamingResult = await readOpenAiStreamingResponse(response, input.onPartialText);
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
      },
    };
  }

  const rawResponseText = await response.text();
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
    },
  };
}
