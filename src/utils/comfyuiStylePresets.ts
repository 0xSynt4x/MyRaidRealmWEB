/**
 * 本地 ComfyUI 生图的「画风预置」。
 *
 * 出图时按「画风 + AI 写的场景」拼成正向提示词：
 * 画风（画质/渲染/风格）由这里固定，AI 只负责写画面内容，
 * 这样主 AI 不用每次重复输出那一长串质量词，省 token 也更稳定。
 *
 * 🔴 预置文本里**不写年代**（1980s / retro / vintage 这类）。
 * 项目名叫 1980s，但那只是众多题材之一，年代属于「世界观内容」，
 * 该由 AI 按剧情写进场景，而不是每张图都被强制加一层复古滤镜。
 * 唯一例外是「复古赛璐璐动画」—— 复古就是它的卖点，它只是选项之一。
 */

/** 画风分组：下拉里用分组标题归类，免得十几套平铺成一长条 */
export type StylePresetGroupId = 'anime' | 'photo' | 'traditional' | 'special';

export interface StylePresetGroup {
  id: StylePresetGroupId;
  /** i18n 键，用于下拉里的分组标题 */
  labelKey: string;
}

export const STYLE_PRESET_GROUPS: StylePresetGroup[] = [
  { id: 'anime', labelKey: 'settings.comfyui.stylePresetGroup.anime' },
  { id: 'photo', labelKey: 'settings.comfyui.stylePresetGroup.photo' },
  { id: 'traditional', labelKey: 'settings.comfyui.stylePresetGroup.traditional' },
  { id: 'special', labelKey: 'settings.comfyui.stylePresetGroup.special' },
];

export interface ComfyUiStylePreset {
  id: string;
  /** i18n 键，用于下拉里显示的名字 */
  labelKey: string;
  /** 实际拼进提示词的英文内容 */
  prompt: string;
  /** 下拉里归到哪一组 */
  group: StylePresetGroupId;
}

/** 不使用任何画风预置，正向提示词就是 AI 写的那段 */
export const NO_STYLE_PRESET_ID = 'none';

/** 玩家自己手写的画风 */
export const CUSTOM_STYLE_PRESET_ID = 'custom';

export const COMFYUI_STYLE_PRESETS: ComfyUiStylePreset[] = [
  // ─────────────── 动漫 / 插画 ───────────────
  {
    id: 'retro-anime',
    labelKey: 'settings.comfyui.stylePreset.retroAnime',
    group: 'anime',
    prompt:
      '1980s retro anime cel animation, hand-painted cel shading, visible film grain, soft bloom, muted warm palette, slight VHS color bleed, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'anime-cel',
    labelKey: 'settings.comfyui.stylePreset.animeCel',
    group: 'anime',
    prompt:
      'modern anime cel animation, clean line art, vibrant flat colors, crisp cel shading, detailed background, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'illustration',
    labelKey: 'settings.comfyui.stylePreset.illustration',
    group: 'anime',
    prompt:
      'digital illustration, painterly rendering, soft blended shading, rich color harmony, detailed brushwork, masterpiece, best quality, ultra-detailed',
  },

  // ─────────────── 写实 / 摄影 ───────────────
  {
    id: 'realistic',
    labelKey: 'settings.comfyui.stylePreset.realistic',
    group: 'photo',
    prompt:
      'photorealistic photograph, cinematic lighting, 50mm lens, shallow depth of field, natural skin texture, high dynamic range, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'film-photo',
    labelKey: 'settings.comfyui.stylePreset.filmPhoto',
    group: 'photo',
    prompt:
      'color film photograph, Kodak Portra grain, natural window light, shallow depth of field, cinematic still, slightly faded tones, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'monochrome',
    labelKey: 'settings.comfyui.stylePreset.monochrome',
    group: 'photo',
    prompt:
      'black and white photograph, high contrast, fine film grain, dramatic side lighting, monochrome, masterpiece, best quality, ultra-detailed',
  },

  // ─────────────── 传统媒介 ───────────────
  {
    id: 'watercolor',
    labelKey: 'settings.comfyui.stylePreset.watercolor',
    group: 'traditional',
    prompt:
      'watercolor illustration, soft ink linework, visible paper texture, gentle color washes, translucent washes, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'ink',
    labelKey: 'settings.comfyui.stylePreset.ink',
    group: 'traditional',
    prompt:
      'traditional chinese ink painting, sumi-e brush strokes, ink wash gradients, rice paper texture, minimal negative space, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'oil',
    labelKey: 'settings.comfyui.stylePreset.oil',
    group: 'traditional',
    prompt:
      'classical oil painting, thick impasto brushwork, rich warm pigments, canvas texture, chiaroscuro lighting, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'sketch',
    labelKey: 'settings.comfyui.stylePreset.sketch',
    group: 'traditional',
    prompt:
      'pencil sketch, graphite shading, cross-hatching, rough paper texture, monochrome linework, masterpiece, best quality, ultra-detailed',
  },

  // ─────────────── 特殊风格 ───────────────
  {
    id: 'render-3d',
    labelKey: 'settings.comfyui.stylePreset.render3d',
    group: 'special',
    prompt:
      '3d rendered cg, physically based rendering, subsurface scattering, soft studio lighting, octane render, masterpiece, best quality, ultra-detailed',
  },
  {
    id: 'cyberpunk',
    labelKey: 'settings.comfyui.stylePreset.cyberpunk',
    group: 'special',
    prompt:
      'cyberpunk aesthetic, neon signage glow, rain-slicked streets, holographic reflections, high contrast teal and magenta, masterpiece, best quality, ultra-detailed',
  },
];

/**
 * 按分组把预置切开，供下拉用分组标题渲染。
 * 顺序与 STYLE_PRESET_GROUPS 一致；空组直接不返回，免得下拉里出现空标题。
 */
export function groupStylePresets<T extends ComfyUiStylePreset>(
  presets: readonly T[],
): Array<StylePresetGroup & { presets: T[] }> {
  return STYLE_PRESET_GROUPS.map(group => ({
    ...group,
    presets: presets.filter(preset => preset.group === group.id),
  })).filter(group => group.presets.length > 0);
}

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
