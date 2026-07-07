import { normalizeStandaloneOpenAiModelsApiUrl, normalizeStandaloneOpenAiApiUrl } from '../stores/settings';

type ModelApiInput = {
  apiurl: string;
  key?: string;
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

async function fetchModelsDirectly(api: ModelApiInput): Promise<string[]> {
  const headers = api.key ? { Authorization: `Bearer ${api.key}` } : undefined;
  const response = await fetch(normalizeStandaloneOpenAiModelsApiUrl(api.apiurl), {
    headers,
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
