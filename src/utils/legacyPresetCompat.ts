import type { LocalContentEntryConfig, PresetMigrationWarning } from '../presets/types';
import { legacyWorldbookContentByName } from '../assets/legacy-worldbook-compat';
import { normalizeLocalContentEntriesInput } from './standaloneLocalContent';

type LegacyPresetPayload = {
  localContentEntries?: LocalContentEntryConfig[];
  /** 旧预设导入兼容字段；新建、编辑和导出预设统一写 localContentEntries。 */
  worldbookEntries?: string[];
};

export type LegacyPresetMigrationResult = {
  localContentEntries: LocalContentEntryConfig[];
  warnings: PresetMigrationWarning[];
};

function normalizeLegacyWorldbookEntryName(name: string): string {
  return name.trim().replace(/^\[mvu_plot\]\s*/i, '');
}

function dedupeLocalContentEntries(entries: LocalContentEntryConfig[]): LocalContentEntryConfig[] {
  return entries.filter((entry, index, list) => {
    return (
      list.findIndex(candidate => {
        return (
          candidate.name.trim() === entry.name.trim() &&
          candidate.content.trim() === entry.content.trim() &&
          (candidate.kind ?? 'general') === (entry.kind ?? 'general') &&
          (candidate.route ?? 'shared') === (entry.route ?? 'shared')
        );
      }) === index
    );
  });
}

function buildLegacyWorldbookLocalContentEntries(worldbookEntries: string[]): LegacyPresetMigrationResult {
  const localContentEntries: LocalContentEntryConfig[] = [];
  const unresolvedEntryNames: string[] = [];

  worldbookEntries.forEach(entryName => {
    const normalizedName = normalizeLegacyWorldbookEntryName(entryName);
    const content = legacyWorldbookContentByName[normalizedName];

    if (!content?.trim()) {
      unresolvedEntryNames.push(normalizedName);
      return;
    }

    localContentEntries.push({
      name: normalizedName,
      content: content.trim(),
      kind: 'worldbook',
      route: 'main',
      enabled: true,
    });
  });

  return {
    localContentEntries,
    warnings: unresolvedEntryNames.length
      ? [
          {
            code: 'legacy_worldbook_entries_unresolved',
            entryNames: unresolvedEntryNames,
          },
        ]
      : [],
  };
}

export function migrateLegacyPresetLocalContent(payload: LegacyPresetPayload): LegacyPresetMigrationResult {
  const normalizedLocalContentEntries = normalizeLocalContentEntriesInput(payload.localContentEntries ?? []);
  const normalizedWorldbookEntries = Array.isArray(payload.worldbookEntries)
    ? payload.worldbookEntries.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
    : [];

  if (normalizedWorldbookEntries.length === 0) {
    return {
      localContentEntries: normalizedLocalContentEntries,
      warnings: [],
    };
  }

  const migratedWorldbookEntries = buildLegacyWorldbookLocalContentEntries(normalizedWorldbookEntries);

  return {
    localContentEntries: normalizeLocalContentEntriesInput(
      dedupeLocalContentEntries([...normalizedLocalContentEntries, ...migratedWorldbookEntries.localContentEntries]),
    ),
    warnings: migratedWorldbookEntries.warnings,
  };
}
