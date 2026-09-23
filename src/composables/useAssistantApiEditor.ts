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

function createAssistantApiId() {
  return `assistant-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyApi(): ApiConfig {
  return {
    id: createAssistantApiId(),
    apiurl: '',
    key: '',
    model: '',
    source: 'openai_compatible',
    availableModels: [],
    collapsed: false,
    saved: false,
    openCodeGoSession: false,
  };
}

export function useAssistantApiEditor(customApis: Ref<ApiConfig[]>) {
  const apis = customApis;

  function normalizeApiUrlInPlace(index: number) {
    const target = apis.value[index];
    if (!target) return;
    target.apiurl = normalizeStandaloneOpenAiApiUrl(target.apiurl);
  }

  const hasAnyApi = computed(() => apis.value.length > 0);

  function addApi() {
    apis.value.push(createEmptyApi());
  }

  function removeApi(index: number) {
    if (index < 0 || index >= apis.value.length) return;
    apis.value.splice(index, 1);
    if (apis.value.length === 0) {
      addApi();
    }
  }

  function moveUp(index: number) {
    if (index <= 0 || index >= apis.value.length) return false;
    const tmp = apis.value[index - 1];
    apis.value[index - 1] = apis.value[index];
    apis.value[index] = tmp;
    return true;
  }

  function moveDown(index: number) {
    if (index < 0 || index >= apis.value.length - 1) return false;
    const tmp = apis.value[index + 1];
    apis.value[index + 1] = apis.value[index];
    apis.value[index] = tmp;
    return true;
  }

  function toggleCollapse(index: number) {
    const target = apis.value[index];
    if (!target) return;
    target.collapsed = !target.collapsed;
  }

  function handleSourceChange(index: number) {
    const target = apis.value[index];
    if (!target) return;

    target.apiurl = '';

    target.availableModels = [];
    target.model = '';
    target.saved = false;
    target.collapsed = false;
  }

  function validateApi(api: ApiConfig): ValidateResult {
    if (!api.apiurl) {
      return { valid: false, message: tCurrent('assistantApi.validation.apiUrlRequired') };
    }

    if (!api.model) {
      return { valid: false, message: tCurrent('assistantApi.validation.modelRequired') };
    }

    return { valid: true, message: tCurrent('assistantApi.validation.valid') };
  }

  function validateAllApis(): ValidateResult {
    const configuredApis = apis.value.filter(api => api.apiurl || api.key || api.model);

    if (configuredApis.length === 0) {
      return { valid: false, message: tCurrent('assistantApi.validation.atLeastOne') };
    }

    for (let i = 0; i < configuredApis.length; i++) {
      const result = validateApi(configuredApis[i]);
      if (!result.valid) {
        return {
          valid: false,
          message: tCurrent('assistantApi.validation.cardIncomplete', {
            index: i + 1,
            message: result.message,
          }),
        };
      }
    }

    return { valid: true, message: tCurrent('assistantApi.validation.valid') };
  }

  async function fetchAvailableModels(index: number): Promise<FetchResult> {
    const target = apis.value[index];
    if (!target) {
      return { success: false, message: tCurrent('assistantApi.fetch.cardNotFound') };
    }

    if (!target.apiurl) {
      return { success: false, message: tCurrent('assistantApi.fetch.fillApiUrlFirst') };
    }

    normalizeApiUrlInPlace(index);

    try {
      const models = await fetchOpenAiCompatibleModelIds({
        apiurl: target.apiurl,
        key: target.key,
        openCodeGoSession: target.openCodeGoSession,
        sessionId: target.id,
      });

      if (models.length === 0) {
        throw new Error(tCurrent('assistantApi.fetch.noModelsFound'));
      }

      target.availableModels = models;
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

  function markApiSaved(index: number): ValidateResult {
    const target = apis.value[index];
    if (!target) {
      return { valid: false, message: tCurrent('assistantApi.save.cardNotFound') };
    }

    normalizeApiUrlInPlace(index);

    const result = validateApi(target);
    if (!result.valid) {
      return result;
    }

    target.saved = true;
    target.collapsed = true;

    return { valid: true, message: tCurrent('assistantApi.save.saved') };
  }

  function expandNextApi(index: number) {
    const next = apis.value[index + 1];
    if (!next) {
      return false;
    }

    next.collapsed = false;
    return true;
  }

  return {
    apis,
    hasAnyApi,
    addApi,
    removeApi,
    moveUp,
    moveDown,
    toggleCollapse,
    handleSourceChange,
    validateApi,
    validateAllApis,
    fetchAvailableModels,
    markApiSaved,
    expandNextApi,
  };
}
