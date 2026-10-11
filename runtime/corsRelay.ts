/**
 * 浏览器跨域（CORS）中转的判据与地址构造。
 *
 * 背景：部分第三方 AI 接口不返回跨域响应头，网页版直连会被浏览器直接拦掉，
 * 前端只能看到 `Failed to fetch`。这时改走本站同域中转（`/api/relay?target=...`）
 * 就能绕开跨域限制。服务端实现在项目根的 `functions/api/relay.ts`。
 *
 * ⚠️ 判据刻意很窄 —— 只有「请求根本没发出去 / 响应根本没拿到」才允许改走中转：
 * HTTP 4xx/5xx 说明上游确实收到了请求（密钥错、模型名错），重发一遍既没用也可能重复计费。
 */

/** 同域中转端点路径（Pages Functions 的文件名决定）。 */
export const CORS_RELAY_PATH = '/api/relay';

/** 中转成功后写进调试留档的标记字段名。 */
export const CORS_RELAY_TRACE_FLAG = 'via_relay';

/**
 * 浏览器因网络层原因让 `fetch` 直接 reject 时常见的消息。
 * 各浏览器措辞不同（Chrome/Firefox 是 `Failed to fetch`、Safari 是 `Load failed`、
 * 部分环境是 `NetworkError` / `fetch failed`），这里都认。
 */
const BROWSER_FETCH_ERROR_PATTERN = /Failed to fetch|Load failed|NetworkError|network request failed|fetch failed/i;

const LOCAL_HOST_PATTERN = /(^|\.)(localhost|local|localdomain|internal|lan|home|in-addr\.arpa|ip6\.arpa)$/i;

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const numbers: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    numbers.push(value);
  }
  return numbers;
}

function isPrivateIpv4(hostname: string): boolean {
  const numbers = parseIpv4(hostname);
  if (!numbers) return false;
  const [a, b] = numbers;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return a >= 224;
}

function isPrivateIpv6(hostname: string): boolean {
  const value = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (!value.includes(':')) return false;
  if (value === '::' || value === '::1') return true;
  const head = Number.parseInt(value.split(':')[0] || '0', 16);
  if (!Number.isInteger(head)) return true;
  if ((head & 0xfe00) === 0xfc00) return true;
  if ((head & 0xffc0) === 0xfe80) return true;
  return false;
}

/**
 * 判断接口地址是不是本机 / 局域网地址。
 *
 * 这类地址同域中转也到不了（中继在云端，看不见玩家自己的机器），
 * 所以别白试一次，直接把原来的错误抛给玩家。
 */
export function isLocalOrPrivateApiUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return false;
  if (hostname === 'localhost' || LOCAL_HOST_PATTERN.test(hostname)) return true;
  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) return true;
  return false;
}

/**
 * 判断这次失败像不像「被浏览器跨域拦掉 / 根本没连上」。
 *
 * 玩家主动取消（AbortError）不算 —— 那不是失败，是玩家自己掐的。
 */
export function isSuspectedBrowserCorsFailure(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown }).name;
  if (name === 'AbortError') return false;
  const message = error instanceof Error ? error.message : String(error);
  if (/abort/i.test(message)) return false;
  return BROWSER_FETCH_ERROR_PATTERN.test(message);
}

/**
 * 构造同域中转地址。
 *
 * 上游完整地址放在 query 里而不是拼进路径 —— 上游自带的 query（如 `?api-version=...`）
 * 拼进路径会和本端点的路径互相污染，也会让路径白名单校验失准。
 */
export function buildCorsRelayUrl(targetUrl: string, origin?: string): string {
  const path = `${CORS_RELAY_PATH}?target=${encodeURIComponent(targetUrl)}`;
  return origin ? `${origin.replace(/\/+$/, '')}${path}` : path;
}
