import type { PresetConfig } from '../presets/types';

declare global {
  interface Window {
    __TH1980S_PRESETS__?: PresetConfig[];
  }
}

let loadingPromise: Promise<PresetConfig[]> | null = null;
const LOCAL_DIST_PRESET_RELATIVE_URL = '../preset-package/index.js';
const LOCALHOST_DIST_PRESET_URL = 'http://127.0.0.1:5500/dist/1980s/preset-package/index.js';
const FIXED_VERSION_PRESET_URL =
  'https://fastly.jsdelivr.net/gh/0xSynt4x/Myriad-Realms-Simulator@main/Release/Presets/index.js';

function resolveStandalonePresetBundleUrl() {
  try {
    return new URL(LOCAL_DIST_PRESET_RELATIVE_URL, window.location.href).href;
  } catch (error) {
    console.warn('[1980s-presets] 解析本地预设包地址失败:', error);
    return null;
  }
}

function getBundleUrlCandidates() {
  const standaloneLocalUrl = resolveStandalonePresetBundleUrl();

  return [standaloneLocalUrl, LOCALHOST_DIST_PRESET_URL, FIXED_VERSION_PRESET_URL].filter(
    (candidate): candidate is string => Boolean(candidate),
  );
}

export async function loadPresetsBundle(forceReload = false): Promise<PresetConfig[]> {
  if (!forceReload && Array.isArray(window.__TH1980S_PRESETS__) && window.__TH1980S_PRESETS__.length > 0) {
    return window.__TH1980S_PRESETS__;
  }

  if (!forceReload && loadingPromise) {
    return loadingPromise;
  }

  if (forceReload) {
    loadingPromise = null;
    window.__TH1980S_PRESETS__ = undefined;
  }

  loadingPromise = new Promise<PresetConfig[]>((resolve, reject) => {
    const candidates = getBundleUrlCandidates();
    const failedAttempts: string[] = [];
    let idx = 0;

    if (candidates.length === 0) {
      reject(new Error(`[1980s-presets] 未生成任何候选地址。location=${window.location.href}`));
      return;
    }

    console.info('[1980s-presets] 预设包候选地址:', candidates);

    const tryLoad = () => {
      if (idx >= candidates.length) {
        reject(
          new Error(
            `[1980s-presets] 预设包加载失败。location=${window.location.href}；候选=${candidates.join(' | ')}；失败链=${failedAttempts.join(' -> ') || '无'}`,
          ),
        );
        return;
      }

      const currentIndex = idx + 1;
      const total = candidates.length;
      const bundleUrl = candidates[idx++];
      const requestUrl = forceReload ? `${bundleUrl}${bundleUrl.includes('?') ? '&' : '?'}ts=${Date.now()}` : bundleUrl;
      const existed = document.querySelector<HTMLScriptElement>(`script[data-th-presets="${bundleUrl}"]`);

      console.info(`[1980s-presets] [${currentIndex}/${total}] 开始尝试: ${bundleUrl}`);
      console.info(`[1980s-presets] [${currentIndex}/${total}] 请求地址: ${requestUrl}`);

      if (existed) {
        existed.remove();
        console.info(`[1980s-presets] [${currentIndex}/${total}] 已移除旧脚本标签: ${bundleUrl}`);
      }

      const script = document.createElement('script');
      script.src = requestUrl;
      script.async = true;
      script.dataset.thPresets = bundleUrl;

      script.onload = () => {
        if (Array.isArray(window.__TH1980S_PRESETS__)) {
          console.info(
            `[1980s-presets] [${currentIndex}/${total}] 加载成功: ${bundleUrl}，数量: ${window.__TH1980S_PRESETS__.length}`,
          );
          resolve(window.__TH1980S_PRESETS__);
          return;
        }

        const reason = `${bundleUrl} (脚本已加载但未注入 __TH1980S_PRESETS__)`;
        failedAttempts.push(reason);
        console.warn(`[1980s-presets] [${currentIndex}/${total}] 加载失败: ${reason}`);
        tryLoad();
      };

      script.onerror = event => {
        const reason = `${bundleUrl} (网络或脚本错误)`;
        failedAttempts.push(reason);
        console.error(`[1980s-presets] [${currentIndex}/${total}] 加载失败: ${reason}`, event);
        tryLoad();
      };

      document.head.appendChild(script);
    };

    tryLoad();
  }).catch(error => {
    console.error('[1980s-presets] 所有候选加载均失败:', error);
    loadingPromise = null;
    throw error;
  });

  return loadingPromise.finally(() => {
    loadingPromise = null;
  });
}

export function getPresets(): PresetConfig[] {
  return window.__TH1980S_PRESETS__ ?? [];
}
