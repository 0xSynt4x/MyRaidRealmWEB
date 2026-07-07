const GOOGLE_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_CHAT_COMPLETIONS_SUFFIX = '/chat/completions';

export function normalizeOpenAiCompatibleApiUrl(rawUrl: string | undefined): string {
  const trimmed = rawUrl?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

  if (withoutTrailingSlash === GOOGLE_MODELS_ENDPOINT) {
    return '';
  }

  if (withoutTrailingSlash.endsWith(OPENAI_CHAT_COMPLETIONS_SUFFIX)) {
    return withoutTrailingSlash.slice(0, -OPENAI_CHAT_COMPLETIONS_SUFFIX.length);
  }

  if (withoutTrailingSlash.endsWith('/models')) {
    return withoutTrailingSlash.slice(0, -'/models'.length);
  }

  return withoutTrailingSlash;
}

export function normalizeOpenAiCompatibleChatCompletionsApiUrl(rawUrl: string | undefined): string {
  const baseUrl = normalizeOpenAiCompatibleApiUrl(rawUrl);
  return baseUrl ? `${baseUrl}${OPENAI_CHAT_COMPLETIONS_SUFFIX}` : '';
}

export function normalizeOpenAiCompatibleModelsApiUrl(rawUrl: string | undefined): string {
  const baseUrl = normalizeOpenAiCompatibleApiUrl(rawUrl);
  return baseUrl ? `${baseUrl}/models` : '';
}
