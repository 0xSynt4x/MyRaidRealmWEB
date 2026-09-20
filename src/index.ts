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

function bootstrapApplication() {
  const messageId = getSafeCurrentMessageId();
  const iframeId = window.frameElement?.id ?? 'no-frame-id';
  const bootAt = performance.now();

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
  document.addEventListener('DOMContentLoaded', bootstrapApplication, { once: true });
} else {
  bootstrapApplication();
}
