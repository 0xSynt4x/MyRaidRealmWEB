/**
 * 1980s 预设独立包入口
 */

import { PRESETS } from '../src/presets';

declare global {
  interface Window {
    __TH1980S_PRESETS__?: typeof PRESETS;
  }
}

window.__TH1980S_PRESETS__ = PRESETS;
console.info(`[1980s-presets] 已注入预设包, 数量: ${PRESETS.length}`);

export {};
