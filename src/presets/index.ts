// 类型定义
export type { PresetConfig } from './types';

// 各分类预设
import { apocalypsePresets } from './apocalypse';
import { azurLanePresets } from './azurlane';
import { capuaBloodSandPresets } from './capua-blood-sand';
import { china1990sFamilyPresets } from './china-1990s-family';
import { cultivationPresets } from './cultivation';
import { demonLordDungeonPresets } from './eramaou';
import { eartholPresets } from './earth-online-2024';
import { falloutPresets } from './fallout';
import { fantasyPresets } from './fantasy';
import { gameOfThronesPresets } from './gameofthrones';
import { gaokaoSimulatorPresets } from './gaokao-simulator';
import { grandWarDynastyPresets } from './grand-war-dynasty';
import { historicalPresets } from './historical';
import { infiniteTerrorPresets } from './infinite-terror';
import { marsHumanoidCohabPresets } from './mars-humanoid-cohab';
import { marvelPresets } from './marvel';
import { narutoPresets } from './naruto';
import { realityPresets } from './reality';
import { unusualCreaturesPresets } from './record-of-unusual-creatures';
import { reformEra1980sPresets } from './reform-era-1980s';
import { scifiPresets } from './scifi';
import { scpPresets } from './scp';
import { songDynastySpiritualTestingPresets } from './song-dynasty-spiritual-testing';
import { specialPresets } from './special';
import { spiritGirlPresets } from './spirit-girl';
import { tesVSkyrimPresets } from './tes-v-skyrim';
import { timeLoopPresets } from './time-loop';
import { touhouGensokyoPresets } from './touhou-gensokyo';
import { wanjieEroticShopPresets } from './wanjie-erotic-shop';
import { wsPresets } from './ws';
import { xianjiePresets } from './xianjie-zayi-farmer';
import { xiaoaoJianghuPresets } from './xiaoao-jianghu';
import { attachRegisteredWorldbooksToBuiltInPresets } from '../assets/worldbook-registry';
import { starAspirationsPresets } from './star-aspirations';
import { applyPresetI18n } from './i18n';

// 汇总所有预设
export const PRESETS = attachRegisteredWorldbooksToBuiltInPresets(
  applyPresetI18n([
    ...starAspirationsPresets,
    ...demonLordDungeonPresets,
    ...songDynastySpiritualTestingPresets,
    ...reformEra1980sPresets,
    ...capuaBloodSandPresets,
    ...marsHumanoidCohabPresets,
    ...wanjieEroticShopPresets,
    ...timeLoopPresets,
    ...gaokaoSimulatorPresets,
    ...china1990sFamilyPresets,
    ...spiritGirlPresets,
    ...touhouGensokyoPresets,
    ...xiaoaoJianghuPresets,
    ...grandWarDynastyPresets,
    ...tesVSkyrimPresets,
    ...falloutPresets,
    ...narutoPresets,
    ...marvelPresets,
    ...gameOfThronesPresets,
    ...scpPresets,
    ...apocalypsePresets,
    ...azurLanePresets,
    ...xianjiePresets,
    ...eartholPresets,
    ...unusualCreaturesPresets,
    ...realityPresets,
    ...fantasyPresets,
    ...cultivationPresets,
    ...scifiPresets,
    ...specialPresets,
    ...historicalPresets,
    ...wsPresets,
  ]),
);

// 也导出各分类预设，便于按需使用
export {
  demonLordDungeonPresets,
  apocalypsePresets,
  china1990sFamilyPresets,
  cultivationPresets,
  eartholPresets,
  falloutPresets,
  fantasyPresets,
  gameOfThronesPresets,
  gaokaoSimulatorPresets,
  grandWarDynastyPresets,
  historicalPresets,
  infiniteTerrorPresets,
  marvelPresets,
  narutoPresets,
  realityPresets,
  reformEra1980sPresets,
  scifiPresets,
  scpPresets,
  specialPresets,
  spiritGirlPresets,
  tesVSkyrimPresets,
  timeLoopPresets,
  touhouGensokyoPresets,
  unusualCreaturesPresets,
  wanjieEroticShopPresets,
  wsPresets,
  xianjiePresets,
  xiaoaoJianghuPresets,
  starAspirationsPresets,
};
