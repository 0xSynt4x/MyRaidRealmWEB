import { parseVariableUpdatePatch, type JsonPatchOperation } from './variableUpdate';

/**
 * 变量更新补丁的「格式修复层」。
 *
 * 只在补丁**读不进去**时介入：把畸形文本整形一遍，再把整形结果交回原来的解析 / 应用流程。
 * 它只修外壳（代码围栏、全角标点、夹带的说明文字、注释、多余逗号），不碰补丁内容 ——
 * 值里本来就有的中文标点一律原样保留，避免把好数据改坏。
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

type AcceptedPatchText = {
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
function acceptPatchText(text: string): AcceptedPatchText | null {
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

  return { text: candidate, unwrapped };
}

/**
 * 补丁文本整形：先看原文能不能用，不能用才逐步累加修复，
 * **每步之后都试一次「能不能用」，一旦能用立刻停**（避免过度修复把好输入改坏）。
 *
 * 修不好时返回原文，让调用方按原有口径报错 —— 修复层不会让结果变得更糟。
 */
export function resolvePatchTextWithRescue(rawText: string): PatchTextResolution {
  const original = String(rawText ?? '').trim();

  const direct = acceptPatchText(original);
  if (direct) {
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

    const accepted = acceptPatchText(current);
    if (accepted) {
      if (accepted.unwrapped) {
        steps.push('取出被包住的补丁数组');
      }
      return { text: accepted.text, steps, rescued: true };
    }
  }

  return { text: original, steps: [], rescued: false };
}
