import { parseVariableUpdatePatch, type JsonPatchOperation } from './variableUpdate';

/**
 * 变量更新补丁的「格式与路径修复层」。
 *
 * 只在补丁**读不进去**或**路径漏了层级**时介入：
 * ① 文本整形：把畸形文本整形一遍（代码围栏、全角标点、夹带的说明文字、注释、多余逗号）；
 * ② 路径补全：把漏写中间层的路径按数据实际结构补回来（不限定根 —— 玩家、NPC、世界… 任何一层都适用）。
 *    例：`/玩家/主货币/数量` → `/玩家/货币资源/主货币/数量`；
 *        `/人物档案/NPC_1/当前状态` → `/人物档案/NPC_1/个人信息/当前状态`。
 *
 * 两者都只改**写法**、不改**值** —— 值里本来就有的中文标点一律原样保留，避免把好数据改坏。
 * 整形 / 补全的结果仍然交回原来的解析 → 护栏 → 写入流程，那套逻辑一行不改。
 *
 * 与提示词的关系：提示词是**概率性**约束（只能降低出错率，消不掉），这一层是**确定性**兜底。
 */

/** 整形结果。 */
export type PatchTextResolution = {
  /** 交给后续解析的文本；没救回时就是原文。 */
  text: string;
  /** 做过的整形步骤，用于留痕；没整形就是空数组。 */
  steps: string[];
  /** 是否真的动用了修复层（原文本来就能用 → false）。 */
  rescued: boolean;
};

type TextFixer = {
  label: string;
  apply: (text: string) => string;
};

/** 去 markdown 代码围栏；兼容「只有开头没有结尾」的截断情形。 */
function stripFences(text: string): string {
  const closed = text.match(/```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/);
  if (closed) {
    return closed[1].trim();
  }

  const openOnly = text.match(/^\s*```[a-zA-Z0-9_-]*\s*\n?([\s\S]*)$/);
  if (openOnly) {
    return openOnly[1].trim();
  }

  return text;
}

/**
 * 全角结构标点转半角。
 *
 * 🔴 只转**字符串外**的标点：值里本来就有中文标点（`他说：“好，明天见”`）时，
 * 盲转会把值本身改坏。引号不在这里转（风险更高，本次不做）。
 */
function normalizePunctuation(text: string): string {
  const map: Record<string, string> = {
    '，': ',',
    '：': ':',
    '；': ';',
    '（': '(',
    '）': ')',
    '［': '[',
    '］': ']',
    '｛': '{',
    '｝': '}',
    '　': ' ',
  };

  let out = '';
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      out += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }

    out += inString ? char : (map[char] ?? char);
  }

  return out;
}

/** 从夹带的说明文字里抠出第一个 JSON 块（按括号配对，跳过字符串内部）。 */
function extractJsonBlock(text: string): string {
  const start = text.search(/[[{]/);
  if (start < 0) {
    return text;
  }

  const open = text[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }

    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  // 没配对（多半是截断）→ 返回剩余部分，交给后续步骤与真实校验判断
  return text.slice(start);
}

/** 去掉行注释（`//`）与块注释（`/*` 到 `*` + `/`），跳过字符串内部。 */
function stripComments(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      out += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }

    if (inString) {
      out += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') {
        index += 1;
      }
      out += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    out += char;
  }

  return out;
}

/** 去掉数组 / 对象末尾的多余逗号。 */
function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[\]}])/g, '$1');
}

/**
 * 本次启用的整形步骤。
 *
 * 🔴 顺序重要：先脱壳、再换标点、再抠主体、最后清注释与逗号。
 * 参考实现里另有「单引号转双引号」「中文弯引号转直引号」「修截断」三步，风险最高，本次**不启用**。
 */
const TEXT_FIXERS: TextFixer[] = [
  { label: '去掉代码围栏', apply: stripFences },
  { label: '全角标点转半角', apply: normalizePunctuation },
  { label: '抠出 JSON 内容', apply: extractJsonBlock },
  { label: '去掉注释', apply: stripComments },
  { label: '去掉多余的逗号', apply: stripTrailingCommas },
];

/** 模型把补丁数组包在对象里时，优先认这些字段名。 */
const PATCH_WRAPPER_KEYS = ['patch', 'JSONPatch', 'jsonpatch', 'operations', 'ops', 'updates'];

/** 解析结果若是「包着数组的对象」，把里层数组取出来；取不到返回 null。 */
function unwrapPatchArray(value: unknown): JsonPatchOperation[] | null {
  if (Array.isArray(value)) {
    return value as JsonPatchOperation[];
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of PATCH_WRAPPER_KEYS) {
    if (Array.isArray(record[key])) {
      return record[key] as JsonPatchOperation[];
    }
  }

  for (const candidate of Object.values(record)) {
    if (Array.isArray(candidate)) {
      return candidate as JsonPatchOperation[];
    }
  }

  return null;
}

type AcceptedPatch = {
  /** 解析出的操作数组。 */
  patch: JsonPatchOperation[];
  /** 可以交给后续流程的文本。 */
  text: string;
  /** 是否发生过「取出被包住的数组」。 */
  unwrapped: boolean;
};

/**
 * 判定一段文本能不能当补丁用。
 *
 * 🔴 判据必须是**项目真实的补丁校验**，不能只看 JSON 能不能读 ——
 * 否则「JSON 合法但操作非法」（例如缺 op）会被误判成救回。
 */
function acceptPatch(text: string): AcceptedPatch | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  const patch = unwrapPatchArray(value);
  if (patch === null) {
    return null;
  }

  const unwrapped = !Array.isArray(value);
  // 原文就是数组时原样返回，保证内容逐字不变。
  const candidate = unwrapped ? JSON.stringify(patch) : text;

  try {
    parseVariableUpdatePatch(candidate);
  } catch {
    return null;
  }

  return { patch, text: candidate, unwrapped };
}

/** JSON Pointer 转义还原（`~1` → `/`，`~0` → `~`）。 */
function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** 路径在数据里能不能走到（只读，不抛错）。 */
function pathResolves(root: unknown, path: string): boolean {
  if (!path.startsWith('/')) {
    return false;
  }

  let current: unknown = root;

  for (const rawToken of path.slice(1).split('/')) {
    const token = decodePointerToken(rawToken);

    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return false;
      }
      current = current[index];
      continue;
    }

    if (typeof current !== 'object' || current === null) {
      return false;
    }

    if (!(token in (current as Record<string, unknown>))) {
      return false;
    }

    current = (current as Record<string, unknown>)[token];
  }

  return true;
}

/**
 * 在 `parent` 的直接子对象里，找哪些「对象型子键」含有 `field`。
 *
 * 这就是「唯一命中」闸门的原料：只有恰好一个子对象含这个字段名，才认为模型是漏写了这一层。
 */
function findSubLayersContaining(parent: Record<string, unknown>, field: string): string[] {
  const layers: string[] = [];

  for (const [key, value] of Object.entries(parent)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && field in value) {
      layers.push(key);
    }
  }

  return layers;
}

/**
 * 通用「漏写中间层」补全。
 *
 * 从根往下走，找到**第一个走不到的段**，在它父对象的直接子对象里找**恰好一个**含该段名的对象，
 * 把这一层补回去。不限定在哪个根下，任何一层都适用：
 * - `/玩家/主货币/数量` → `/玩家/货币资源/主货币/数量`
 * - `/人物档案/NPC_1/当前状态` → `/人物档案/NPC_1/个人信息/当前状态`
 *
 * 🔴 三条闸门，缺一不可：
 * ① **只补一层**，且断点之前的前缀必须全部真实存在（顶层自然对上）；
 * ② 候选必须**唯一命中** —— 0 个（字段名本身不存在）或 ≥2 个（歧义）都不动；
 * ③ 补完必须**整条能解析** —— 否则说明断点不止一处，宁可不动、保留原报错，免得越修越乱。
 *
 * 路径本来就解析得到时一律不动 —— 不会把对的改坏。
 * 救错了是把数据静默写到别处（看不见），比丢一条（看得见）更糟，所以规则宁严勿宽。
 */
function repairMissingLayer(path: string, root: unknown): string | null {
  if (pathResolves(root, path)) {
    return null;
  }

  const tokens = path.split('/');
  if (tokens[0] !== '') {
    return null;
  }

  let container: unknown = root;

  for (let index = 1; index < tokens.length; index += 1) {
    const token = decodePointerToken(tokens[index]!);

    // 走到数组或非对象时，已没有「子对象层」可补
    if (typeof container !== 'object' || container === null || Array.isArray(container)) {
      return null;
    }

    const record = container as Record<string, unknown>;

    if (!(token in record)) {
      const layers = findSubLayersContaining(record, token);
      if (layers.length !== 1) {
        return null;
      }

      const rebuilt = [...tokens.slice(0, index), layers[0]!, ...tokens.slice(index)].join('/');
      return pathResolves(root, rebuilt) ? rebuilt : null;
    }

    container = record[token];
  }

  return null;
}

/**
 * 逐条补全「漏写中间层」的路径；一条都没补到就返回 null。
 *
 * 只在文本已经能读成合法补丁时介入（语法错 / 结构错交给别的修复器与上层报错）。
 * 补到任意一条时，把整份补丁重新序列化交回后续流程。
 */
function repairMissingLayers(accepted: AcceptedPatch, statData: unknown): { text: string; count: number } | null {
  let count = 0;

  const repaired = accepted.patch.map(operation => {
    if (operation.op === 'move') {
      const from = repairMissingLayer(operation.from, statData);
      const to = repairMissingLayer(operation.to, statData);
      if (!from && !to) {
        return operation;
      }
      count += 1;
      return { ...operation, from: from ?? operation.from, to: to ?? operation.to };
    }

    const fixed = repairMissingLayer(operation.path, statData);
    if (!fixed) {
      return operation;
    }
    count += 1;
    return { ...operation, path: fixed };
  });

  if (count === 0) {
    return null;
  }

  return { text: JSON.stringify(repaired), count };
}

/**
 * 补丁文本整形 + 路径补全：先看原文能不能用，不能用才逐步累加修复，
 * **每步之后都试一次「能不能用」，一旦能用立刻停**（避免过度修复把好输入改坏）。
 *
 * 文本能用之后，再做一次「漏写中间层」的路径补全（需要 `statData` 才做；
 * 不传时行为与从前完全一致）。
 *
 * 修不好时返回原文，让调用方按原有口径报错 —— 修复层不会让结果变得更糟。
 */
export function resolvePatchTextWithRescue(rawText: string, statData?: unknown): PatchTextResolution {
  const original = String(rawText ?? '').trim();

  const direct = acceptPatch(original);
  if (direct) {
    // 文本本来就合法，但路径可能漏了中间层 —— 这一步也在这里兜。
    const repaired = statData === undefined ? null : repairMissingLayers(direct, statData);
    if (repaired) {
      return {
        text: repaired.text,
        steps: [...(direct.unwrapped ? ['取出被包住的补丁数组'] : []), '补全漏写的中间层'],
        rescued: true,
      };
    }

    return {
      text: direct.text,
      steps: direct.unwrapped ? ['取出被包住的补丁数组'] : [],
      rescued: direct.unwrapped,
    };
  }

  let current = original;
  const steps: string[] = [];

  for (const fixer of TEXT_FIXERS) {
    const next = fixer.apply(current);
    if (next === current) {
      continue;
    }

    current = next;
    steps.push(fixer.label);

    const accepted = acceptPatch(current);
    if (!accepted) {
      continue;
    }

    if (accepted.unwrapped) {
      steps.push('取出被包住的补丁数组');
    }

    const repaired = statData === undefined ? null : repairMissingLayers(accepted, statData);
    if (repaired) {
      steps.push('补全漏写的中间层');
      return { text: repaired.text, steps, rescued: true };
    }

    return { text: accepted.text, steps, rescued: true };
  }

  return { text: original, steps: [], rescued: false };
}
