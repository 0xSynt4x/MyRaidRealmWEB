import { computed, type Ref } from 'vue';
import { tCurrent } from '../i18n';
import { normalizeStandaloneOpenAiApiUrl, type ApiConfig } from '../stores/settings';
import { fetchOpenAiCompatibleModelIds } from '../utils/openAiCompatibleModels';
import { normalizeRemoteApiErrorMessage } from '../utils/remoteApiError';

interface FetchResult {
  success: boolean;
  message: string;
  models?: string[];
}

interface ValidateResult {
  valid: boolean;
  message: string;
}

export function useSingleApiEditor(apiRef: Ref<ApiConfig>) {
  const api = apiRef;

  function normalizeApiUrlInPlace() {
    api.value.apiurl = normalizeStandaloneOpenAiApiUrl(api.value.apiurl);
  }

  const isConfigured = computed(() => Boolean(api.value.apiurl || api.value.key || api.value.model));

  function handleSourceChange() {
    api.value.apiurl = '';

    api.value.availableModels = [];
    api.value.model = '';
    api.value.saved = false;
    api.value.collapsed = false;
  }

  function validateApi(): ValidateResult {
    if (!api.value.apiurl) {
      return { valid: false, message: tCurrent('assistantApi.validation.apiUrlRequired') };
    }

    if (!api.value.model) {
      return { valid: false, message: tCurrent('assistantApi.validation.modelRequired') };
    }

    return { valid: true, message: tCurrent('assistantApi.validation.valid') };
  }

  async function fetchAvailableModels(): Promise<FetchResult> {
    if (!api.value.apiurl) {
      return { success: false, message: tCurrent('assistantApi.fetch.fillApiUrlFirst') };
    }

    normalizeApiUrlInPlace();

    try {
      const models = await fetchOpenAiCompatibleModelIds(api.value);

      if (models.length === 0) {
        throw new Error(tCurrent('assistantApi.fetch.noModelsFound'));
      }

      api.value.availableModels = models;
      return {
        success: true,
        message: tCurrent('assistantApi.fetch.success', { count: models.length }),
        models,
      };
    } catch (error) {
      return {
        success: false,
        message: tCurrent('assistantApi.fetch.failed', {
          error: normalizeRemoteApiErrorMessage(error),
        }),
      };
    }
  }

  function markApiSaved(): ValidateResult {
    normalizeApiUrlInPlace();

    const result = validateApi();
    if (!result.valid) {
      return result;
    }

    api.value.saved = true;
    return { valid: true, message: tCurrent('assistantApi.save.saved') };
  }

  return {
    api,
    isConfigured,
    handleSourceChange,
    validateApi,
    fetchAvailableModels,
    markApiSaved,
  };
}
