import { Schema } from '../schema/schema';
import { commitStandaloneRuntimeState, resolveStandaloneRuntimeSessionStatData } from '../src/utils/standaloneRuntime';
import { readStorageSync, removeStorageSync, writeStorageSync } from '../src/utils/standaloneStorage';

const STANDALONE_STAT_DATA_STORAGE_KEY = 'th1980s:standalone-stat-data';

export type StandaloneCurrentStatData = ReturnType<typeof Schema.parse>;

function readLegacyStandaloneStatData(): StandaloneCurrentStatData | null {
  const stored = readStorageSync<unknown>(STANDALONE_STAT_DATA_STORAGE_KEY);
  if (stored === null) {
    return null;
  }

  return Schema.parse(stored);
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
  writeStorageSync(STANDALONE_STAT_DATA_STORAGE_KEY, parsed);
  return parsed;
}

export function clearStandaloneCurrentStatData(): void {
  removeStorageSync(STANDALONE_STAT_DATA_STORAGE_KEY);
}

export function seedStandaloneCurrentStatData(nextStatData: unknown): StandaloneCurrentStatData {
  const parsed = Schema.parse(nextStatData ?? {});
  return writeStandaloneCurrentStatData(parsed);
}

export function getStandaloneCurrentStatDataStorageKey(): string {
  return STANDALONE_STAT_DATA_STORAGE_KEY;
}
