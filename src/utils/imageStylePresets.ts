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
 */

import type { ImageBackend } from '../stores/settings';
import { COMFYUI_STYLE_PRESETS, composeComfyUiPrompt, type ComfyUiStylePreset } from './comfyuiStylePresets';

export type ImageStylePreset = ComfyUiStylePreset;

export { CUSTOM_STYLE_PRESET_ID, NO_STYLE_PRESET_ID } from './comfyuiStylePresets';

/**
 * NovelAI 版画风预置：标签流写法，对齐现有 1980s 主题（初稿，按实际出图效果再调）
 *
 * 🔴 这里**不写 `1980s (style)`**：年代标签属于「世界观内容」，交给 AI 按剧情写，
 * 画风预置只负责渲染方式与质量词。
 */
export const NOVELAI_STYLE_PRESETS: ImageStylePreset[] = [
  {
    id: 'retro-anime',
    labelKey: 'settings.comfyui.stylePreset.retroAnime',
    prompt:
      'retro artstyle, cel shading, hand-painted, film grain, muted colors, vhs (style), masterpiece, best quality, very aesthetic, absurdres',
  },
  {
    id: 'film-photo',
    labelKey: 'settings.comfyui.stylePreset.filmPhoto',
    prompt:
      'photo (medium), film grain, kodak portra, natural lighting, depth of field, faded colors, masterpiece, best quality, very aesthetic',
  },
  {
    id: 'watercolor',
    labelKey: 'settings.comfyui.stylePreset.watercolor',
    prompt:
      'watercolor (medium), traditional media, ink outline, paper texture, muted colors, masterpiece, best quality, very aesthetic',
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
