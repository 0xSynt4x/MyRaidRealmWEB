/**
 * 本地 ComfyUI 生图的「画风预置」。
 *
 * 出图时按「画风 + AI 写的场景」拼成正向提示词：
 * 画风（画质/渲染/风格）由这里固定，AI 只负责写画面内容，
 * 这样主 AI 不用每次重复输出那一长串质量词，省 token 也更稳定。
 */

export interface ComfyUiStylePreset {
  id: string;
  /** i18n 键，用于下拉里显示的名字 */
  labelKey: string;
  /** 实际拼进提示词的英文内容 */
  prompt: string;
}

/** 不使用任何画风预置，正向提示词就是 AI 写的那段 */
export const NO_STYLE_PRESET_ID = 'none';

/** 玩家自己手写的画风 */
export const CUSTOM_STYLE_PRESET_ID = 'custom';

export const COMFYUI_STYLE_PRESETS: ComfyUiStylePreset[] = [
  {
    id: 'retro-anime',
    labelKey: 'settings.comfyui.stylePreset.retroAnime',
    prompt:
      '1980s retro anime cel animation, hand-painted cel shading, visible film grain, soft bloom, muted warm palette, slight VHS color bleed, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'film-photo',
    labelKey: 'settings.comfyui.stylePreset.filmPhoto',
    prompt:
      '1980s color film photograph, Kodak Portra grain, natural window light, shallow depth of field, cinematic still, slightly faded tones, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'watercolor',
    labelKey: 'settings.comfyui.stylePreset.watercolor',
    prompt:
      '1980s watercolor illustration, soft ink linework, visible paper texture, gentle color washes, limited vintage palette, masterpiece, best quality, ultra-detailed',
  },
];

export function findStylePreset(presetId: string): ComfyUiStylePreset | undefined {
  return COMFYUI_STYLE_PRESETS.find(preset => preset.id === presetId);
}

/** 取某个预置的提示词文本；自定义/不用时返回空串 */
export function getStylePresetPrompt(presetId: string): string {
  return findStylePreset(presetId)?.prompt ?? '';
}

/**
 * 拼出真正提交给 ComfyUI 的正向提示词：画风在前，AI 写的场景在后。
 * 两边都为空时返回空串（交给调用方决定怎么处理）。
 */
export function composeComfyUiPrompt(stylePrompt: string, scenePrompt: string): string {
  const style = stylePrompt.trim().replace(/,\s*$/, '');
  const scene = scenePrompt.trim().replace(/^,\s*/, '');
  if (!style) return scene;
  if (!scene) return style;
  return `${style}, ${scene}`;
}
