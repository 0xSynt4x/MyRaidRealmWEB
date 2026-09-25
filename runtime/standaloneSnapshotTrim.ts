/**
 * 发送前快照整形。
 *
 * 设计边界（改动前务必先读这段）：
 * 1. 只作用于「发给模型的快照字符串」，不修改运行时真状态，也不修改补丁应用的目标数据。
 * 2. 不作用于规则文案渲染时的数据源。变量更新规则文案开头是一段脚本，会读取
 *    「设置」（生存系统模式、积分触发开关）与「人物档案」（生成重要/普通/关注 NPC 列表）。
 *    若把同一份整形结果也喂给规则渲染，会出现「生存模式被当成关闭」「NPC 总数渲染为 0」。
 *    因此渲染上下文始终使用原始完整数据，只有快照走整形结果。
 * 3. 除「NPC 按在场裁」外，所有裁剪都无条件生效，不设开关 —— 它们要么是正确性要求，
 *    要么是纯收益无风险的整形。唯一的用户开关是「只发在场 NPC」，且只作用于辅助链。
 */

type PlainRecord = Record<string, unknown>;

/** 生存状态字段的保留清单。null 表示「全部保留」，空数组表示「整块不发」。 */
const SURVIVAL_FIELDS_BY_MODE: Record<string, string[] | null> = {
  关闭: [],
  基础模式: ['血量', '体力值'],
  生存模式: null,
};

export type StandaloneSnapshotTrimOptions = {
  /** 递归剔除所有以 `$` 开头的键。酒馆助手约定：`$` 前缀的数据不发送给 AI。 */
  dropDollarKeys: boolean;
  /** 剔除整个「设置」块。正文链使用；辅助链必须保留，否则模型无法回写积分触发开关。 */
  dropSettings: boolean;
  /** 「商城」只保留「物品」「技能」两个空路径，让模型知道路径存在但不发送商品内容。 */
  collapseShop: boolean;
  /** 当前生存系统模式。未知值按「不裁」处理。 */
  survivalMode: string;
  /** 保留的 NPC 档案键集合。null 表示本轮不裁剪 NPC。 */
  presentNpcIds: Set<string> | null;
};

function isPlainObject(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 递归剔除所有以 `$` 开头的键（酒馆助手约定：`$` 前缀不发送给 AI）。 */
function stripDollarKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(stripDollarKeys);
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      delete value[key];
      continue;
    }
    stripDollarKeys(value[key]);
  }
}

/** 「商城」只留两个空路径。模型看不到商品内容，但知道这两条路径存在，刷新补丁仍可写入。 */
function collapseShopPaths(statData: PlainRecord): void {
  if (!isPlainObject(statData['商城'])) {
    return;
  }

  statData['商城'] = { 物品: {}, 技能: {} };
}

/** 按模式裁剪单个容器上的「生存状态」。 */
function trimSurvivalState(container: unknown, keepFields: string[]): void {
  if (!isPlainObject(container)) {
    return;
  }

  const state = container['生存状态'];
  if (!isPlainObject(state)) {
    return;
  }

  if (keepFields.length === 0) {
    delete container['生存状态'];
    return;
  }

  for (const key of Object.keys(state)) {
    if (!keepFields.includes(key)) {
      delete state[key];
    }
  }
}

/** 按生存系统模式裁剪玩家与全部 NPC 的「生存状态」。 */
function trimSurvivalStates(statData: PlainRecord, mode: string): void {
  const keepFields = SURVIVAL_FIELDS_BY_MODE[mode];
  if (!keepFields) {
    return;
  }

  trimSurvivalState(statData['玩家'], keepFields);

  const archive = statData['人物档案'];
  if (isPlainObject(archive)) {
    for (const npc of Object.values(archive)) {
      trimSurvivalState(npc, keepFields);
    }
  }
}

/** 只保留在场 NPC 的档案条目。 */
function trimNpcArchive(statData: PlainRecord, presentNpcIds: Set<string>): void {
  const archive = statData['人物档案'];
  if (!isPlainObject(archive)) {
    return;
  }

  for (const id of Object.keys(archive)) {
    if (!presentNpcIds.has(id)) {
      delete archive[id];
    }
  }
}

/**
 * 生成一份整形后的快照数据副本。
 * 返回的是深拷贝，调用方可以放心序列化，不会影响原始状态。
 */
export function trimStandaloneSnapshot(statData: unknown, options: StandaloneSnapshotTrimOptions): unknown {
  if (!isPlainObject(statData)) {
    return statData;
  }

  const trimmed = cloneDeep(statData);

  if (options.collapseShop) {
    collapseShopPaths(trimmed);
  }

  if (options.survivalMode) {
    trimSurvivalStates(trimmed, options.survivalMode);
  }

  if (options.presentNpcIds) {
    trimNpcArchive(trimmed, options.presentNpcIds);
  }

  if (options.dropSettings) {
    delete trimmed['设置'];
  }

  if (options.dropDollarKeys) {
    stripDollarKeys(trimmed);
  }

  return trimmed;
}

/** 按开关序列化快照数据。 */
export function stringifyStandaloneSnapshot(value: unknown, compact: boolean): string {
  return compact ? JSON.stringify(value ?? {}) : JSON.stringify(value ?? {}, null, 2);
}

/**
 * 判定本轮「在场」的 NPC。
 *
 * 判定顺序（任何一条命中即保留）：
 * 1. 姓名为空 —— 无法匹配，永久保留。
 * 2. 标记为重要 NPC —— 永久保留。
 * 3. 标记为被关注 —— 永久保留。
 * 4. 姓名出现在待扫描文本里（本轮正文 + 玩家输入）。
 *
 * 返回 null 表示「本轮不裁剪」：没有文本可扫、档案为空、或一个名字都没命中。
 * 宁可少裁也不能让模型完全失明，所以匹配是宽松的（子串命中即保留）。
 */
export function collectPresentNpcIds(input: {
  statData: unknown;
  texts: string[];
  keepImportant: boolean;
  keepFocused: boolean;
}): Set<string> | null {
  const archive = isPlainObject(input.statData) ? input.statData['人物档案'] : null;
  if (!isPlainObject(archive)) {
    return null;
  }

  const ids = Object.keys(archive);
  if (ids.length === 0) {
    return null;
  }

  const haystack = input.texts.filter(text => typeof text === 'string' && text.trim()).join('\n');
  if (!haystack.trim()) {
    return null;
  }

  const kept = new Set<string>();
  let matchedAny = false;

  for (const id of ids) {
    const npc = archive[id];
    if (!isPlainObject(npc)) {
      kept.add(id);
      continue;
    }

    const name = typeof npc['姓名'] === 'string' ? npc['姓名'].trim() : '';
    if (!name) {
      kept.add(id);
      continue;
    }

    // 名字命中必须先记「有命中」再决定去留 —— 否则「本轮唯一被提到的人是重要 NPC」这种
    // 情况会因为提前 continue 而不计命中，把整轮裁剪误判成「一个名字都没扫到」。
    if (haystack.includes(name)) {
      matchedAny = true;
      kept.add(id);
      continue;
    }

    if (input.keepImportant && npc['重要NPC'] === true) {
      kept.add(id);
      continue;
    }

    if (input.keepFocused && npc['_关注'] === true) {
      kept.add(id);
    }
  }

  if (!matchedAny) {
    return null;
  }

  return kept;
}

/** 读取生存系统模式；取不到时按「关闭」处理（与规则文案的兜底一致）。 */
export function resolveSurvivalMode(statData: unknown): string {
  if (!isPlainObject(statData)) {
    return '关闭';
  }

  const settings = statData['设置'];
  if (!isPlainObject(settings)) {
    return '关闭';
  }

  const mode = settings['生存系统模式'];
  return typeof mode === 'string' && mode.trim() ? mode : '关闭';
}

/** 生存系统是否处于「关闭」——关闭时写入层需要拦掉指向生存状态的补丁。 */
export function isStandaloneSurvivalDisabled(statData: unknown): boolean {
  return resolveSurvivalMode(statData) === '关闭';
}

/**
 * 快照整形的用户设置。
 *
 * 🔴 **只剩一个开关。** 其余裁剪全部无条件生效（见 `buildStandaloneSnapshotForChain`）——
 * 它们要么是正确性要求（`$` 前缀本就不该发给 AI；生存系统关着时那几个数值毫无意义），
 * 要么是纯收益无风险的整形（紧凑输出、商城只留路径）。做成开关只会被人误关掉，
 * 从而把「必须做的事」变成「可能没做」。
 */
export type StandaloneSnapshotTrimSettings = {
  /** NPC 按本轮在场名单裁剪。只作用于辅助链；正文链全发。 */
  trimNpc: boolean;
};

export const DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS: StandaloneSnapshotTrimSettings = {
  trimNpc: true,
};

const STANDALONE_SNAPSHOT_TRIM_BOOLEAN_KEYS = [
  'trimNpc',
] as const satisfies readonly (keyof StandaloneSnapshotTrimSettings)[];

/** 从持久化数据里读取开关；缺失或类型不对的项回落到默认值。 */
export function normalizeStandaloneSnapshotTrimSettings(input: unknown): StandaloneSnapshotTrimSettings {
  const record = isPlainObject(input) ? input : {};
  const next: StandaloneSnapshotTrimSettings = { ...DEFAULT_STANDALONE_SNAPSHOT_TRIM_SETTINGS };

  for (const key of STANDALONE_SNAPSHOT_TRIM_BOOLEAN_KEYS) {
    const value = record[key];
    if (typeof value === 'boolean') {
      next[key] = value;
    }
  }

  return next;
}

/** 快照属于哪条链。两条链的裁剪口径不同（设置块、NPC 裁剪）。 */
export type StandaloneSnapshotChain = 'main' | 'variable_update';

export type StandaloneSnapshotTrimResult = {
  /** 供快照宏使用的整形数据（深拷贝，序列化完即可丢）。 */
  snapshot: unknown;
  /** 是否使用紧凑 JSON。 */
  compact: boolean;
};

/**
 * 按链路组装发送用快照。
 *
 * 🔴 **除「NPC 按在场裁」外，所有裁剪都无条件生效。**
 * - 紧凑 JSON、剔 `$` 前缀键、商城塌成空路径、生存状态按模式裁：两条链都做。
 * - 剔「设置」块：只做正文链；辅助链必须保留，否则模型无法回写积分触发开关。
 * - NPC 按在场裁：只做辅助链，且受唯一开关 `trimNpc` 控制（正文链全发）。
 */
export function buildStandaloneSnapshotForChain(input: {
  statData: unknown;
  settings: StandaloneSnapshotTrimSettings;
  chain: StandaloneSnapshotChain;
  /** 待扫描文本（本轮正文 + 玩家输入）。只有辅助链的 NPC 裁剪会用到。 */
  texts?: string[];
}): StandaloneSnapshotTrimResult {
  const presentNpcIds =
    input.chain === 'variable_update' && input.settings.trimNpc
      ? collectPresentNpcIds({
          statData: input.statData,
          texts: input.texts ?? [],
          keepImportant: true,
          keepFocused: true,
        })
      : null;

  return {
    snapshot: trimStandaloneSnapshot(input.statData, {
      dropDollarKeys: true,
      dropSettings: input.chain === 'main',
      collapseShop: true,
      survivalMode: resolveSurvivalMode(input.statData),
      presentNpcIds,
    }),
    compact: true,
  };
}
