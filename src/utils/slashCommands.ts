/**
 * 输入栏斜杠命令定义。
 *
 * 这里是命令的**唯一真源** —— 补全列表、命中判断、打错拦截都读这份表，
 * 加一条命令只改这个文件。
 *
 * 约定：
 * - 命令只认中文名，不做英文别名；
 * - 命令是**本地手势**，命中后不发给模型，照常发给模型的是普通对话文字；
 * - 名字一旦发布就不再改 —— 玩家键位记的是字面量。
 */
export interface SlashCommand {
  /** 命令名（不带斜杠），也是玩家要敲的字面量 */
  name: string;
  /** 一句话说明，用于补全列表展示 */
  hint: string;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { name: '正文优化', hint: '审稿并改稿最新一条 AI 回复的正文' },
  { name: '重新生成', hint: '重新生成最新一条 AI 回复' },
  { name: '保存进度', hint: '把当前进度保存到存档列表' },
  { name: '下载', hint: '把当前存档导出为文件' },
] as const;

export const SLASH_COMMAND_PREFIX = '/';

/** 输入栏里已敲出的内容能否被当成一条命令（以斜杠开头） */
export function isSlashCommandInput(raw: string): boolean {
  return raw.trimStart().startsWith(SLASH_COMMAND_PREFIX);
}

/** 解析「/xxx」里的命令名；没有斜杠前缀时返回 null */
export function parseSlashCommandName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(SLASH_COMMAND_PREFIX)) {
    return null;
  }

  return trimmed.slice(SLASH_COMMAND_PREFIX.length).trim();
}

/** 按名字取命令定义；名字要精确匹配（大小写不敏感，中文无大小写，兼容英文输入法残留） */
export function findSlashCommand(raw: string): SlashCommand | null {
  const name = parseSlashCommandName(raw);
  if (!name) {
    return null;
  }

  const lowered = name.toLowerCase();
  return SLASH_COMMANDS.find(command => command.name.toLowerCase() === lowered) ?? null;
}

/** 按前缀筛出候选命令，供 Tab 补全与提示使用；空串前缀返回全部 */
export function matchSlashCommands(raw: string): SlashCommand[] {
  const name = parseSlashCommandName(raw);
  if (name === null) {
    return [];
  }

  const lowered = name.toLowerCase();
  return SLASH_COMMANDS.filter(command => command.name.toLowerCase().startsWith(lowered));
}
