import type { WorldDifficulty } from '../stores/settings';

export type WorldbookBridgeSyncResult =
  | { status: 'skipped' }
  | { status: 'success' }
  | { status: 'missing_worldbook' }
  | { status: 'missing_entries' }
  | { status: 'error'; error: unknown };

export async function syncFixedVariableUpdateWorldbookBridge(): Promise<WorldbookBridgeSyncResult> {
  return { status: 'skipped' };
}

export async function syncTextToImageWorldbookBridge(enabled: boolean): Promise<WorldbookBridgeSyncResult> {
  void enabled;
  return { status: 'skipped' };
}

export async function syncOnlineModeWorldbookBridge(enabled: boolean): Promise<WorldbookBridgeSyncResult> {
  void enabled;
  return { status: 'skipped' };
}

export async function syncWorldDifficultyWorldbookBridge(
  difficulty: WorldDifficulty,
): Promise<WorldbookBridgeSyncResult> {
  void difficulty;
  return { status: 'skipped' };
}
