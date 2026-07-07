import type { LocalContentEntryConfig, PresetConfig } from '../../presets/types';
import capuaWorldbookRaw from '../standalone-worldbooks/capua-blood-sand.md?raw';
import family1990sWorldbookRaw from '../standalone-worldbooks/china-1990s-family.md?raw';
import demonLordWorldbookRaw from '../standalone-worldbooks/demon-lord-dungeon.md?raw';
import gaokaoWorldbookRaw from '../standalone-worldbooks/gaokao-simulator.md?raw';
import marsWorldbookRaw from '../standalone-worldbooks/mars-humanoid-cohab.md?raw';
import reformEraWorldbookRaw from '../standalone-worldbooks/reform-era-1980s.md?raw';
import songDynastyWorldbookRaw from '../standalone-worldbooks/song-dynasty-spiritual-testing.md?raw';
import songDynastyCultivationWorldbookRaw from '../standalone-worldbooks/song-dynasty-cultivation.txt?raw';
import starAspirationsWorldbookRaw from '../standalone-worldbooks/star-aspirations-weiyang.md?raw';
import spiritGirlWorldbookRaw from '../standalone-worldbooks/spirit-girl.md?raw';
import timeLoopWorldbookRaw from '../standalone-worldbooks/time-loop.md?raw';

type RegisteredWorldbookAsset = {
  id: string;
  name: string;
  aliases?: string[];
  content: string;
};

export const registeredWorldbookAssets: RegisteredWorldbookAsset[] = [
  {
    id: 'wb-reform-era-1980s',
    name: '[WB]激流·黄金时代1980s',
    aliases: ['[WB]激流·黄金时代:1980s'],
    content: reformEraWorldbookRaw.trim(),
  },
  {
    id: 'wb-song-dynasty-spiritual-testing',
    name: '[WB]大宋验灵司',
    content: songDynastyWorldbookRaw.trim(),
  },
  {
    id: 'wb-song-dynasty-cultivation',
    name: '[WB]SongDynasty',
    content: songDynastyCultivationWorldbookRaw.trim(),
  },
  {
    id: 'wb-star-aspirations-weiyang',
    name: '[WB]明星志愿-未央市',
    content: starAspirationsWorldbookRaw.trim(),
  },
  {
    id: 'wb-spirit-girl',
    name: '[WB]精神小妹模拟器',
    content: spiritGirlWorldbookRaw.trim(),
  },
  {
    id: 'wb-china-1990s-family',
    name: '[WB]1990·温馨小屋',
    content: family1990sWorldbookRaw.trim(),
  },
  {
    id: 'wb-capua-blood-sand',
    name: '[WB]卡普阿的荣耀：血与沙',
    content: capuaWorldbookRaw.trim(),
  },
  {
    id: 'wb-demon-lord-dungeon',
    name: '[WB]eramaou魔王',
    content: demonLordWorldbookRaw.trim(),
  },
  {
    id: 'wb-gaokao-simulator',
    name: '[WB]高考模拟器',
    content: gaokaoWorldbookRaw.trim(),
  },
  {
    id: 'wb-mars-humanoid-cohab',
    name: '[WB]火星采矿站人机共居',
    content: marsWorldbookRaw.trim(),
  },
  {
    id: 'wb-time-loop',
    name: '[WB]乐吧欢乐公寓',
    content: timeLoopWorldbookRaw.trim(),
  },
];

const registeredWorldbookAssetByLookupName = new Map<string, RegisteredWorldbookAsset>(
  registeredWorldbookAssets.flatMap(asset => [
    [asset.name, asset],
    ...(asset.aliases ?? []).map(alias => [alias, asset] as const),
  ]),
);

export const registeredWorldbookContentByName: Record<string, string> = Object.fromEntries(
  registeredWorldbookAssets.flatMap(asset => [
    [asset.name, asset.content],
    ...(asset.aliases ?? []).map(alias => [alias, asset.content]),
  ]),
);

function createWorldbookLocalContentEntry(name: string, content: string): LocalContentEntryConfig {
  return {
    name,
    content,
    registeredWorldbookName: name,
    kind: 'worldbook',
    route: 'main',
    enabled: true,
  };
}

function normalizeRegisteredWorldbookNames(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();

  return input
    .filter((name): name is string => typeof name === 'string')
    .map(name => name.trim())
    .filter(name => {
      if (!name || seen.has(name)) {
        return false;
      }

      seen.add(name);
      return true;
    });
}

function isMainWorldbookEntry(entry: LocalContentEntryConfig): boolean {
  const normalizedName = entry.name.trim();
  const resolvedKind = entry.kind ?? (/^\[WB\]/i.test(normalizedName) ? 'worldbook' : 'general');
  return resolvedKind === 'worldbook' && (entry.route ?? 'shared') === 'main';
}

function findRegisteredWorldbookEntryIndex(
  entries: LocalContentEntryConfig[],
  worldbookName: string,
  content: string,
): number {
  const trimmedContent = content.trim();

  return entries.findIndex(entry => {
    if (entry.registeredWorldbookName?.trim() === worldbookName) {
      return true;
    }

    return (
      entry.name.trim() === worldbookName && entry.content.trim() === trimmedContent && isMainWorldbookEntry(entry)
    );
  });
}

function findLegacyWorldbookEntryIndex(entries: LocalContentEntryConfig[], worldbookName: string): number {
  return entries.findIndex(entry => entry.name.trim() === worldbookName && isMainWorldbookEntry(entry));
}

export function createRegisteredWorldbookLocalContentEntries(names: readonly string[]): LocalContentEntryConfig[] {
  const seen = new Set<string>();

  return normalizeRegisteredWorldbookNames(names)
    .map(name => {
      const asset = registeredWorldbookAssetByLookupName.get(name);
      return asset ? createWorldbookLocalContentEntry(asset.name, asset.content) : null;
    })
    .filter((entry): entry is LocalContentEntryConfig => Boolean(entry))
    .filter(entry => {
      const key = entry.name;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

const builtinPresetWorldbookNames: Record<string, string[]> = {
  'reform-era-1980s': ['[WB]激流·黄金时代1980s'],
  'song-dynasty-spiritual-testing': ['[WB]大宋验灵司'],
  'sim-staraspirations': ['[WB]明星志愿-未央市'],
  'sim-spiritgirl': ['[WB]精神小妹模拟器'],
  'demon-lord-dungeon': ['[WB]eramaou魔王'],
  'spartacus-ludus-capua': ['[WB]卡普阿的荣耀：血与沙'],
  'gaokao-simulator': ['[WB]高考模拟器'],
  'mars-humanoid-cohab': ['[WB]火星采矿站人机共居'],
  'sim-timeloop': ['[WB]乐吧欢乐公寓'],
  'china-1990s-family': ['[WB]1990·温馨小屋'],
};

export function getRegisteredWorldbookNamesForPreset(
  preset: Pick<PresetConfig, 'id' | 'registeredWorldbookNames'>,
): string[] {
  return normalizeRegisteredWorldbookNames([
    ...(builtinPresetWorldbookNames[preset.id] ?? []),
    ...(preset.registeredWorldbookNames ?? []),
  ]);
}

export function rehydratePresetWithRegisteredWorldbooks(preset: PresetConfig): PresetConfig {
  const linkedNames = getRegisteredWorldbookNamesForPreset(preset);
  if (linkedNames.length === 0) {
    return preset;
  }

  const linkedEntries = createRegisteredWorldbookLocalContentEntries(linkedNames);
  if (linkedEntries.length === 0) {
    return preset;
  }

  const existingEntries = Array.isArray(preset.localContentEntries) ? preset.localContentEntries : [];
  const nextEntries = existingEntries.map(entry => ({ ...entry }));
  let changed = false;

  linkedEntries.forEach(entry => {
    const registeredIndex = findRegisteredWorldbookEntryIndex(nextEntries, entry.name, entry.content);
    if (registeredIndex >= 0) {
      if (nextEntries[registeredIndex]!.registeredWorldbookName !== entry.name) {
        nextEntries[registeredIndex] = {
          ...nextEntries[registeredIndex],
          registeredWorldbookName: entry.name,
        };
        changed = true;
      }
      return;
    }

    const legacyIndex = findLegacyWorldbookEntryIndex(nextEntries, entry.name);
    if (legacyIndex >= 0) {
      nextEntries[legacyIndex] = {
        ...nextEntries[legacyIndex],
        registeredWorldbookName: entry.name,
      };
      changed = true;
      return;
    }

    nextEntries.push(entry);
    changed = true;
  });

  if (!changed) {
    return preset;
  }

  return {
    ...preset,
    localContentEntries: nextEntries,
  };
}

export function attachRegisteredWorldbooksToBuiltInPresets(presets: PresetConfig[]): PresetConfig[] {
  return presets.map(rehydratePresetWithRegisteredWorldbooks);
}
