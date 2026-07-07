import type { PresetConfig } from '../types';
import { migrateLegacyPresetLocalContent } from '../../utils/legacyPresetCompat';
import { normalizeLocalContentEntriesInput } from '../../utils/standaloneLocalContent';
import haremtransmigration from './haremtransmigration.json?raw';
import robotWorldRaw from './robotWorld.json?raw';
import yirenzhixiaRaw from './一人之下.json?raw';
import mingDynastyRaw from './从0开始当万历.json?raw';
import returnearthRaw from './元婴修士回地球.json?raw';
import oceanEraRaw from './全民穿越海洋纪元.json?raw';
import wh40kcadiafallRaw from './卡地亚战争.json?raw';
import yuanmotomodernRaw from './古代长生.json?raw';
import parasiteRealityRaw from './寄生虫.json?raw';
import parasiteFantasyRaw from './寄生虫_幻想.json?raw';
import ultramarineprimarisRaw from './战锤40k：原铸极限战士.json?raw';
import spartacusgladiatorschoolRaw from './斯巴达克斯.json?raw';
import hikaru2003Raw from './棋魂.json?raw';
import endlessWorldRaw from './生存试炼空间.json?raw';
import ww2SpiritRaw from './穿越二战成为精神体.json?raw';
import crossingLate15thRaw from './穿越到15世纪末.json?raw';
import quarantineWorldRaw from './类全境封锁世界.json?raw';
import tokyoavmomRaw from './粉红帝国.json?raw';
import semenEconomyRaw from './精液=现金的低胸经济.json?raw';
import overlordLordRaw from './至尊领主：异界繁育狂潮.json?raw';
import realityMarkerRaw from './魔法記號筆工口改寫身邊女性.json?raw';
/**
 * 创意工坊玩家预设（手工维护）
 *
 * 约定：
 * 1. 所有玩家投稿预设统一放在 presets/ws 目录；
 * 2. 可在本文件直接维护，也可拆分子文件后在此汇总导出；
 * 3. 这些预设会被打进 Vxxx.presets.js（由脚本预设包入口显式引用）。
 */
function parseWorkshopPreset(raw: string): PresetConfig {
  const data = JSON.parse(raw) as {
    id: string;
    name: string;
    icon: string;
    category: string;
    tags: string[];
    description: string;
    config: PresetConfig['config'];
    localContentEntries?: PresetConfig['localContentEntries'];
    worldbookEntries?: string[];
    author?: PresetConfig['author'];
  };

  const migrationResult = migrateLegacyPresetLocalContent({
    localContentEntries: normalizeLocalContentEntriesInput(data.localContentEntries ?? []),
    worldbookEntries: data.worldbookEntries,
  });

  if (migrationResult.warnings.length > 0) {
    console.warn('[PresetWS] 老预设 worldbookEntries 未完全迁移为本地补充内容:', {
      presetId: data.id,
      presetName: data.name,
      warnings: migrationResult.warnings,
    });
  }

  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    category: data.category,
    tags: data.tags,
    description: data.description,
    config: data.config,
    localContentEntries: migrationResult.localContentEntries,
    legacyMigrationWarnings: migrationResult.warnings,
    author: data.author,
  };
}

export const wsPresets: PresetConfig[] = [
  parseWorkshopPreset(overlordLordRaw),
  parseWorkshopPreset(spartacusgladiatorschoolRaw),
  parseWorkshopPreset(tokyoavmomRaw),
  parseWorkshopPreset(hikaru2003Raw),
  parseWorkshopPreset(ultramarineprimarisRaw),
  parseWorkshopPreset(haremtransmigration),
  parseWorkshopPreset(wh40kcadiafallRaw),
  parseWorkshopPreset(yuanmotomodernRaw),
  parseWorkshopPreset(yirenzhixiaRaw),
  parseWorkshopPreset(returnearthRaw),
  parseWorkshopPreset(mingDynastyRaw),
  parseWorkshopPreset(crossingLate15thRaw),
  parseWorkshopPreset(ww2SpiritRaw),
  parseWorkshopPreset(oceanEraRaw),
  parseWorkshopPreset(parasiteRealityRaw),
  parseWorkshopPreset(parasiteFantasyRaw),
  parseWorkshopPreset(robotWorldRaw),
  parseWorkshopPreset(quarantineWorldRaw),
  parseWorkshopPreset(endlessWorldRaw),
  parseWorkshopPreset(semenEconomyRaw),
  parseWorkshopPreset(realityMarkerRaw),
];
