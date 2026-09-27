/**
 * 生图「画风预置」——按后端分组。
 *
 * 出图时按「画风 + AI 写的场景」拼成正向提示词：画风（画质/渲染/风格）由这里固定，
 * AI 只负责写画面内容，省 token 也更稳定。
 *
 * 🔴 两条后端各用各的一组，不能串：
 * - 本地 ComfyUI 吃自然语言长句
 * - NovelAI 吃 Danbooru 标签流
 * 同一份画风文本喂给另一条后端，出来的画风是错的。
 *
 * 🔴 预置文本里**不写年代**：项目名叫 1980s，但那只是众多题材之一，
 * 年代属于「世界观内容」，交给 AI 按剧情写。唯一例外是「复古赛璐璐动画」——
 * 复古就是它的卖点，而且它只是十几个选项里的一个。
 */

import type { ImageBackend } from '../stores/settings';
import {
  COMFYUI_STYLE_PRESETS,
  composeComfyUiPrompt,
  type ComfyUiStylePreset,
} from './comfyuiStylePresets';

export type ImageStylePreset = ComfyUiStylePreset;

export { CUSTOM_STYLE_PRESET_ID, NO_STYLE_PRESET_ID, groupStylePresets } from './comfyuiStylePresets';

/**
 * NovelAI 版画风预置：标签流写法，与 ComfyUI 那组 id 一一对应。
 *
 * 🔴 这里**不写 `1980s (style)`**：年代标签属于「世界观内容」，交给 AI 按剧情写，
 * 画风预置只负责渲染方式与质量词。
 */
export const NOVELAI_STYLE_PRESETS: ImageStylePreset[] = [
  // ─────────────── 动漫 / 插画 ───────────────
  {
    id: 'retro-anime',
    labelKey: 'settings.comfyui.stylePreset.retroAnime',
    group: 'anime',
    prompt:
      'retro artstyle, cel shading, hand-painted, film grain, muted colors, vhs (style), masterpiece, best quality, very aesthetic, absurdres',
  },
  {
    id: 'anime-cel',
    labelKey: 'settings.comfyui.stylePreset.animeCel',
    group: 'anime',
    prompt:
      'anime, cel shading, clean lineart, vibrant colors, detailed background, masterpiece, best quality, very aesthetic, absurdres',
  },
  {
    id: 'illustration',
    labelKey: 'settings.comfyui.stylePreset.illustration',
    group: 'anime',
    prompt: 'digital painting, painterly, soft shading, detailed brushwork, masterpiece, best quality, very aesthetic, absurdres',
  },

  // ─────────────── 写实 / 摄影 ───────────────
  {
    id: 'realistic',
    labelKey: 'settings.comfyui.stylePreset.realistic',
    group: 'photo',
    prompt:
      'photo (medium), realistic, cinematic lighting, depth of field, detailed skin, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'film-photo',
    labelKey: 'settings.comfyui.stylePreset.filmPhoto',
    group: 'photo',
    prompt:
      'photo (medium), film grain, kodak portra, natural lighting, depth of field, faded colors, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'monochrome',
    labelKey: 'settings.comfyui.stylePreset.monochrome',
    group: 'photo',
    prompt: 'monochrome, greyscale, black and white, high contrast, film grain, masterpiece, best quality, very aesthetic',
  },

  // ─────────────── 传统媒介 ───────────────
  {
    id: 'watercolor',
    labelKey: 'settings.comfyui.stylePreset.watercolor',
    group: 'traditional',
    prompt:
      'watercolor (medium), traditional media, ink outline, paper texture, muted colors, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'ink',
    labelKey: 'settings.comfyui.stylePreset.ink',
    group: 'traditional',
    prompt:
      'traditional chinese painting, ink wash painting, sumi-e, monochrome, brush strokes, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'oil',
    labelKey: 'settings.comfyui.stylePreset.oil',
    group: 'traditional',
    prompt: 'oil painting (medium), impasto, classical painting, chiaroscuro, canvas texture, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'sketch',
    labelKey: 'settings.comfyui.stylePreset.sketch',
    group: 'traditional',
    prompt: 'sketch, pencil (medium), greyscale, cross-hatching, traditional media, masterpiece, best quality, very aesthetic',
  },

  // ─────────────── 特殊风格 ───────────────
  {
    id: 'render-3d',
    labelKey: 'settings.comfyui.stylePreset.render3d',
    group: 'special',
    prompt:
      '3d, cg, physically based rendering, subsurface scattering, studio lighting, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'cyberpunk',
    labelKey: 'settings.comfyui.stylePreset.cyberpunk',
    group: 'special',
    prompt: 'cyberpunk, neon lights, night, rain, city, glowing, chromatic aberration, masterpiece, best quality, very aesthetic',
  },
];

const STYLE_PRESETS_BY_BACKEND: Record<ImageBackend, ImageStylePreset[]> = {
  comfyui: COMFYUI_STYLE_PRESETS,
  novelai: NOVELAI_STYLE_PRESETS,
};

export function getImageStylePresets(backend: ImageBackend): ImageStylePreset[] {
  return STYLE_PRESETS_BY_BACKEND[backend] ?? COMFYUI_STYLE_PRESETS;
}

export function findImageStylePreset(backend: ImageBackend, presetId: string): ImageStylePreset | undefined {
  return getImageStylePresets(backend).find(preset => preset.id === presetId);
}

/** 取某个预置的提示词文本；自定义/不用时返回空串 */
export function getImageStylePresetPrompt(backend: ImageBackend, presetId: string): string {
  return findImageStylePreset(backend, presetId)?.prompt ?? '';
}

/**
 * 拼出真正提交给生图后端的正向提示词：画风在前，AI 写的场景在后。
 * 两条后端共用同一套拼接规则（都是「逗号分隔的一串」），只有预置文本本身不同。
 */
export const composeImageStylePrompt = composeComfyUiPrompt;
