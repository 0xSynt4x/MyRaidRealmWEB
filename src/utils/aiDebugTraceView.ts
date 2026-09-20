import { tCurrent } from '../i18n';
import type { MessageRecord } from '../stores/messages';
import { resolvePreferredVariableDebugPass, type StandaloneAiDebugPassTrace } from './standaloneAiDebug';

/**
 * AI 调试信息解析工具
 *
 * 把「AI 调试」页面里的原始数据（模型请求、原始响应、流式碎片）解析成可读文本或结构化视图。
 * 全部为纯函数：不依赖组件状态、不访问 store、不触碰 window。
 */

export type DebugReadableMetaRow = {
  label: string;
  value: string;
};
export type DebugReadableMessageItem = {
  index: number;
  roleLabel: string;
  roleTone: 'system' | 'user' | 'assistant' | 'unknown';
  metaRows: DebugReadableMetaRow[];
  content: string;
};
export type DebugRequestBodyNoteBlock = {
  label: string;
  value: string;
  structured?: boolean;
};
export type DebugRequestBodyView = {
  summaryRows: DebugReadableMetaRow[];
  noteBlocks: DebugRequestBodyNoteBlock[];
  fallbackText: string;
  hasStructuredContent: boolean;
};

export function hasDebugTrace(message: MessageRecord | null | undefined) {
  return Boolean(message?.debug_trace?.main_pass || resolvePreferredVariableDebugPass(message?.debug_trace));
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2) ?? tCurrent('common.notAvailable');
}

function asTrimmedDebugString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isDebugRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function debugRoleLabel(role: unknown): string {
  if (role === 'system') return '系统';
  if (role === 'user') return '用户';
  if (role === 'assistant') return '助手';
  return '未知';
}

function debugRoleTone(role: unknown): DebugReadableMessageItem['roleTone'] {
  if (role === 'system') return 'system';
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'assistant';
  return 'unknown';
}

function asDebugDisplayValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function createDebugMetaRow(label: string, value: unknown): DebugReadableMetaRow | null {
  const normalized = asDebugDisplayValue(value);
  if (!normalized) {
    return null;
  }

  return { label, value: normalized };
}

function readableDebugContentValue(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  const extractedText = extractDebugContentText(content).trim();
  if (extractedText) {
    return extractedText;
  }

  if (content == null) {
    return '';
  }

  return prettyJson(content);
}

export function buildReadableDebugRequestMessages(messages: unknown): DebugReadableMessageItem[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  return messages.map((message, index) => {
    if (!isDebugRecord(message)) {
      return {
        index: index + 1,
        roleLabel: debugRoleLabel(undefined),
        roleTone: 'unknown',
        metaRows: [],
        content: prettyJson(message),
      };
    }

    const metaRows = [
      createDebugMetaRow('名称', message.name),
      createDebugMetaRow('工具调用', message.tool_call_id),
      createDebugMetaRow('类型', message.type),
    ].filter((row): row is DebugReadableMetaRow => Boolean(row));

    return {
      index: index + 1,
      roleLabel: debugRoleLabel(message.role),
      roleTone: debugRoleTone(message.role),
      metaRows,
      content: readableDebugContentValue(message.content) || tCurrent('common.notAvailable'),
    };
  });
}

export function buildReadableDebugRequestBodyView(rawRequestBody: unknown): DebugRequestBodyView {
  const trimmed = asTrimmedDebugString(rawRequestBody);
  if (!trimmed) {
    return {
      summaryRows: [],
      noteBlocks: [],
      fallbackText: tCurrent('common.notAvailable'),
      hasStructuredContent: false,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isDebugRecord(parsed)) {
      return {
        summaryRows: [],
        noteBlocks: [],
        fallbackText: trimmed,
        hasStructuredContent: false,
      };
    }

    const summaryRows = [
      createDebugMetaRow('模型', parsed.model),
      typeof parsed.stream === 'boolean' ? { label: '流式返回', value: parsed.stream ? '是' : '否' } : null,
      createDebugMetaRow('温度', parsed.temperature),
      createDebugMetaRow('Top P', parsed.top_p),
      createDebugMetaRow('最大 tokens', parsed.max_tokens),
      createDebugMetaRow('最大 completion tokens', parsed.max_completion_tokens),
      Array.isArray(parsed.tools) ? { label: '工具数量', value: String(parsed.tools.length) } : null,
      Array.isArray(parsed.messages) ? { label: 'messages 条数', value: String(parsed.messages.length) } : null,
    ].filter((row): row is DebugReadableMetaRow => Boolean(row));

    const noteBlocks: DebugRequestBodyNoteBlock[] = [];
    if (Array.isArray(parsed.messages)) {
      noteBlocks.push({
        label: 'messages 说明',
        value: '消息内容已在上方“实际发送的 messages 数组”中按阅读视图展开。',
      });
    }

    const summarizedKeys = new Set([
      'messages',
      'model',
      'stream',
      'temperature',
      'top_p',
      'max_tokens',
      'max_completion_tokens',
      'tools',
    ]);
    const otherFields = Object.fromEntries(Object.entries(parsed).filter(([key]) => !summarizedKeys.has(key)));

    if (Object.keys(otherFields).length > 0) {
      noteBlocks.push({
        label: '其他请求参数',
        value: prettyJson(otherFields),
        structured: true,
      });
    }

    return {
      summaryRows,
      noteBlocks,
      fallbackText: trimmed,
      hasStructuredContent: summaryRows.length > 0 || noteBlocks.length > 0,
    };
  } catch {
    return {
      summaryRows: [],
      noteBlocks: [],
      fallbackText: trimmed,
      hasStructuredContent: false,
    };
  }
}

function extractDebugContentText(content: unknown): string {
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

      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      if (isDebugRecord(item.text) && typeof item.text.value === 'string') {
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

function extractDebugOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      return extractDebugContentText(item.content);
    })
    .filter(Boolean)
    .join('\n');
}

function extractDebugResponseText(payload: unknown): string {
  if (!isDebugRecord(payload)) {
    return '';
  }

  const directOutputText = extractDebugOutputText(payload);
  if (directOutputText.trim()) {
    return directOutputText;
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isDebugRecord(choices[0])) {
    return '';
  }

  const firstChoice = choices[0];
  if (typeof firstChoice.text === 'string' && firstChoice.text.trim()) {
    return firstChoice.text;
  }

  const message = firstChoice.message;
  if (!isDebugRecord(message)) {
    return '';
  }

  return extractDebugContentText(message.content);
}

function extractDebugStreamingDeltaText(payload: unknown): string {
  if (!isDebugRecord(payload)) {
    return '';
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0 && isDebugRecord(choices[0])) {
    const firstChoice = choices[0];
    const delta = firstChoice.delta;
    if (isDebugRecord(delta)) {
      return extractDebugContentText(delta.content) || (typeof delta.content === 'string' ? delta.content : '');
    }
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      return extractDebugContentText(item.content);
    })
    .filter(Boolean)
    .join('');
}

function extractReadableTextFromSseTranscript(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  let aggregatedText = '';
  let sawSsePayload = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) {
      continue;
    }

    sawSsePayload = true;
    const payloadText = line.slice(5).trim();
    if (!payloadText || payloadText === '[DONE]') {
      continue;
    }

    try {
      const payload = JSON.parse(payloadText) as unknown;
      const deltaText = extractDebugStreamingDeltaText(payload);
      if (deltaText) {
        aggregatedText += deltaText;
      }
    } catch {
      continue;
    }
  }

  return sawSsePayload ? aggregatedText.trim() : '';
}

function extractReadableTextFromRawResponse(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return '';
  }

  const sseText = extractReadableTextFromSseTranscript(trimmed);
  if (sseText) {
    return sseText;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const responseText = extractDebugResponseText(parsed).trim();
    if (responseText) {
      return responseText;
    }
  } catch {
    // not JSON, fall back to original text
  }

  return trimmed;
}

export function readableDebugPassResponse(pass: StandaloneAiDebugPassTrace | undefined): string {
  if (!pass) {
    return tCurrent('common.notAvailable');
  }

  const extractedText = asTrimmedDebugString(pass.extracted_text);
  if (extractedText) {
    return extractedText;
  }

  const rawResponseText = asTrimmedDebugString(pass.raw_response_text);
  const readableFromRaw = extractReadableTextFromRawResponse(rawResponseText);
  if (readableFromRaw) {
    return readableFromRaw;
  }

  return tCurrent('common.notAvailable');
}

export function transportModeLabel(mode: 'streaming' | 'non_streaming') {
  return mode === 'streaming'
    ? tCurrent('contentCenter.aiDebug.metaTransportStreaming')
    : tCurrent('contentCenter.aiDebug.metaTransportNonStreaming');
}
