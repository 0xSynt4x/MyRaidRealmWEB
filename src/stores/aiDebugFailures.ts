import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  clearStandaloneAiDebugFailures,
  loadStandaloneAiDebugFailures,
  type StandaloneAiDebugFailureRecord,
} from '../utils/standaloneAiDebugFailures';

/**
 * AI 调试页「失败的请求」列表。
 *
 * 只做一层响应式包装：真正的读写都在 `utils/standaloneAiDebugFailures` 的纯数据层里。
 * runtime 层写存储时**不经过这里**（它不碰 pinia），所以面板打开 / 切回本 tab 时要调
 * `refresh()` 重新读一次，否则看到的是上次打开时的旧列表。
 */
export const useAiDebugFailuresStore = defineStore('ai-debug-failures', () => {
  const failures = ref<StandaloneAiDebugFailureRecord[]>(loadStandaloneAiDebugFailures());

  function refresh() {
    failures.value = loadStandaloneAiDebugFailures();
  }

  function clear() {
    clearStandaloneAiDebugFailures();
    failures.value = [];
  }

  return { failures, refresh, clear };
});
