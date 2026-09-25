/**
 * NovelAI 兼容接口的出图客户端。
 *
 * ## 一份代码适配两类渠道
 *
 * 地址栏是通用的：既能填 NovelAI 官方（`https://image.novelai.net`），
 * 也能填任何 NovelAI 协议站。两者的能力差异由这里自动兜住 ——
 * **一律按「能力最弱的兼容站」设计**，官方多出来的能力当增强，
 * 这样不会出现「只在官方能跑」的分支。
 *
 * 实测结论（2026-09-25，兼容站）：
 * - 只回 zip（官方可带 `Accept: application/json` 直出 JSON，但未实测）
 * - 没有流式端点、没有额度查询接口
 * - 尺寸只认三档，别的会被按宽高比自动归类
 * - 部分站会对参数做白名单 + 范围校验，超范围会被回退（这是站点行为，不是我们的 bug）
 *
 * ## 关于流式进度
 *
 * 官方文档有 `/ai/generate-image-stream`，但**没有官方 Key 实测过**，
 * 且兼容站一律 404。按「最弱能力」原则，第一版统一走普通端点 +
 * 界面上的等待态与计时，不实现流式解析 —— 未经实测的二进制协议不该进主线。
 */

import { base64ToDataUrl, bytesToDataUrl, extractImagesFromZip } from './zipReader';

/** 官方地址，界面上「填官方地址」快捷按钮用 */
export const NOVELAI_OFFICIAL_BASE_URL = 'https://image.novelai.net';

/** 实测 10–26 秒，留足余量；云端排队时会更久 */
export const NOVELAI_DEFAULT_TIMEOUT_MS = 180_000;

/** 只测地址连通用的短超时，不该让玩家在设置页等三分钟 */
export const NOVELAI_CONNECT_TEST_TIMEOUT_MS = 15_000;

/** 模型候选。**允许手填** —— 兼容站可能上架别的模型名 */
export const NOVELAI_MODEL_OPTIONS = [
  'nai-diffusion-5-full',
  'nai-diffusion-4-5-full',
  'nai-diffusion-4-5-curated',
] as const;

/** 采样器候选 · NAI 官方名（`k_` 前缀），填官方地址时用这套 */
const NOVELAI_SAMPLER_OFFICIAL = [
  'k_euler',
  'k_euler_ancestral',
  'k_dpmpp_2s_ancestral',
  'k_dpmpp_2m',
  'k_dpmpp_sde',
  'k_dpmpp_2m_sde',
  'ddim',
] as const;

/** 采样器候选 · 兼容站常见名（ComfyUI 的 KSampler 名），实测 latent.moe 认的是这套 */
const NOVELAI_SAMPLER_COMPAT = [
  'euler',
  'euler_ancestral',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'res_multistep',
  'er_sde',
  'uni_pc',
  'dpm_2',
  'dpm_2_ancestral',
  'heun',
  'lms',
] as const;

/**
 * 采样器候选，扁平表 —— 用来判断「当前值是不是候选之一」。
 *
 * 🔴 名单混了两套命名，都有用：填官方地址认 `k_` 那套，兼容站认 ComfyUI 那套
 * （实测：传 `res_multistep` 生效、传 `k_euler_ancestral` 被回退成 `euler`）。
 * 站点认不认由它自己决定，我们只负责把候选给全 —— 手填入口才是关键。
 */
export const NOVELAI_SAMPLER_OPTIONS: readonly string[] = [...NOVELAI_SAMPLER_OFFICIAL, ...NOVELAI_SAMPLER_COMPAT];

/** 采样器候选，分组表 —— 界面按组显示，别让两套命名混成一锅 */
export const NOVELAI_SAMPLER_GROUPS: readonly { id: 'official' | 'compat'; options: readonly string[] }[] = [
  { id: 'official', options: NOVELAI_SAMPLER_OFFICIAL },
  { id: 'compat', options: NOVELAI_SAMPLER_COMPAT },
];

/** 调度候选 · NAI 官方名 */
const NOVELAI_NOISE_SCHEDULE_OFFICIAL = ['karras', 'native', 'exponential', 'polyexponential'] as const;

/** 调度候选 · 兼容站常见名（ComfyUI 的 scheduler 名） */
const NOVELAI_NOISE_SCHEDULE_COMPAT = [
  'normal',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'beta',
  'linear_quadratic',
  'kl_optimal',
] as const;

/** 调度候选，扁平表 */
export const NOVELAI_NOISE_SCHEDULE_OPTIONS: readonly string[] = [
  ...NOVELAI_NOISE_SCHEDULE_OFFICIAL,
  ...NOVELAI_NOISE_SCHEDULE_COMPAT,
];

/** 调度候选，分组表 */
export const NOVELAI_NOISE_SCHEDULE_GROUPS: readonly { id: 'official' | 'compat'; options: readonly string[] }[] = [
  { id: 'official', options: NOVELAI_NOISE_SCHEDULE_OFFICIAL },
  { id: 'compat', options: NOVELAI_NOISE_SCHEDULE_COMPAT },
];

export class NovelAiImageError extends Error {
  readonly code:
    | 'invalid-url'
    | 'unreachable'
    | 'timeout'
    | 'aborted'
    | 'unauthorized'
    | 'payment-required'
    | 'content-rejected'
    | 'bad-response'
    | 'empty-output'
    | 'storage-full'
    | 'unknown';

  /** 服务端返回的原始说明，错误提示里带上便于排查 */
  readonly detail?: string;

  constructor(code: NovelAiImageError['code'], message: string, detail?: string) {
    super(message);
    this.name = 'NovelAiImageError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * 规范化地址：去空白、去结尾斜杠。
 * 地址填到「路径前缀」为止，程序只补 `/ai/generate-image`。
 */
export function normalizeNovelAiBaseUrl(rawUrl: string | undefined): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

/** 拼出真正的出图端点 */
export function resolveNovelAiEndpoint(baseUrl: string): string {
  const base = normalizeNovelAiBaseUrl(baseUrl);
  return base ? `${base}/ai/generate-image` : '';
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * `params_version` 必须跟模型代次匹配，写死会直接报错。
 * V5 用 4，V4.5 用 3；更老的代次官方文档没给准数，按 3 兜。
 */
export function resolveNovelAiParamsVersion(model: string): number {
  const normalized = model.toLowerCase();
  if (normalized.includes('-5-') || normalized.endsWith('-5')) return 4;
  return 3;
}

export interface NovelAiGenerateOptions {
  baseUrl: string;
  apiKey: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  noiseSchedule: string;
  ucPreset: number;
  qualityToggle: boolean;
  cfgRescale: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface NovelAiGeneratedImage {
  dataUrl: string;
  mimeType: string;
}

/** 把各种失败归一成带 code 的错误，界面据此给人话提示 */
function toNetworkError(error: unknown, timeoutMs: number): NovelAiImageError {
  if (error instanceof NovelAiImageError) return error;

  const name = (error as { name?: string } | null)?.name;
  if (name === 'AbortError') {
    return new NovelAiImageError('timeout', `请求超过 ${Math.round(timeoutMs / 1000)} 秒未返回`);
  }

  // fetch 在网络层失败时抛 TypeError，浏览器出于安全考虑不告诉我们是 DNS 还是 CORS
  return new NovelAiImageError('unreachable', String((error as Error)?.message ?? error));
}

/** 从 JSON 响应里挖出 base64 图片。官方未实测，这里对几种常见形状都兜一手。 */
function extractBase64Images(payload: unknown): string[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter((item): item is string => typeof item === 'string');
  }

  if (typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;

  for (const key of ['images', 'image', 'data', 'output']) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return [value];
    if (Array.isArray(value)) {
      const collected = value
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const nested = item as Record<string, unknown>;
            for (const nestedKey of ['b64_json', 'base64', 'image', 'data']) {
              const candidate = nested[nestedKey];
              if (typeof candidate === 'string' && candidate.length > 0) return candidate;
            }
          }
          return null;
        })
        .filter((item): item is string => item !== null);
      if (collected.length > 0) return collected;
    }
  }

  return [];
}

/** 把非 2xx 的响应翻成人话错误 */
async function describeHttpFailure(response: Response): Promise<NovelAiImageError> {
  let detail = '';
  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        detail = String(parsed.message ?? parsed.error ?? parsed.detail ?? text);
      } catch {
        detail = text;
      }
    }
  } catch {
    // 读不出正文就只按状态码说话
  }

  const trimmedDetail = detail.slice(0, 300);

  switch (response.status) {
    case 401:
    case 403:
      return new NovelAiImageError('unauthorized', 'unauthorized', trimmedDetail);
    case 402:
      return new NovelAiImageError('payment-required', 'payment-required', trimmedDetail);
    case 400:
    case 422:
      return new NovelAiImageError('content-rejected', 'content-rejected', trimmedDetail);
    default:
      return new NovelAiImageError('bad-response', `HTTP ${response.status}`, trimmedDetail);
  }
}

/** 把响应正文翻成图片。zip 走解包，JSON 走 base64 提取。 */
async function readImagesFromResponse(response: Response): Promise<NovelAiGeneratedImage[]> {
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();

  if (contentType.includes('json') || contentType.includes('text/plain')) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new NovelAiImageError('bad-response', 'json-parse-failed', String((error as Error)?.message ?? error));
    }

    const images = extractBase64Images(payload).map(base64 => ({
      dataUrl: base64ToDataUrl(base64),
      mimeType: 'image/png',
    }));

    if (images.length === 0) {
      throw new NovelAiImageError('empty-output', 'json-without-image');
    }

    return images;
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new NovelAiImageError('empty-output', 'empty-body');
  }

  const extracted = await extractImagesFromZip(buffer);
  if (extracted.length === 0) {
    throw new NovelAiImageError('empty-output', 'zip-without-image');
  }

  return extracted.map(item => ({
    dataUrl: bytesToDataUrl(item.bytes, item.mimeType),
    mimeType: item.mimeType,
  }));
}

/**
 * 发一次出图请求，返回图片数据。
 *
 * 先带 `Accept: application/json`（官方可能直出 JSON，省一次解包）；
 * 兼容站无视这个头、照样回 zip，于是走解包那条路。
 */
export async function generateNovelAiImage(options: NovelAiGenerateOptions): Promise<NovelAiGeneratedImage[]> {
  const endpoint = resolveNovelAiEndpoint(options.baseUrl);
  if (!endpoint || !isHttpUrl(endpoint)) {
    throw new NovelAiImageError('invalid-url', 'empty-url');
  }

  if (!options.apiKey.trim()) {
    throw new NovelAiImageError('unauthorized', 'empty-key');
  }

  const timeoutMs = options.timeoutMs ?? NOVELAI_DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey.trim()}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        input: options.prompt,
        model: options.model,
        action: 'generate',
        parameters: {
          width: options.width,
          height: options.height,
          scale: options.scale,
          sampler: options.sampler,
          steps: options.steps,
          n_samples: 1,
          ucPreset: options.ucPreset,
          qualityToggle: options.qualityToggle,
          negative_prompt: options.negativePrompt ?? '',
          noise_schedule: options.noiseSchedule,
          cfg_rescale: options.cfgRescale,
          params_version: resolveNovelAiParamsVersion(options.model),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await describeHttpFailure(response);
    }

    return await readImagesFromResponse(response);
  } catch (error) {
    if (options.signal?.aborted) {
      throw new NovelAiImageError('aborted', 'aborted');
    }
    throw toNetworkError(error, timeoutMs);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export type NovelAiConnectionStatus = 'ok' | 'unreachable' | 'invalid-url';

/**
 * 只测地址连通，**不验 Key、不消耗点数**。
 *
 * 做法：往出图端点发一个不带 Key 的轻量请求 —— 只要能拿到任何 HTTP 响应
 * （401 / 404 / 400 都算）就说明地址通，只有网络层报错（连不上、DNS 失败）才算不通。
 *
 * 代价：填错 Key 要等点出图才发现，所以 Key 输入框旁必须写明这句。
 */
export async function testNovelAiConnection(baseUrl: string): Promise<NovelAiConnectionStatus> {
  const endpoint = resolveNovelAiEndpoint(baseUrl);
  if (!endpoint || !isHttpUrl(endpoint)) {
    return 'invalid-url';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOVELAI_CONNECT_TEST_TIMEOUT_MS);

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '', model: '', action: 'generate', parameters: {} }),
      signal: controller.signal,
    });

    // 任何 HTTP 响应（含 401 / 404）都算地址通
    return 'ok';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

export type NovelAiModelListResult =
  | { ok: true; models: string[] }
  | { ok: false; reason: 'invalid-url' | 'unreachable' | 'unauthorized' | 'unsupported' };

/**
 * 模型列表端点候选，按顺序试。
 *
 * NAI 官方**没有公开的模型列表接口**，兼容站多数是 OpenAI 风格的 `/v1/models`。
 * 所以这里是「挨个试，哪个能出东西用哪个」——**全试不出来就老实说没有**，
 * 界面提示玩家手填，绝不编一份假名单出来。
 */
const NOVELAI_MODEL_ENDPOINT_SUFFIXES = ['/ai/models', '/v1/models', '/models'] as const;

/** 从各种常见形状里挖出模型名：数组 / `{data:[…]}` / `{models:[…]}` 都兜一手 */
function extractModelIds(payload: unknown): string[] {
  const collect = (value: unknown, depth: number): string[] => {
    if (depth > 3 || value === null || value === undefined) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(item => collect(item, depth + 1));
    if (typeof value !== 'object') return [];

    const record = value as Record<string, unknown>;
    for (const key of ['data', 'models', 'result', 'list', 'items']) {
      if (key in record) {
        const collected = collect(record[key], depth + 1);
        if (collected.length > 0) return collected;
      }
    }
    for (const key of ['id', 'name', 'model']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) return [candidate.trim()];
    }
    return [];
  };

  return [...new Set(collect(payload, 0).map(item => item.trim()).filter(Boolean))];
}

/**
 * 问站点要一份模型名单。
 *
 * 只读接口、不消耗点数；拿不到不是错误，只是这个站没提供 —— 由界面提示玩家手填。
 */
export async function fetchNovelAiModels(baseUrl: string, apiKey: string): Promise<NovelAiModelListResult> {
  const base = normalizeNovelAiBaseUrl(baseUrl);
  if (!base || !isHttpUrl(base)) {
    return { ok: false, reason: 'invalid-url' };
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = apiKey.trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }

  let anyHttpResponse = false;
  let sawUnauthorized = false;

  for (const suffix of NOVELAI_MODEL_ENDPOINT_SUFFIXES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOVELAI_CONNECT_TEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${base}${suffix}`, { method: 'GET', headers, signal: controller.signal });
      anyHttpResponse = true;

      if (response.status === 401 || response.status === 403) {
        sawUnauthorized = true;
        continue;
      }
      if (!response.ok) continue;

      const payload: unknown = await response.json().catch(() => null);
      const models = extractModelIds(payload);
      if (models.length > 0) {
        return { ok: true, models };
      }
    } catch {
      // 这个端点不通就试下一个
    } finally {
      clearTimeout(timer);
    }
  }

  if (!anyHttpResponse) return { ok: false, reason: 'unreachable' };
  return { ok: false, reason: sawUnauthorized ? 'unauthorized' : 'unsupported' };
}
