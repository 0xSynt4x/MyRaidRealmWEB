// 🔴 必须排在最前：给 standalone 装全局垫片（lodash 的裸 `_`）。
// 有模块可能在初始化阶段就用到 `_`，晚一步就炸。见文件内注释。
import './standalone-globals';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './global.css';
import { syncDocumentLocale } from './i18n';
import { useMessagesStore } from './stores/messages';
import { getHostModeLabel, getSafeCurrentMessageId } from './utils/hostEnvironment';
import { initializeStandaloneStorage, installStandaloneStorageBridge } from './utils/standaloneStorage';

const SETTINGS_STORAGE_KEY = 'tavern_helper_settings_诸界穿越模拟器_NW';

function loadInitialLocale() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored) as { locale?: unknown };
    if (parsed.locale === 'zh-CN' || parsed.locale === 'en') {
      syncDocumentLocale(parsed.locale);
    }
  } catch (error) {
    console.warn('[1980s-界面] 读取初始语言设置失败:', error);
  }
}

loadInitialLocale();

function mountApplication(messageId: number, iframeId: string, bootAt: number) {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  useMessagesStore(pinia).setupEventListeners();
  app.mount('#app');

  console.info('[1980s-界面] 应用已挂载', {
    mode: getHostModeLabel(),
    messageId,
    iframeId,
    elapsedMs: Math.round(performance.now() - bootAt),
  });
}

/**
 * 启动流程。
 *
 * 🔴 顺序不能变：**先把本地存储初始化完，再挂载应用。**
 *
 * 老用户的数据本来躺在 localStorage 里，这里一次性搬进 IndexedDB 并把小数据读进内存缓存；
 * 之后运行期的读写全部走缓存 + IndexedDB，localStorage 只剩设置类小数据。
 *
 * 初始化必须发生在任何 store 建立之前 —— 会话 id、消息楼层、统计变量都在存储层后面，
 * 晚一步就会读到空数据，表现为「存档打不开、聊天记录消失」。
 * 代价是首屏多等一次本地 IO（通常几十毫秒），换来的是整条调用链不必改成异步。
 *
 * 存储层自己保证不会抛错中断启动：IndexedDB 不可用时它会整体降级回 localStorage。
 */
async function bootstrapApplication() {
  const bootAt = performance.now();

  try {
    const report = await initializeStandaloneStorage();
    installStandaloneStorageBridge();
    console.info('[1980s-界面] 本地存储就绪', {
      mode: report.mode,
      migratedKeys: report.migratedKeys.length,
      failedKeys: report.failedKeys.length,
    });
  } catch (error) {
    // 存储层内部已经兜过底，走到这里说明是意料外的故障。
    // 仍然继续挂载：能用的功能先给用户用，总比白屏强。
    console.error('[1980s-界面] 本地存储初始化失败，将按空数据启动:', error);
  }

  const messageId = getSafeCurrentMessageId();
  const iframeId = window.frameElement?.id ?? 'no-frame-id';

  console.info('[1980s-界面] 入口执行', {
    mode: getHostModeLabel(),
    messageId,
    iframeId,
    readyState: document.readyState,
    hasAppRoot: Boolean(document.querySelector('#app')),
    elapsedMs: Math.round(performance.now() - bootAt),
  });

  mountApplication(messageId, iframeId, bootAt);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootstrapApplication(), { once: true });
} else {
  void bootstrapApplication();
}
