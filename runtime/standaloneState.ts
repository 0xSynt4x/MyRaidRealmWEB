import { Schema } from '../schema/schema';
import {
  commitStandaloneRuntimeState,
  resolveStandaloneRuntimeSessionStatData,
} from '../src/utils/standaloneRuntime';

const STANDALONE_STAT_DATA_STORAGE_KEY = 'th1980s:standalone-stat-data';

export type StandaloneCurrentStatData = ReturnType<typeof Schema.parse>;

function readLegacyStandaloneStatData(): StandaloneCurrentStatData | null {
  const stored = localStorage.getItem(STANDALONE_STAT_DATA_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  return Schema.parse(JSON.parse(stored));
}

export function readStandaloneCurrentStatData(): StandaloneCurrentStatData {
  try {
    const runtimeStatData = resolveStandaloneRuntimeSessionStatData();
    if (runtimeStatData) {
      return Schema.parse(runtimeStatData);
    }

    const legacyStatData = readLegacyStandaloneStatData();
    if (legacyStatData) {
      writeStandaloneCurrentStatData(legacyStatData);
      return legacyStatData;
    }

    return Schema.parse({});
  } catch (error) {
    console.warn('[1980s-standalone] 读取当前 standalone stat_data 失败，已回退到默认值:', error);
    return Schema.parse({});
  }
}

export function writeStandaloneCurrentStatData(statData: StandaloneCurrentStatData): StandaloneCurrentStatData {
  const parsed = Schema.parse(statData);
  commitStandaloneRuntimeState({
    statData: parsed,
  });
  localStorage.setItem(STANDALONE_STAT_DATA_STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}

export function clearStandaloneCurrentStatData(): void {
  localStorage.removeItem(STANDALONE_STAT_DATA_STORAGE_KEY);
}

export function seedStandaloneCurrentStatData(nextStatData: unknown): StandaloneCurrentStatData {
  const parsed = Schema.parse(nextStatData ?? {});
  return writeStandaloneCurrentStatData(parsed);
}

export function getStandaloneCurrentStatDataStorageKey(): string {
  return STANDALONE_STAT_DATA_STORAGE_KEY;
}
