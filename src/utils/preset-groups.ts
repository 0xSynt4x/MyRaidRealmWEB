import type { PresetConfig } from '../presets/types';

const WORKSHOP_PRESET_IDS = new Set([
  'custom-1771156504414',
  'global-survival-archipelago',
  'hikaru-no-go-2003-league',
  'iron-dome-silicon-prison',
  'ming-dynasty-wanli-reborn',
  'overlord-lord-preset',
  'parasite-china-2000',
  'parasite-lord-ero',
  'post-pandemic-remnants',
  'reality-marker-chongqing',
  'spartacus-gladiator-school-v2',
  'survival-trial-space',
  'tokyo-av-mom-guidance',
  'wh40k-cadia-fall-guard',
  'wh40k-ultramarine-primaris',
  'ww2-spirit-evolution',
  'xianxia-harem-transmigration',
  'yinluan-richkid-start',
  'yiren-zhixia',
  'yuan-ying-return-earth',
  'yuanmo-to-modern',
]);

export function isWorkshopPreset(preset: PresetConfig): boolean {
  return WORKSHOP_PRESET_IDS.has(preset.id);
}

export function getBuiltInPresets(presets: PresetConfig[]): PresetConfig[] {
  return presets.filter(preset => !isWorkshopPreset(preset));
}

export function getWorkshopPresets(presets: PresetConfig[]): PresetConfig[] {
  return presets.filter(isWorkshopPreset);
}
