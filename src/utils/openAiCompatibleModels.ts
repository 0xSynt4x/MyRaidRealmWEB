import { normalizeStandaloneOpenAiModelsApiUrl, normalizeStandaloneOpenAiApiUrl } from '../stores/settings';
import { buildCorsRelayUrl, isLocalOrPrivateApiUrl, isSuspectedBrowserCorsFailure } from '../../runtime/corsRelay';

type ModelApiInput = {
  apiurl: string;
  key?: string;
};

type ModelFetchOptions = {
  /** 直连被跨域拦掉时是否改走本站同域中转；缺省 false */
  corsRelayEnabled?: boolean;
};

function extractModelIds(data: any): string[] {
  return Array.isArray(data?.data) ? data.data.map((model: any) => model?.id).filter(Boolean) : [];
}

async function fetchModelsViaSillyTavernBackend(api: ModelApiInput): Promise<string[] | null> {
  const getRequestHeaders = (globalThis as any).SillyTavern?.getRequestHeaders;
  if (typeof getRequestHeaders !== 'function') {
    return null;
  }

  const customHeaders = api.key ? `Authorization: Bearer ${api.key}` : '';
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

async function fetchModelsDirectly(api: ModelApiInput, options?: ModelFetchOptions): Promise<string[]> {
  const headers = api.key ? { Authorization: `Bearer ${api.key}` } : undefined;
  const modelsUrl = normalizeStandaloneOpenAiModelsApiUrl(api.apiurl);

  const sendRequest = (url: string) => fetch(url, { headers });

  let response: Response;
  try {
    response = await sendRequest(modelsUrl);
  } catch (directError) {
    // 与发正文那一路同一套判据：只有「直连根本没发出去」才改走中转，HTTP 4xx/5xx 不重试。
    if (
      !options?.corsRelayEnabled ||
      isLocalOrPrivateApiUrl(api.apiurl) ||
      !isSuspectedBrowserCorsFailure(directError)
    ) {
      throw directError;
    }
    const relayUrl = buildCorsRelayUrl(modelsUrl, globalThis.location?.origin);
    response = await sendRequest(relayUrl);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return extractModelIds(await response.json());
}

export async function fetchOpenAiCompatibleModelIds(
  api: ModelApiInput,
  options?: ModelFetchOptions,
): Promise<string[]> {
  try {
    const backendModels = await fetchModelsViaSillyTavernBackend(api);
    if (backendModels) {
      return backendModels;
    }
  } catch {
    // Fall back to direct browser fetch for standalone/local preview usage.
  }

  return fetchModelsDirectly(api, options);
}
