/**
 * 同域跨域中转端点（Cloudflare Pages Functions）。
 *
 * 用途：网页版玩家的浏览器直连第三方 AI 接口时，若对方未开放浏览器跨域（CORS），
 * 预检（OPTIONS）或正式请求会被浏览器直接拦掉，前端只能看到 `Failed to fetch`。
 * 本端点把请求从「玩家浏览器 → 第三方」改成「玩家浏览器 → 本站同域 → 第三方」，
 * 同域请求不受跨域限制，于是这类接口就能用了。
 *
 * 调用形态：`/api/relay?target=<urlencoded 完整上游地址>`。
 * 上游地址放在 query 里而不是拼进路径，避免上游自带的 query 与本端点路径互相污染。
 *
 * 🔴 这不是通用代理：只放行 AI 接口常见的几个尾巴路径，且挡掉内网地址，
 * 免得本站被当成任意流量的跳板。
 *
 * ⚠️ 本目录（项目根的 `functions/`）不在 `tsconfig.json` 的 include 里，
 * 所以 `pnpm typecheck` 不会检查它；`pnpm lint` 会（见 `eslint.config.mjs` 的 functions 段）。
 * 也因为项目没有装 `@cloudflare/workers-types`，这里只用运行时全局，不 import 任何类型包。
 */

/** 只转发这几个「AI 接口尾巴」，防止本端点被当成通用代理。 */
const ALLOWED_UPSTREAM_PATH_RE =
  /\/(chat\/completions|completions|models|embeddings|responses|messages|images\/generations|images\/edits|audio\/speech|count_tokens)$/i;

/** 禁止指向自家域名与本地/保留域，防止自环与探测内网。 */
const FORBIDDEN_HOST_RE =
  /(^|\.)(myraidrealms\.cc\.cd|pages\.dev|workers\.dev|cloudflarestorage\.com|localhost|localdomain|local|internal|in-addr\.arpa|ip6\.arpa)$/i;

/** 请求体上限：聊天请求正常几十 KB，2MB 已经宽松。 */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * 流式请求的「提前开管道」时限。
 *
 * 🔴 Cloudflare 边缘对「源站多久没给出响应头」有 100 秒硬限制，超出就直接回 524 错误页。
 * 中转载过去要先 await 上游拿到响应头才能返回，于是上游首字节慢于 100 秒时，
 * 玩家看到的是 CF 的 524，而不是任何真实原因。这里 80 秒还没拿到响应头，
 * 就先返回 200 + 空 SSE 管道把连接占住，再在管道里等上游 —— 玩家至少能看到流式输出。
 */
const EARLY_STREAM_DEADLINE_MS = 80_000;

/** 鉴权头透传白名单：不同厂商用的头不一样，漏传会让中转变 401。 */
const FORWARDED_AUTH_HEADERS = ['authorization', 'api-key', 'x-api-key', 'x-goog-api-key'];

/** 少数上游要求透传的请求头。 */
const FORWARDED_PASSTHROUGH_HEADERS = ['accept', 'content-type'];

type RelayContext = {
  request: Request;
  waitUntil: (promise: Promise<unknown>) => void;
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, api-key, x-api-key, x-goog-api-key, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function isPrivateIpv4Literal(host: string): boolean {
  // 🔴 先确认整个主机名就是纯数字 IPv4 字面量。少了这一步，`integrate.api.nvidia.com`
  // 这种普通域名也会被 split 成 4 段、非数字段判成「非法形式」而被误拒。
  if (!/^\d+(\.\d+){3}$/.test(host)) return false;
  const parts = host.split('.');
  const numbers = parts.map(part => Number(part));
  if (numbers.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = numbers;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6Literal(host: string): boolean {
  const value = host.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (!value.includes(':')) return false;
  if (value === '::' || value === '::1') return true;
  const firstGroup = value.split(':')[0];
  const head = Number.parseInt(firstGroup || '0', 16);
  if (!Number.isInteger(head)) return true;
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10
  return false;
}

/** 校验上游地址；通过返回 URL，不通过返回错误文案。 */
function resolveUpstreamTarget(rawTarget: string | null): { url: URL } | { error: string } {
  if (!rawTarget) {
    return { error: '缺少 target 参数' };
  }

  let upstream: URL;
  try {
    upstream = new URL(rawTarget);
  } catch {
    return { error: 'target 不是合法地址' };
  }

  if (upstream.protocol !== 'http:' && upstream.protocol !== 'https:') {
    return { error: '只支持 http/https 地址' };
  }

  const port = upstream.port;
  if (upstream.protocol === 'http:' && port && port !== '80') {
    return { error: 'http 地址只允许 80 端口' };
  }
  if (upstream.protocol === 'https:' && port && port !== '443') {
    return { error: 'https 地址只允许 443 端口' };
  }

  const hostname = upstream.hostname.toLowerCase();
  if (!hostname) {
    return { error: 'target 缺少主机名' };
  }
  if (FORBIDDEN_HOST_RE.test(hostname)) {
    return { error: '不允许中转该主机' };
  }
  if (isPrivateIpv4Literal(hostname) || isPrivateIpv6Literal(hostname)) {
    return { error: '不允许中转内网地址' };
  }

  if (!ALLOWED_UPSTREAM_PATH_RE.test(upstream.pathname)) {
    return { error: '不允许中转该接口路径' };
  }

  return { url: upstream };
}

function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_PASSTHROUGH_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const name of FORWARDED_AUTH_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

/** 判断是不是流式请求：看 Accept，或请求体里 stream 为 true。 */
function isStreamingRequest(request: Request, bodyText: string | null): boolean {
  const accept = request.headers.get('Accept') ?? '';
  if (accept.includes('text/event-stream')) return true;
  if (bodyText && bodyText.length <= 262144 && /"stream"\s*:\s*true/i.test(bodyText)) return true;
  return false;
}

function sseErrorFrame(message: string): string {
  return `data: ${JSON.stringify({ error: { message } })}\n\ndata: [DONE]\n\n`;
}

/** 透传上游响应：只保留 Content-Type，强制不缓存，直接透传流以保住 SSE 逐块转发。 */
function passThrough(upstream: Response, extraHeaders: Record<string, string> = {}): Response {
  const headers = new Headers(corsHeaders());
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-NW-Relay', '1');
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
  const bodyless = upstream.status === 204 || upstream.status === 205 || upstream.status === 304;
  return new Response(bodyless ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

/**
 * 上游迟迟不给响应头时，先把 SSE 管道打开返回给玩家，再在管道里等上游。
 *
 * 🔴 Workers 不会自动为「事件处理器已返回」的异步任务续命，必须显式交给 `waitUntil` 托管，
 * 否则上游刚连上就被回收，管道以空流关闭，玩家依旧看不到内容。
 */
function earlyStreamResponse(
  upstreamPromise: Promise<Response>,
  waitUntil: (promise: Promise<unknown>) => void,
): Response {
  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();

  waitUntil(
    (async () => {
      const writer = writable.getWriter();
      try {
        const upstream = await upstreamPromise;
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => '');
          await writer.write(
            encoder.encode(sseErrorFrame(`上游返回 ${upstream.status}${detail ? ` - ${detail.slice(0, 500)}` : ''}`)),
          );
          await writer.close();
          return;
        }
        await upstream.body.pipeTo(writable);
      } catch (error) {
        try {
          await writer.write(encoder.encode(sseErrorFrame(error instanceof Error ? error.message : String(error))));
          await writer.close();
        } catch {
          // 玩家已经断开，管道写不进去属正常。
        }
      }
    })(),
  );

  return new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-NW-Relay': '1',
      'X-NW-Relay-Early': '1',
    },
  });
}

async function handleRelay(context: RelayContext): Promise<Response> {
  const request = context.request;
  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonError('只支持 GET / POST', 405);
  }

  const resolved = resolveUpstreamTarget(new URL(request.url).searchParams.get('target'));
  if ('error' in resolved) {
    return jsonError(resolved.error, 400);
  }

  let rawBody: ArrayBuffer | null = null;
  let bodyText: string | null = null;
  if (request.method === 'POST') {
    rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > MAX_BODY_BYTES) {
      return jsonError('请求体过大', 413);
    }
    bodyText = new TextDecoder().decode(rawBody);
  }

  const streaming = isStreamingRequest(request, bodyText);
  const upstreamPromise = fetch(resolved.url.toString(), {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body: rawBody && rawBody.byteLength > 0 ? rawBody : undefined,
    // Workers 的 fetch 不支持 redirect: 'error'，只能手动拒绝跳转，
    // 否则上游可以用 302 把请求引到校验之外的地址。
    redirect: 'manual',
  });

  if (!streaming) {
    try {
      const upstream = await upstreamPromise;
      if (upstream.status >= 300 && upstream.status < 400) {
        return jsonError('上游返回了跳转，已拒绝', 502);
      }
      return passThrough(upstream);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 502);
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => resolve('timeout'), EARLY_STREAM_DEADLINE_MS);
  });

  const raced = await Promise.race([
    upstreamPromise.then(upstream => ({ upstream }) as const).catch(error => ({ error }) as const),
    deadline,
  ]);

  if (timer !== null) {
    clearTimeout(timer);
  }

  if (raced === 'timeout') {
    return earlyStreamResponse(upstreamPromise, context.waitUntil);
  }

  if ('error' in raced) {
    return jsonError(raced.error instanceof Error ? raced.error.message : String(raced.error), 502);
  }

  if (raced.upstream.status >= 300 && raced.upstream.status < 400) {
    return jsonError('上游返回了跳转，已拒绝', 502);
  }

  return passThrough(raced.upstream);
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

export const onRequestGet = async (context: RelayContext): Promise<Response> => handleRelay(context);

export const onRequestPost = async (context: RelayContext): Promise<Response> => handleRelay(context);
