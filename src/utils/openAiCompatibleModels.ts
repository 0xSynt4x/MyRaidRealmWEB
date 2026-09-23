import { normalizeStandaloneOpenAiModelsApiUrl, normalizeStandaloneOpenAiApiUrl } from '../stores/settings';

type ModelApiInput = {
  apiurl: string;
  key?: string;
  /** 是否随请求发送 OpenCode Go 会话标识请求头 */
  openCodeGoSession?: boolean;
  /** 会话标识值；同一会话保持稳定 */
  sessionId?: string;
};

function extractModelIds(data: any): string[] {
  return Array.isArray(data?.data) ? data.data.map((model: any) => model?.id).filter(Boolean) : [];
}

/** 拉模型列表与生成回复要保持同一套请求头，避免「能生成但取不到模型」 */
function buildModelRequestHeaders(api: ModelApiInput): Record<string, string> {
  const headers: Record<string, string> = {};
  if (api.key) {
    headers.Authorization = `Bearer ${api.key}`;
  }
  if (api.openCodeGoSession) {
    headers['x-opencode-session'] = api.sessionId || 'standalone-session';
  }
  return headers;
}

async function fetchModelsViaSillyTavernBackend(api: ModelApiInput): Promise<string[] | null> {
  const getRequestHeaders = (globalThis as any).SillyTavern?.getRequestHeaders;
  if (typeof getRequestHeaders !== 'function') {
    return null;
  }

  const customHeaders = Object.entries(buildModelRequestHeaders(api))
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');
  const response = await fetch('/api/backends/chat-completions/status', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      chat_completion_source: 'custom',
      custom_url: normalizeStandaloneOpenAiApiUrl(api.apiurl),
      custom_include_headers: customHeaders,
    }),
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return extractModelIds(await response.json());
}

async function fetchModelsDirectly(api: ModelApiInput): Promise<string[]> {
  const headers = buildModelRequestHeaders(api);
  const response = await fetch(normalizeStandaloneOpenAiModelsApiUrl(api.apiurl), {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return extractModelIds(await response.json());
}

export async function fetchOpenAiCompatibleModelIds(api: ModelApiInput): Promise<string[]> {
  try {
    const backendModels = await fetchModelsViaSillyTavernBackend(api);
    if (backendModels) {
      return backendModels;
    }
  } catch {
    // Fall back to direct browser fetch for standalone/local preview usage.
  }

  return fetchModelsDirectly(api);
}
