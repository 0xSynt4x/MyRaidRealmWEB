import type { PresetI18nText } from '../types';
import spartacusLudusCapuaValueTranslations from './spartacus-ludus-capua-values';
import officialdomJiangchengValueTranslations from './officialdom-jiangcheng-values';
import gaokaoSimulatorValueTranslations from './gaokao-simulator-values';
import remainingPresetValueTranslations from './remaining-preset-values';
import preset_apocalypse_awakening_day1 from './apocalypse-awakening-day1';
import preset_azur_lane_commander from './azur-lane-commander';
import preset_spartacus_ludus_capua from './spartacus-ludus-capua';
import preset_china_1990s_family from './china-1990s-family';
import preset_financial_crisis_2008 from './financial-crisis-2008';
import preset_immortal_cultivation from './immortal-cultivation';
import preset_earth_online_2024_grad from './earth-online-2024-grad';
import preset_demon_lord_dungeon from './demon-lord-dungeon';
import preset_fallout_lone_wanderer from './fallout-lone-wanderer';
import preset_game_of_thrones_winterfell from './game-of-thrones-winterfell';
import preset_gaokao_simulator from './gaokao-simulator';
import preset_grand_war_dynasty from './grand-war-dynasty';
import preset_song_palace from './song-palace';
import preset_infinite_terror_god_space from './infinite-terror-god-space';
import preset_mars_humanoid_cohab from './mars-humanoid-cohab';
import preset_marvel_awakened from './marvel-awakened';
import preset_naruto_ninja_academy from './naruto-ninja-academy';
import preset_officialdom_jiangcheng from './officialdom-jiangcheng';
import preset_default_preset from './default-preset';
import preset_record_of_unusual_creatures from './record-of-unusual-creatures';
import preset_scp_foundation from './scp-foundation';
import preset_song_dynasty_spiritual_testing from './song-dynasty-spiritual-testing';
import preset_spiritual_awakening from './spiritual-awakening';
import preset_deserted_island from './deserted-island';
import preset_sim_spiritgirl from './sim-spiritgirl';
import preset_tes_v_skyrim_start from './tes-v-skyrim-start';
import preset_sim_timeloop from './sim-timeloop';
import preset_touhou_gensokyo_timestop from './touhou-gensokyo-timestop';
import preset_fantasy_erotic_shop from './fantasy-erotic-shop';
import preset_xianjie_zayi_farmer from './xianjie-zayi-farmer';
import preset_xiaoao_jianghu_wulin from './xiaoao-jianghu-wulin';
import preset_sim_staraspirations from './sim-staraspirations';
import preset_reform_era_1980s from './reform-era-1980s';
import preset_space_trader from './space-trader';
import preset_cyberpunk_city from './cyberpunk-city';
import preset_magic_academy from './magic-academy';
import preset_adventurer_guild from './adventurer-guild';

export const presetI18nEn: Record<string, PresetI18nText> = {
  'apocalypse-awakening-day1': preset_apocalypse_awakening_day1,
  'azur-lane-commander': preset_azur_lane_commander,
  'spartacus-ludus-capua': preset_spartacus_ludus_capua,
  'china-1990s-family': preset_china_1990s_family,
  'financial-crisis-2008': preset_financial_crisis_2008,
  'immortal-cultivation': preset_immortal_cultivation,
  'earth-online-2024-grad': preset_earth_online_2024_grad,
  'demon-lord-dungeon': preset_demon_lord_dungeon,
  'fallout-lone-wanderer': preset_fallout_lone_wanderer,
  'game-of-thrones-winterfell': preset_game_of_thrones_winterfell,
  'gaokao-simulator': preset_gaokao_simulator,
  'grand-war-dynasty': preset_grand_war_dynasty,
  'song-palace': preset_song_palace,
  'infinite-terror-god-space': preset_infinite_terror_god_space,
  'mars-humanoid-cohab': preset_mars_humanoid_cohab,
  'marvel-awakened': preset_marvel_awakened,
  'naruto-ninja-academy': preset_naruto_ninja_academy,
  'officialdom-jiangcheng': preset_officialdom_jiangcheng,
  default: preset_default_preset,
  'record-of-unusual-creatures': preset_record_of_unusual_creatures,
  'scp-foundation': preset_scp_foundation,
  'song-dynasty-spiritual-testing': preset_song_dynasty_spiritual_testing,
  'spiritual-awakening': preset_spiritual_awakening,
  'deserted-island': preset_deserted_island,
  'sim-spiritgirl': preset_sim_spiritgirl,
  'tes-v-skyrim-start': preset_tes_v_skyrim_start,
  'sim-timeloop': preset_sim_timeloop,
  'touhou-gensokyo-timestop': preset_touhou_gensokyo_timestop,
  'fantasy-erotic-shop': preset_fantasy_erotic_shop,
  'xianjie-zayi-farmer': preset_xianjie_zayi_farmer,
  'xiaoao-jianghu-wulin': preset_xiaoao_jianghu_wulin,
  'sim-staraspirations': preset_sim_staraspirations,
  'reform-era-1980s': preset_reform_era_1980s,
  'space-trader': preset_space_trader,
  'cyberpunk-city': preset_cyberpunk_city,
  'magic-academy': preset_magic_academy,
  'adventurer-guild': preset_adventurer_guild,
};

export const presetValueTranslations: Record<string, Record<string, string>> = {
  ...remainingPresetValueTranslations,
  'spartacus-ludus-capua': spartacusLudusCapuaValueTranslations,
  'officialdom-jiangcheng': officialdomJiangchengValueTranslations,
  'gaokao-simulator': gaokaoSimulatorValueTranslations,
};
