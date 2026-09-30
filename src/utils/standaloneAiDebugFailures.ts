/**
 * AI 调试页 · 失败请求留档（纯数据层）
 *
 * ## 为什么要有这个模块
 *
 * AI 调试页的列表是「assistant 消息楼层」派生的，记录挂在楼层的 `debug_trace` 上。
 * 而主 API 失败时整个回合抛错、**没有任何楼层被写进消息列表** —— 于是失败请求在
 * 调试页里天然不存在，玩家只能看到一个一闪而过的弹窗，之后无从回查。
 *
 * 这里把「实际发出、但没拿到可用结果的请求」单独留一份档：请求一发出就存快照
 * （地址 / 模型 / 完整请求体 / 时间），失败时补上 HTTP 状态、服务端原始返回与错误文案。
 *
 * ## 约束
 *
 * - 🔴 **不 import vue / pinia** —— 要被 `scripts/tests/` 的 node 脚本直接 require。
 * - 🔴 存储 key 必须同时出现在 `standaloneStorage.ts` 的 `MIGRATED_FIXED_KEYS` 里，
 *   否则开发构建下同步读会直接抛错。
 * - 不绑会话：换存档后旧记录仍在，靠「只留最近 N 条」自然淘汰。调试用途足够，
 *   且避免了把 store 初始化改成异步。
 */

import type { StandaloneAiDebugPassTrace } from './standaloneAiDebug';
import { readStorageSync, removeStorageSync, writeStorageSync } from './standaloneStorage';

/**
 * 存储 key。
 * 🔴 改动会丢老用户数据，且必须与 `standaloneStorage.ts` 的 `MIGRATED_FIXED_KEYS` 保持一致。
 */
export const STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY = 'th1980s:standalone-ai-debug-failures';

/** 只保留最近这么多条，新的插到最前，旧的滚掉。 */
export const MAX_STANDALONE_AI_DEBUG_FAILURES = 20;

/** 单条字段截断上限：请求体是完整提示词，不截会顶满配额。 */
export const STANDALONE_FAILURE_REQUEST_BODY_LIMIT = 60000;
export const STANDALONE_FAILURE_RAW_RESPONSE_LIMIT = 20000;
export const STANDALONE_FAILURE_MESSAGE_CONTENT_LIMIT = 8000;

/** 截断处追加的标记（中文界面文案，不进提示词，纯展示用）。 */
export const STANDALONE_FAILURE_TRUNCATION_MARK = '\n…（已截断）';

/** 失败发生在哪一遍请求上。 */
export type StandaloneAiDebugFailurePass = 'main_pass' | 'variable_update_pass';

export type StandaloneAiDebugFailureRecord = {
  id: string;
  /** ISO 时间串 */
  occurred_at: string;
  pass: StandaloneAiDebugFailurePass;
  /** 第几次尝试，1 起 */
  attempt: number;
  total_attempts: number;
  /** 拿不到响应时为 null */
  http_status: number | null;
  trace: StandaloneAiDebugPassTrace;
};

export type StandaloneAiDebugFailureInput = {
  pass: StandaloneAiDebugFailurePass;
  attempt: number;
  totalAttempts: number;
  trace: StandaloneAiDebugPassTrace;
  /** 缺省时从 trace.http_status 取 */
  httpStatus?: number | null;
  /** 缺省时用当前时间 */
  occurredAt?: string;
};

function createFailureId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${random}`;
}

/** 超长就截断并加标记；短的原样返回。 */
function truncateFailureText(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}${STANDALONE_FAILURE_TRUNCATION_MARK}`;
}

/**
 * 把一条 trace 压到可落盘的体积。
 *
 * 🔴 流式请求的 `raw_response_text` 本来就该是空串（见 `standaloneProviderCore.ts` 的说明），
 * 这里不负责把它打开，只负责「万一很长就砍掉」。
 */
export function truncateFailureTraceForStorage(trace: StandaloneAiDebugPassTrace): StandaloneAiDebugPassTrace {
  return {
    ...trace,
    request_body_text: truncateFailureText(trace.request_body_text ?? '', STANDALONE_FAILURE_REQUEST_BODY_LIMIT),
    raw_response_text: truncateFailureText(trace.raw_response_text ?? '', STANDALONE_FAILURE_RAW_RESPONSE_LIMIT),
    // 非 2xx 时错误文案里会拼上服务端返回体，与 raw_response_text 同源，用同一上限兜住。
    error_message:
      typeof trace.error_message === 'string'
        ? truncateFailureText(trace.error_message, STANDALONE_FAILURE_RAW_RESPONSE_LIMIT)
        : (trace.error_message ?? null),
    request_messages: (trace.request_messages ?? []).map(message => ({
      ...message,
      content: truncateFailureText(message.content ?? '', STANDALONE_FAILURE_MESSAGE_CONTENT_LIMIT),
    })),
  };
}

/** 滚动逻辑：新的在最前，超过上限丢最旧。纯函数，便于断言。 */
export function pushFailureRecord(
  list: readonly StandaloneAiDebugFailureRecord[],
  record: StandaloneAiDebugFailureRecord,
): StandaloneAiDebugFailureRecord[] {
  return [record, ...list].slice(0, MAX_STANDALONE_AI_DEBUG_FAILURES);
}

/** 兜底空 trace：请求压根没走到「拿到响应」那步时用它占位，保证界面结构一致。 */
export function createFallbackFailureTrace(
  overrides: Partial<StandaloneAiDebugPassTrace> = {},
): StandaloneAiDebugPassTrace {
  return {
    api_label: '',
    api_mode: '',
    requested_at: new Date().toISOString(),
    transport_mode: 'non_streaming',
    request_messages: [],
    request_body_text: '',
    raw_response_text: '',
    extracted_text: '',
    error_message: null,
    ...overrides,
  };
}

function isFailureRecord(value: unknown): value is StandaloneAiDebugFailureRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StandaloneAiDebugFailureRecord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.occurred_at === 'string' &&
    (candidate.pass === 'main_pass' || candidate.pass === 'variable_update_pass') &&
    typeof candidate.attempt === 'number' &&
    typeof candidate.total_attempts === 'number' &&
    typeof candidate.trace === 'object' &&
    candidate.trace !== null
  );
}

/**
 * 读全部失败记录。
 *
 * 任何读不动的情况（没有数据、不是合法 JSON、结构不对）都返回 `[]` ——
 * 调试信息不值得让界面崩掉。
 */
export function loadStandaloneAiDebugFailures(): StandaloneAiDebugFailureRecord[] {
  try {
    const raw = readStorageSync<unknown>(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY);
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.filter(isFailureRecord).slice(0, MAX_STANDALONE_AI_DEBUG_FAILURES);
  } catch (error) {
    console.warn('[AiDebugFailures] 读取失败记录出错，按空列表处理:', error);
    return [];
  }
}

/**
 * 落盘，配额不够时逐条减半重试（最多 3 轮）。
 *
 * `writeStorageSync` 是「同步语义、异步落盘」，正常不会抛错；这层兜底针对的是
 * 极端情况下的同步失败，宁可少留几条也不要让整次写入无声消失。
 */
function writeFailureRecordsWithRetry(records: StandaloneAiDebugFailureRecord[]): void {
  let candidate = records;

  for (let round = 0; round < 3; round += 1) {
    try {
      writeStorageSync(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY, candidate);
      return;
    } catch (error) {
      console.warn(`[AiDebugFailures] 写入失败，第 ${round + 1} 轮减半重试:`, error);
      if (candidate.length <= 1) {
        return;
      }

      candidate = candidate.slice(0, Math.max(1, Math.floor(candidate.length / 2)));
    }
  }
}

/**
 * 追加一条失败记录。
 *
 * 只写存储，**不碰 pinia** —— 面板打开/切换时自己重新读。
 */
export function appendStandaloneAiDebugFailure(
  input: StandaloneAiDebugFailureInput,
): StandaloneAiDebugFailureRecord | null {
  try {
    const trace = truncateFailureTraceForStorage(input.trace);
    const record: StandaloneAiDebugFailureRecord = {
      id: createFailureId(),
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      pass: input.pass,
      attempt: input.attempt,
      total_attempts: input.totalAttempts,
      http_status: input.httpStatus ?? trace.http_status ?? null,
      trace,
    };

    writeFailureRecordsWithRetry(pushFailureRecord(loadStandaloneAiDebugFailures(), record));
    return record;
  } catch (error) {
    console.warn('[AiDebugFailures] 记录失败请求出错:', error);
    return null;
  }
}

/** 清空全部失败记录。 */
export function clearStandaloneAiDebugFailures(): void {
  try {
    removeStorageSync(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY);
  } catch (error) {
    console.warn('[AiDebugFailures] 清空失败记录出错:', error);
  }
}

/**
 * 从抛出的异常上取回失败 trace。
 *
 * 请求层在失败时把 trace 挂在 Error 上（见 `standaloneProviderCore.ts` 的 `attachFailureTrace`），
 * 这里把它读回来；拿不到就返回 null，由调用方决定兜底。
 */
export function readStandaloneProviderFailureTrace(error: unknown): StandaloneAiDebugPassTrace | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  // 属性名与 standaloneProviderCore.ts 的 attachFailureTrace 必须一致。
  const trace = (error as { standaloneDebugTrace?: unknown }).standaloneDebugTrace;
  if (typeof trace !== 'object' || trace === null) {
    return null;
  }

  return trace as StandaloneAiDebugPassTrace;
}
