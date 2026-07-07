export function applyStandalonePromptMacroReplacements(
  template: string,
  input: {
    statData: unknown;
    userName?: string;
    charName?: string;
  },
): string {
  return template
    .replace(/\{\{\s*format_message_variable::stat_data\s*\}\}/gi, JSON.stringify(input.statData ?? {}, null, 2))
    .replace(/\{\{\s*user\s*\}\}/gi, input.userName ?? '玩家')
    .replace(/\{\{\s*char\s*\}\}/gi, input.charName ?? '当前角色');
}

export function buildStandaloneCurrentStatDataBlock(statData: unknown): string {
  return `[当前变量快照 stat_data]\n${JSON.stringify(statData ?? {}, null, 2).trim()}`;
}
