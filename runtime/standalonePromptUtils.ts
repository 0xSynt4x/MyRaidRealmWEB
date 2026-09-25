import { stringifyStandaloneSnapshot } from './standaloneSnapshotTrim';

type StandaloneMacroRecord = Record<string, unknown>;

const STANDALONE_PROMPT_MACRO_FALLBACKS = {
  user: '玩家',
  char: '当前角色',
  group: '当前群组',
  scenario: '当前场景',
  personality: '角色性格',
  lastChatMessage: '上一条消息',
} as const;

function readStandaloneMacroRecord(input: unknown): StandaloneMacroRecord | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  return input as StandaloneMacroRecord;
}

function readStandaloneMacroPath(input: unknown, path: readonly string[]): string {
  let cursor: unknown = input;

  for (const segment of path) {
    const record = readStandaloneMacroRecord(cursor);
    if (!record) {
      return '';
    }

    cursor = record[segment];
  }

  return typeof cursor === 'string' ? cursor.trim() : '';
}

export function resolveStandaloneMacroUserName(statData: unknown): string {
  return readStandaloneMacroPath(statData, ['玩家', '姓名']);
}

export function resolveStandaloneMacroScenario(statData: unknown): string {
  return readStandaloneMacroPath(statData, ['世界', '空间定位', '当前位置']);
}

export function applyStandalonePromptMacroReplacements(
  template: string,
  input: {
    statData: unknown;
    /**
     * 专供 `{{format_message_variable::stat_data}}` 的整形数据。
     * 缺省回落到 statData —— 调用方若已做发送前裁剪，应把裁剪结果从这里传入，
     * 让 statData 保持完整（规则文案的脚本要读它）。
     */
    snapshotStatData?: unknown;
    /** 快照是否使用紧凑 JSON。缺省保持原有的美化输出。 */
    compactSnapshot?: boolean;
    userName?: string;
    charName?: string;
  },
): string {
  const resolvedUserName =
    (typeof input.userName === 'string' ? input.userName.trim() : '') ||
    resolveStandaloneMacroUserName(input.statData) ||
    STANDALONE_PROMPT_MACRO_FALLBACKS.user;
  const resolvedCharName =
    (typeof input.charName === 'string' ? input.charName.trim() : '') || STANDALONE_PROMPT_MACRO_FALLBACKS.char;
  const resolvedScenario = resolveStandaloneMacroScenario(input.statData) || STANDALONE_PROMPT_MACRO_FALLBACKS.scenario;
  const snapshotSource = input.snapshotStatData ?? input.statData;

  return template
    .replace(/\{\{\s*user\s*\}\}/gi, resolvedUserName)
    .replace(/\{\{\s*char\s*\}\}/gi, resolvedCharName)
    .replace(/\{\{\s*group\s*\}\}/gi, STANDALONE_PROMPT_MACRO_FALLBACKS.group)
    .replace(/\{\{\s*scenario\s*\}\}/gi, resolvedScenario)
    .replace(/\{\{\s*personality\s*\}\}/gi, STANDALONE_PROMPT_MACRO_FALLBACKS.personality)
    .replace(/\{\{\s*lastChatMessage\s*\}\}/gi, STANDALONE_PROMPT_MACRO_FALLBACKS.lastChatMessage)
    .replace(
      /\{\{\s*format_message_variable::stat_data\s*\}\}/gi,
      stringifyStandaloneSnapshot(snapshotSource, input.compactSnapshot === true),
    );
}

export function buildStandaloneCurrentStatDataBlock(
  statData: unknown,
  options?: {
    /** 使用紧凑 JSON（去掉缩进）。只影响字符数，语义不变。 */
    compact?: boolean;
  },
): string {
  return `[当前变量快照 stat_data]\n${stringifyStandaloneSnapshot(statData, options?.compact === true).trim()}`;
}
