/**
 * 本地 ComfyUI 生图客户端
 *
 * 职责：
 * 1. 连通性测试（读服务器信息）
 * 2. 解析玩家粘贴的「API 格式工作流」：自动认出提示词节点、尺寸节点、种子节点
 * 3. 提交任务 → 轮询结果 → 拼出图片地址
 *
 * 浏览器侧约束：页面若是 https，访问 http://127.0.0.1 需要浏览器授予「本地网络访问」权限，
 * 且 ComfyUI 必须带 --enable-cors-header 启动，否则请求会被直接拒绝。
 */

export interface ComfyUiWorkflowNode {
  id: string;
  classType: string;
  /** 玩家在 ComfyUI 里给节点起的标题（没改过就是空的） */
  title: string;
  /** 界面上用来区分节点的简短说明：优先显示标题，其次显示节点里已有的文字 */
  preview: string;
  /** 这个节点里有没有「能装提示词」的字段，供界面上排序/提示 */
  writable: boolean;
}

export interface ComfyUiWorkflowAnalysis {
  ok: boolean;
  error?: string;
  /** 工作流里所有节点，供玩家手动指定提示词节点 */
  textNodes: ComfyUiWorkflowNode[];
  /** 自动认出的正向提示词节点 */
  positiveNodeId: string;
  /** 正向是「真认出来的」还是「没认出来、先按第一个能装提示词的节点猜的」 */
  positiveDetected: boolean;
  /** 自动认出的负向提示词节点（没有则为空） */
  negativeNodeId: string;
  /** 带 width/height 的节点 */
  sizeNodeIds: string[];
  /** 带 seed / noise_seed 的节点，value 是字段名 */
  seedNodes: { id: string; field: string }[];
  /** 工作流里有没有「保存图像」节点；没有的话图片会落在临时目录，可能被清理 */
  hasSaveImage: boolean;
}

export interface ComfyUiServerInfo {
  comfyuiVersion: string;
  deviceName: string;
  vramTotalMb: number;
}

export interface ComfyUiGenerateOptions {
  baseUrl: string;
  workflow: Record<string, unknown>;
  positiveNodeId: string;
  negativeNodeId?: string;
  prompt: string;
  negativePrompt?: string;
  /** 生图设置：宽高，为空则完全按工作流里的值 */
  width?: number;
  height?: number;
  /** 随机种子开关：打开则每次随机 */
  randomSeed?: boolean;
  /** 关掉随机种子后用的固定种子；留空则前端兜底随机一个 */
  fixedSeed?: number | null;
  /** 尺寸节点，缺省时自动推断 */
  sizeNodeIds?: string[];
  /** 种子节点，缺省时自动推断 */
  seedNodes?: { id: string; field: string }[];
  /**
   * 分辨率选择器的真实档位名（如 "16:9 (Widescreen)"）。
   * 有就只在这里面挑；没有就退回内置标准档位名。见 fetchEnumOptions。
   */
  aspectChoices?: string[];
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ComfyUiGeneratedImage {
  /** 可直接放进 <img src> 的地址 */
  url: string;
  filename: string;
  subfolder: string;
  type: string;
}

export class ComfyUiError extends Error {
  readonly code:
    | 'invalid-url'
    | 'unreachable'
    | 'cors'
    | 'invalid-workflow'
    | 'invalid-node'
    | 'execution-failed'
    | 'timeout'
    | 'aborted'
    | 'no-output';

  constructor(code: ComfyUiError['code'], message: string) {
    super(message);
    this.name = 'ComfyUiError';
    this.code = code;
  }
}

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/** 把玩家填的地址补全成规范形式，去掉结尾斜杠 */
export function normalizeComfyUiBaseUrl(raw: string | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

function isNodeRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNodeInputs(node: Record<string, unknown>): Record<string, unknown> {
  const inputs = node.inputs;
  return isNodeRecord(inputs) ? inputs : {};
}

/** 节点的上游引用形如 ["6", 0] */
function readNodeRef(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0];
  return typeof first === 'string' || typeof first === 'number' ? String(first) : null;
}

/**
 * 节点里能装提示词的字段，按优先级排。
 * 不再死认 text 一个名字：SDXL 用 text_g / text_l，通配符节点用 wildcard_text；
 * Qwen Image 2.1 的编码器用 prompt / negative_prompt。
 */
const PROMPT_FIELD_PRIORITY = ['text', 'text_g', 'text_l', 'prompt', 'wildcard_text', 'populated_text'];

/** 负向提示词用的字段名，正向的搜不到时用它兜底 */
const NEGATIVE_FIELD_PRIORITY = ['negative_prompt', 'negative_text', 'neg_prompt', 'uc'];

/** 囤提示词专用的节点：字段名叫 value，但装的就是提示词 */
const TEXT_PRIMITIVE_TYPES = new Set(['PrimitiveString', 'PrimitiveStringMultiline', 'StringLiteral']);

/** 身上只有比例、没有宽高的「分辨率选择器」类节点 */
function isAspectSizeNode(classType: string): boolean {
  return /resolution|aspect/i.test(classType);
}

/** 分辨率选择器常见的比例 → 宽高比（只用来挑最接近的比例，不问名字） */
const ASPECT_RATIO_LABELS: { ratio: number }[] = [
  { ratio: 1 },
  { ratio: 16 / 9 },
  { ratio: 9 / 16 },
  { ratio: 4 / 3 },
  { ratio: 3 / 4 },
  { ratio: 3 / 2 },
  { ratio: 2 / 3 },
  { ratio: 21 / 9 },
  { ratio: 9 / 21 },
];

/**
 * 连不上 ComfyUI 时的兜底档位名。
 * 🔴 这些名字必须与常见分辨率节点（如 ComfyUI-essentials 的 ResolutionSelector）的枚举表一字不差，
 * 否则写进去等于没写 —— 选择器算不出宽高，空 latent 拿不到尺寸，整条推理断掉，
 * 而 ComfyUI 仍报「执行成功」，保存节点却无图可存。能连上时应优先用 fetchEnumOptions 问真实选项。
 */
const FALLBACK_ASPECT_LABELS: string[] = [
  '1:1 (Square)',
  '16:9 (Widescreen)',
  '9:16 (Portrait Widescreen)',
  '4:3 (Standard)',
  '3:4 (Portrait Standard)',
  '3:2 (Photo)',
  '2:3 (Portrait Photo)',
  '21:9 (Ultrawide)',
  '9:21 (Portrait Ultrawide)',
];

/**
 * 把「宽 × 高」换成分辨率选择器的档位。
 *
 * 🔴 档位名是节点定义的**枚举表**，不是自由文本。自己拼字符串（比如把 "1:1 (Square)"
 * 改成 "16:9 (Ultrawide)"）看着像对的，实际对不上表项，选择器算不出宽高 →
 * 空 latent 拿不到尺寸 → 整条推理断掉 → 保存节点没东西可存，ComfyUI 却报「执行成功」。
 *
 * 所以只在**候选档位表**里挑：优先用 ComfyUI 现问来的真实选项（见 fetchResolutionChoices），
 * 问不到时才用内置的标准档位名。挑法只认比例数字，括号里写什么都不影响。
 */
function aspectRatioLabelFor(width: number, height: number, choices?: string[]): string | null {
  if (!(width > 0) || !(height > 0)) return null;
  const target = width / height;

  // 有真实选项就用真实的：从档位名里抠出 "16:9" 这种比例
  if (choices && choices.length > 0) {
    let best: { option: string; ratio: number } | null = null;
    for (const option of choices) {
      const ratio = parseAspectRatio(option);
      if (ratio === null) continue;
      if (!best || Math.abs(ratio - target) < Math.abs(best.ratio - target)) {
        best = { option, ratio };
      }
    }
    if (best && Math.abs(best.ratio - target) / target <= 0.12) {
      return best.option;
    }
    return null;
  }

  // 没连上 ComfyUI：退回内置标准档位名（必须与常见包的表项一字不差）
  let best: { ratio: number; index: number } | null = null;
  ASPECT_RATIO_LABELS.forEach((entry, index) => {
    if (!best || Math.abs(entry.ratio - target) < Math.abs(best.ratio - target)) {
      best = { ratio: entry.ratio, index };
    }
  });
  if (!best) return null;
  const picked = best as { ratio: number; index: number };
  if (Math.abs(picked.ratio - target) / target > 0.08) return null;
  return FALLBACK_ASPECT_LABELS[picked.index] ?? null;
}

/** 从档位名里抠出宽高比："16:9 (Widescreen)" → 1.777…；认不出返回 null */
function parseAspectRatio(label: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*[:：x×*]\s*(\d+(?:\.\d+)?)/i.exec(label);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w > 0 && h > 0) return w / h;
  }
  // 没有比例数字的（"Square" 之类）就按名字认
  if (/square|方/i.test(label)) return 1;
  return null;
}

/** 问 ComfyUI 要某个节点的枚举选项；拿不到就返回 null（出图时退回内置表） */
export async function fetchEnumOptions(
  baseUrl: string,
  nodeType: string,
  field: string,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const normalized = normalizeComfyUiBaseUrl(baseUrl);
  if (!normalized || !nodeType) return null;

  try {
    const response = await fetch(`${normalized}/object_info/${encodeURIComponent(nodeType)}`, { signal });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    if (!isNodeRecord(payload)) return null;

    const info = payload[nodeType];
    if (!isNodeRecord(info) || !isNodeRecord(info.input)) return null;

    for (const bucket of ['required', 'optional']) {
      const group = info.input[bucket];
      if (!isNodeRecord(group)) continue;
      const spec = group[field];
      if (!Array.isArray(spec) || spec.length === 0) continue;
      // 老写法：直接就是选项数组
      if (Array.isArray(spec[0])) {
        return (spec[0] as unknown[]).filter((item): item is string => typeof item === 'string');
      }
      // 新写法：["COMBO", { options: [...] }]
      const options = isNodeRecord(spec[1]) ? spec[1].options : null;
      if (Array.isArray(options)) {
        return options.filter((item): item is string => typeof item === 'string');
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** 把目标宽高折成「比例档位 + 百万像素」，给分辨率选择器用 */
function applyAspectSize(
  workflow: Record<string, unknown>,
  nodeIds: string[],
  width: number,
  height: number,
  choices?: string[],
): boolean {
  const label = aspectRatioLabelFor(width, height, choices);
  if (!label) return false;

  let touched = false;
  nodeIds.forEach(id => {
    const node = workflow[id];
    if (!isNodeRecord(node)) return;
    const inputs = node.inputs;
    if (!isNodeRecord(inputs)) return;

    // 🔴 整个档位名原样替换，绝不保留原括号后缀 —— 后缀和比例是配对的，换了比例后缀就错了
    if (typeof inputs.aspect_ratio === 'string') {
      inputs.aspect_ratio = label;
      touched = true;
    }
    if (typeof inputs.megapixels === 'number') {
      const mega = Number(((width * height) / 1_000_000).toFixed(2));
      if (mega > 0) {
        inputs.megapixels = mega;
        touched = true;
      }
    }
  });
  return touched;
}

/** 这个字段现在是不是一条上游连线：["9", 0] */
function isNodeRefValue(value: unknown, workflow: Record<string, unknown>): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const refId = readNodeRef(value);
  return refId !== null && isNodeRecord(workflow[refId]);
}

/**
 * 切换 / 分流节点不是提示词节点。
 *
 * Qwen Image 2.1 那类工作流里，切换节点的「关」那一路本身就是一段提示词字符串，
 * 会被误当成可写口 —— 结果玩家手选它、提示词确实写进去了，但整条增强器支路被绕过，
 * 看着「生效了」其实全看开关脸色。
 *
 * 🔴 只在它**没有明确的提示词字段**时才排除：类名带 switch/select 之类、
 * 或者身上有 on_true / on_false 两个口 —— 这类节点的字符串口是「走哪一路」，不是提示词。
 * 万一某个老工作流的切换节点真的用 text / prompt 装词，照常保留，不误伤。
 */
function isSwitchNode(node: Record<string, unknown>): boolean {
  const inputs = readNodeInputs(node);
  const hasExplicitPromptField = PROMPT_FIELD_PRIORITY.some(field => typeof inputs[field] === 'string');
  if (hasExplicitPromptField) return false;

  const classType = typeof node.class_type === 'string' ? node.class_type : '';
  if (/switch|select|toggle|router|branch/i.test(classType)) return true;
  // 类名看不出来的，靠「on_true / on_false 两个口」认
  return 'on_true' in inputs && 'on_false' in inputs;
}

/** 读玩家给节点起的标题：API 格式放在 _meta.title，界面格式放在 title */
function readNodeTitle(node: Record<string, unknown>): string {
  const meta = node._meta;
  if (isNodeRecord(meta) && typeof meta.title === 'string') return meta.title.trim();
  if (typeof node.title === 'string') return node.title.trim();
  return '';
}

/** 标题比对前先抹平大小写与分隔符，这样 Positive Prompt / positive_prompt 都算 */
function normalizeNodeTitle(title: string): string {
  return title.toLowerCase().replace(/[\s_-]+/g, '');
}

/** 玩家把节点标题改成这两个名字，就能被自动认出来 */
const POSITIVE_TITLE_ALIASES = new Set(['positiveprompt', 'positive']);
const NEGATIVE_TITLE_ALIASES = new Set(['negativeprompt', 'negative']);

function hasTitleAlias(node: Record<string, unknown>, aliases: Set<string>): boolean {
  const title = normalizeNodeTitle(readNodeTitle(node));
  return title !== '' && aliases.has(title);
}

/**
 * 这些字段装的是文件名/配置，不是提示词。
 * 只在「白名单没命中、靠唯一文字字段兜底」时用来排除，避免把加载器节点当成提示词节点。
 */
/** 这些字段装的是配置/参数，不是提示词：靠唯一文字字段兜底时用来排除 */
const NON_PROMPT_FIELD_PATTERN =
  /(name|path|file|prefix|image|url|type|mode|device|method|dtype|precision|crop|format|language|scheduler|sampler|sigmas?|seeds?|steps|cfg|scale|ratio|megapixels|resolution|width|height|size|length|model|clip|vae|lora)$/i;

/**
 * 节点里有没有可写入的提示词字段；有的话返回字段名。
 *
 * 🔴 字段名对得上（text / prompt / text_g …）就算可写，**不管它现在是文字还是连线**。
 * Qwen Image 2.1 那类工作流里，编码器的 prompt 口常年被「提示词增强器 / 切换节点」
 * 的连线占着，值不是字符串 —— 只看值是不是字符串的话，整个工作流会被判成「没有能填提示词
 * 的节点」。真写的时候会把那根连线拆掉换成文字（见 applyPromptToNode）。
 */
function findPromptField(node: Record<string, unknown>): string | null {
  return findPromptFieldIn(node, {});
}

function findPromptFieldIn(
  node: Record<string, unknown>,
  workflow: Record<string, unknown>,
): string | null {
  const inputs = readNodeInputs(node);

  // 第一优先：字段名对得上就是它（连线占着也算）
  for (const field of PROMPT_FIELD_PRIORITY) {
    if (typeof inputs[field] === 'string') return field;
    if (field in inputs && (isNodeRefValue(inputs[field], workflow) || inputs[field] === null)) {
      return field;
    }
  }

  // 兜底一：囤提示词的纯文本节点，字段名就叫 value
  const classType = typeof node.class_type === 'string' ? node.class_type : '';
  if (TEXT_PRIMITIVE_TYPES.has(classType) && typeof inputs.value === 'string') {
    return 'value';
  }

  // 兜底二：字段名很冷门时退一步 —— 整个节点只有一个文字字段、且它不像文件名/配置
  const stringFields = Object.keys(inputs).filter(key => typeof inputs[key] === 'string');
  if (stringFields.length === 1 && !NON_PROMPT_FIELD_PATTERN.test(stringFields[0])) {
    return stringFields[0];
  }
  return null;
}

/** 找负向提示词字段：名字对得上就用（连线占着也算） */
function findNegativeField(node: Record<string, unknown>, workflow: Record<string, unknown>): string | null {
  const inputs = readNodeInputs(node);
  for (const field of NEGATIVE_FIELD_PRIORITY) {
    if (typeof inputs[field] === 'string') return field;
    if (field in inputs && isNodeRefValue(inputs[field], workflow)) return field;
  }
  return null;
}

function findUpstreamTextNode(
  workflow: Record<string, unknown>,
  startNodeId: string,
  visited: Set<string>,
): string | null {
  if (visited.has(startNodeId)) return null;
  visited.add(startNodeId);

  const node = workflow[startNodeId];
  if (!isNodeRecord(node)) return null;

  // 认字段不再死认 text：SDXL 的 text_g、通配符节点的 wildcard_text 都算
  if (findPromptField(node)) {
    return startNodeId;
  }

  const inputs = readNodeInputs(node);

  for (const value of Object.values(inputs)) {
    const refId = readNodeRef(value);
    if (!refId) continue;
    const found = findUpstreamTextNode(workflow, refId, visited);
    if (found) return found;
  }

  return null;
}

/** 界面格式里这些节点不参与执行，转换时丢掉 */
const SKIP_UI_NODE_TYPES = new Set(['Note', 'MarkdownNote', 'Reroute']);

/** 前端会给带 control_after_generate 的整数字段额外插一个下拉，转换时要跳过它 */
const CONTROL_AFTER_GENERATE_VALUES = new Set(['fixed', 'randomize', 'increment', 'decrement']);

export type ComfyUiWorkflowFormat = 'api' | 'ui' | 'invalid';

/** 判断玩家粘的是「导出（API 格式）」还是 ComfyUI 界面里直接保存的那种 */
export function detectComfyWorkflowFormat(rawJson: string): ComfyUiWorkflowFormat {
  const trimmed = (rawJson || '').trim();
  if (!trimmed) return 'invalid';

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return 'invalid';
  }
  if (!isNodeRecord(parsed)) return 'invalid';

  // 界面格式的特征：带 nodes 与 links 两个数组
  if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
    return 'ui';
  }

  // API 格式的特征：每个键都是 { class_type, inputs }
  const entries = Object.values(parsed);
  if (entries.length > 0 && entries.every(entry => isNodeRecord(entry) && typeof entry.class_type === 'string')) {
    return 'api';
  }

  return 'invalid';
}

function readControlAfterGenerate(info: Record<string, unknown>, fieldName: string): boolean {
  const input = info.input;
  if (!isNodeRecord(input)) return false;

  for (const bucket of [input.required, input.optional]) {
    if (!isNodeRecord(bucket)) continue;
    const spec = bucket[fieldName];
    if (Array.isArray(spec) && spec.length > 1 && isNodeRecord(spec[1])) {
      return Boolean(spec[1].control_after_generate);
    }
  }
  return false;
}

/**
 * 把 ComfyUI 界面格式的工作流转成 API 格式。
 * 需要节点定义（/object_info）才能把界面上的参数按正确顺序填进字段。
 */
export function convertUiWorkflowToApi(
  uiWorkflow: unknown,
  objectInfo: Record<string, unknown>,
): { ok: true; workflow: Record<string, unknown> } | { ok: false; error: string } {
  if (!isNodeRecord(uiWorkflow) || !Array.isArray(uiWorkflow.nodes)) {
    return { ok: false, error: 'workflow-invalid-json' };
  }

  // link id -> [上游节点 id, 输出槽位]
  const linksById = new Map<number, [string, number]>();
  if (Array.isArray(uiWorkflow.links)) {
    uiWorkflow.links.forEach(entry => {
      if (!Array.isArray(entry) || entry.length < 3) return;
      const linkId = entry[0];
      if (typeof linkId !== 'number') return;
      linksById.set(linkId, [String(entry[1]), typeof entry[2] === 'number' ? entry[2] : 0]);
    });
  }

  const api: Record<string, unknown> = {};
  const unknownTypes: string[] = [];

  uiWorkflow.nodes.forEach(rawNode => {
    if (!isNodeRecord(rawNode)) return;
    const nodeType = typeof rawNode.type === 'string' ? rawNode.type : '';
    if (!nodeType || SKIP_UI_NODE_TYPES.has(nodeType)) return;

    const info = objectInfo[nodeType];
    if (!isNodeRecord(info)) {
      unknownTypes.push(nodeType);
      return;
    }

    const inputs: Record<string, unknown> = {};
    const widgets = Array.isArray(rawNode.widgets_values) ? [...rawNode.widgets_values] : [];
    let cursor = 0;

    const uiInputs = Array.isArray(rawNode.inputs) ? rawNode.inputs : [];
    uiInputs.forEach(rawInput => {
      if (!isNodeRecord(rawInput)) return;
      const name = typeof rawInput.name === 'string' ? rawInput.name : '';
      if (!name) return;

      // 接了线的走连线，没接线的按顺序吃 widgets_values
      if (typeof rawInput.link === 'number') {
        const ref = linksById.get(rawInput.link);
        if (ref) inputs[name] = ref;
        return;
      }

      if (cursor >= widgets.length) return;
      const value = widgets[cursor];
      cursor += 1;

      if (readControlAfterGenerate(info, name) && typeof value === 'number') {
        const next = widgets[cursor];
        if (typeof next === 'string' && CONTROL_AFTER_GENERATE_VALUES.has(next)) {
          cursor += 1;
        }
      }

      inputs[name] = value;
    });

    // 把玩家改过的节点标题带过去，否则转成 API 格式后就没法按标题认节点了
    const nodeTitle = typeof rawNode.title === 'string' ? rawNode.title.trim() : '';
    api[String(rawNode.id)] = nodeTitle
      ? { class_type: nodeType, inputs, _meta: { title: nodeTitle } }
      : { class_type: nodeType, inputs };
  });

  if (Object.keys(api).length === 0) {
    return { ok: false, error: unknownTypes.length > 0 ? 'workflow-unknown-nodes' : 'workflow-invalid-json' };
  }

  return { ok: true, workflow: api };
}

/** 读节点定义表，界面格式转 API 格式时需要 */
export async function fetchComfyUiObjectInfo(baseUrl: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const normalized = normalizeComfyUiBaseUrl(baseUrl);
  if (!normalized) {
    throw new ComfyUiError('invalid-url', 'empty-url');
  }

  let response: Response;
  try {
    response = await fetch(`${normalized}/object_info`, { method: 'GET', signal });
  } catch (error) {
    throw toComfyUiError(error);
  }

  if (!response.ok) {
    throw new ComfyUiError('unreachable', await readErrorMessage(response));
  }

  const payload = (await response.json()) as unknown;
  if (!isNodeRecord(payload)) {
    throw new ComfyUiError('unreachable', 'invalid-object-info');
  }
  return payload;
}

/** 空潜空间类节点才是真正的画布尺寸来源，避免误改放大节点 */
function isCanvasSizeNode(classType: string): boolean {
  return /empty/i.test(classType) && /latent/i.test(classType);
}

export function analyzeComfyWorkflow(rawJson: string): ComfyUiWorkflowAnalysis {
  const empty: ComfyUiWorkflowAnalysis = {
    ok: false,
    textNodes: [],
    positiveNodeId: '',
    positiveDetected: false,
    negativeNodeId: '',
    sizeNodeIds: [],
    seedNodes: [],
    hasSaveImage: false,
  };

  const trimmed = (rawJson || '').trim();
  if (!trimmed) {
    return { ...empty, error: 'workflow-empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ...empty, error: 'workflow-invalid-json' };
  }

  if (!isNodeRecord(parsed)) {
    return { ...empty, error: 'workflow-invalid-json' };
  }

  const workflow = parsed;
  const nodeIds = Object.keys(workflow).filter(id => isNodeRecord(workflow[id]));
  if (nodeIds.length === 0) {
    return { ...empty, error: 'workflow-invalid-json' };
  }

  const textNodes: ComfyUiWorkflowNode[] = [];
  const writableNodeIds: string[] = [];
  const sizeNodeIds: string[] = [];
  const seedNodes: { id: string; field: string }[] = [];
  const samplers: string[] = [];
  const titledPositiveIds: string[] = [];
  const titledNegativeIds: string[] = [];
  let hasSaveImage = false;

  nodeIds.forEach(id => {
    const node = workflow[id] as Record<string, unknown>;
    const classType = typeof node.class_type === 'string' ? node.class_type : '';
    const inputs = readNodeInputs(node);
    const title = readNodeTitle(node);
    // 切换节点身上那段字符串是「开关走哪一路」，不是提示词 —— 不认它，免得玩家手选错
    const promptField = isSwitchNode(node) ? null : findPromptField(node);

    if (/saveimage/i.test(classType)) {
      hasSaveImage = true;
    }

    if (promptField) {
      writableNodeIds.push(id);
    }

    // 界面上区分节点用：改过标题就显示标题，否则显示节点里已有的文字
    const rawText = promptField ? inputs[promptField] : '';
    const textPreview = typeof rawText === 'string' ? rawText.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    const showTitle = title !== '' && title !== classType;

    textNodes.push({
      id,
      classType,
      title,
      preview: showTitle ? title : textPreview,
      writable: Boolean(promptField),
    });

    // 标题对上了、而且这个节点确实能装提示词，才算数
    if (promptField && hasTitleAlias(node, POSITIVE_TITLE_ALIASES)) {
      titledPositiveIds.push(id);
    } else if (promptField && hasTitleAlias(node, NEGATIVE_TITLE_ALIASES)) {
      titledNegativeIds.push(id);
    }

    // 宽高被上游连线占着也算尺寸节点 —— 那是「分辨率选择器」在管，改的时候得反过去写它
    const hasWidth = typeof inputs.width === 'number' || isNodeRefValue(inputs.width, workflow);
    const hasHeight = typeof inputs.height === 'number' || isNodeRefValue(inputs.height, workflow);
    if (hasWidth && hasHeight) {
      if (isCanvasSizeNode(classType)) {
        sizeNodeIds.unshift(id);
      } else {
        sizeNodeIds.push(id);
      }
    }
    // 只给比例、不给宽高的「分辨率选择器」，也是改尺寸时要动的节点
    if (!(hasWidth && hasHeight) && isAspectSizeNode(classType)) {
      if (typeof inputs.aspect_ratio === 'string' || typeof inputs.megapixels === 'number') {
        sizeNodeIds.push(id);
      }
    }

    if (typeof inputs.seed === 'number') {
      seedNodes.push({ id, field: 'seed' });
    } else if (typeof inputs.noise_seed === 'number') {
      seedNodes.push({ id, field: 'noise_seed' });
    }

    if (inputs.positive !== undefined && inputs.negative !== undefined) {
      samplers.push(id);
    }
  });

  // 让「能装提示词的节点」排前面，方便手动指定
  textNodes.sort((a, b) => Number(b.writable) - Number(a.writable));

  // 第一优先：玩家把节点标题改成了 positive prompt / negative prompt
  let positiveNodeId = titledPositiveIds[0] ?? '';
  let negativeNodeId = titledNegativeIds[0] ?? '';
  // 标题命中或连线命中才算「真认出来了」；退化成第一个节点只是猜，界面要说清楚
  let positiveDetected = positiveNodeId !== '';

  // 第二优先：顺着采样器的正/负输入往上找文本节点
  if (!positiveNodeId || !negativeNodeId) {
    for (const samplerId of samplers) {
      const inputs = readNodeInputs(workflow[samplerId] as Record<string, unknown>);
      const positiveRef = readNodeRef(inputs.positive);
      const negativeRef = readNodeRef(inputs.negative);

      if (!positiveNodeId && positiveRef) {
        const found = findUpstreamTextNode(workflow, positiveRef, new Set());
        if (found) {
          positiveNodeId = found;
          positiveDetected = true;
        }
      }
      if (!negativeNodeId && negativeRef) {
        negativeNodeId = findUpstreamTextNode(workflow, negativeRef, new Set()) || '';
      }
      if (positiveNodeId && negativeNodeId) break;
    }
  }

  /**
   * 第三优先：正负词出在同一个节点的两个口上。
   * Qwen Image 2.1 的编码器就是这种：第 0 口正向、第 1 口负向（同一个 prompt /
   * negative_prompt 节点），顺连线往上找只会撞进「预览值」那种中转节点，找不到词。
   * 所以先看正向节点自己身上有没有负向字段，有就是它。
   */
  if (!negativeNodeId && positiveNodeId) {
    const positiveNode = workflow[positiveNodeId];
    if (isNodeRecord(positiveNode) && findNegativeField(positiveNode, workflow)) {
      negativeNodeId = positiveNodeId;
    }
  }

  // 兜底：还是认不出就取第一个能装提示词的节点，至少给玩家一个起点
  if (!positiveNodeId) {
    positiveNodeId = writableNodeIds[0] ?? '';
  }
  // 正负落在同一个节点上不算冲突（两词各占一个口），只有这个节点没有负向字段时才清掉
  if (negativeNodeId === positiveNodeId) {
    const sharedNode = workflow[positiveNodeId];
    if (!isNodeRecord(sharedNode) || !findNegativeField(sharedNode, workflow)) {
      negativeNodeId = '';
    }
  }

  return {
    ok: true,
    textNodes,
    positiveNodeId,
    positiveDetected,
    negativeNodeId,
    sizeNodeIds,
    seedNodes,
    hasSaveImage,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return `HTTP ${response.status}`;
    try {
      const payload = JSON.parse(text) as {
        error?: { message?: string; details?: string };
        node_errors?: Record<string, { errors?: { message?: string }[] }>;
      };
      const parts: string[] = [];
      if (payload.error?.message) parts.push(payload.error.message);
      if (payload.error?.details) parts.push(payload.error.details);
      if (payload.node_errors) {
        Object.entries(payload.node_errors).forEach(([nodeId, info]) => {
          info?.errors?.forEach(err => {
            if (err?.message) parts.push(`节点 ${nodeId}: ${err.message}`);
          });
        });
      }
      if (parts.length > 0) return parts.join(' | ');
    } catch {
      return text.slice(0, 200);
    }
    return text.slice(0, 200);
  } catch {
    return `HTTP ${response.status}`;
  }
}

function toComfyUiError(error: unknown): ComfyUiError {
  if (error instanceof ComfyUiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ComfyUiError('aborted', 'aborted');
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|ERR_FAILED/i.test(message)) {
    return new ComfyUiError('unreachable', message);
  }
  return new ComfyUiError('unreachable', message);
}

/** 读服务器信息，用来做「测试连接」 */
export async function fetchComfyUiServerInfo(baseUrl: string, signal?: AbortSignal): Promise<ComfyUiServerInfo> {
  const normalized = normalizeComfyUiBaseUrl(baseUrl);
  if (!normalized) {
    throw new ComfyUiError('invalid-url', 'empty-url');
  }

  let response: Response;
  try {
    response = await fetch(`${normalized}/system_stats`, { method: 'GET', signal });
  } catch (error) {
    throw toComfyUiError(error);
  }

  if (!response.ok) {
    throw new ComfyUiError('unreachable', await readErrorMessage(response));
  }

  const payload = (await response.json()) as {
    system?: { comfyui_version?: string };
    devices?: { name?: string; vram_total?: number }[];
  };

  const device = payload.devices?.[0];
  return {
    comfyuiVersion: payload.system?.comfyui_version || 'unknown',
    deviceName: device?.name || 'unknown',
    vramTotalMb: Math.round((device?.vram_total ?? 0) / 1024 / 1024),
  };
}

/**
 * 把提示词写进指定节点。
 *
 * 🔴 那个口如果被上游连线占着（值形如 ["459:472", 0]），只把文字塞进去是不够的 ——
 * ComfyUI 认的是连线，写进去的数字/字符串会被忽略。所以要先把连线拆掉、改成直写文字。
 */
function applyPromptToNode(
  workflow: Record<string, unknown>,
  nodeId: string,
  text: string,
  negative = false,
): boolean {
  const node = workflow[nodeId];
  if (!isNodeRecord(node)) return false;
  const inputs = node.inputs;
  if (!isNodeRecord(inputs)) return false;

  const field = negative ? findNegativeField(node, workflow) : findPromptFieldIn(node, workflow);
  if (!field) return false;

  inputs[field] = text;
  return true;
}

function applySize(
  workflow: Record<string, unknown>,
  sizeNodeIds: string[],
  width: number,
  height: number,
  aspectChoices?: string[],
): void {
  const aspectNodeIds: string[] = [];
  sizeNodeIds.forEach(id => {
    const node = workflow[id];
    if (!isNodeRecord(node)) return;
    const inputs = node.inputs;
    if (!isNodeRecord(inputs)) return;
    // 宽高被上游连线占着时改不动 —— 那是「分辨率选择器」在管，换个办法写
    const widthLinked = isNodeRefValue(inputs.width, workflow);
    const heightLinked = isNodeRefValue(inputs.height, workflow);
    if (widthLinked || heightLinked) {
      aspectNodeIds.push(id);
      return;
    }
    if (typeof inputs.width === 'number') inputs.width = width;
    if (typeof inputs.height === 'number') inputs.height = height;
  });

  // 宽高由选择器决定时，反过来去写选择器的「比例 + 百万像素」
  if (aspectNodeIds.length > 0) {
    const selectorIds = Object.keys(workflow).filter(id => {
      const node = workflow[id];
      if (!isNodeRecord(node)) return false;
      const classType = typeof node.class_type === 'string' ? node.class_type : '';
      return isAspectSizeNode(classType);
    });
    applyAspectSize(workflow, selectorIds, width, height, aspectChoices);
    applyAspectSize(workflow, aspectNodeIds, width, height, aspectChoices);
  }
}

/** 种子取值上限：ComfyUI 的种子节点普遍按 32 位无符号整数处理 */
export const COMFY_SEED_MAX = 4294967295;

/** 摇一个随机种子（0 ~ COMFY_SEED_MAX） */
export function createRandomComfySeed(): number {
  return Math.floor(Math.random() * (COMFY_SEED_MAX + 1));
}

/** 固定种子：合法就用，留空 / 非法兜底随机一个 */
function resolveFixedSeed(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return createRandomComfySeed();
}

/** 把种子写进所有种子节点 */
function applySeed(
  workflow: Record<string, unknown>,
  seedNodes: { id: string; field: string }[],
  seed: number,
): void {
  seedNodes.forEach(({ id, field }) => {
    const node = workflow[id];
    if (!isNodeRecord(node)) return;
    const inputs = node.inputs;
    if (!isNodeRecord(inputs)) return;
    if (typeof inputs[field] === 'number') inputs[field] = seed;
  });
}

function extractImages(historyEntry: unknown, baseUrl: string): ComfyUiGeneratedImage[] {
  if (!isNodeRecord(historyEntry)) return [];
  const outputs = historyEntry.outputs;
  if (!isNodeRecord(outputs)) return [];

  const images: ComfyUiGeneratedImage[] = [];
  Object.values(outputs).forEach(output => {
    if (!isNodeRecord(output)) return;
    const list = output.images;
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      if (!isNodeRecord(item)) return;
      const filename = typeof item.filename === 'string' ? item.filename : '';
      if (!filename) return;
      const subfolder = typeof item.subfolder === 'string' ? item.subfolder : '';
      const type = typeof item.type === 'string' ? item.type : 'output';
      const params = new URLSearchParams({ filename, subfolder, type });
      images.push({ url: `${baseUrl}/view?${params.toString()}`, filename, subfolder, type });
    });
  });

  return images;
}

/**
 * 跑一次工作流，返回生成的图片。
 * 提交前会把提示词写进指定节点，按需覆盖尺寸与随机种子。
 */
export async function generateComfyUiImage(options: ComfyUiGenerateOptions): Promise<ComfyUiGeneratedImage[]> {
  const baseUrl = normalizeComfyUiBaseUrl(options.baseUrl);
  if (!baseUrl) {
    throw new ComfyUiError('invalid-url', 'empty-url');
  }

  const workflow = JSON.parse(JSON.stringify(options.workflow)) as Record<string, unknown>;

  if (!applyPromptToNode(workflow, options.positiveNodeId, options.prompt)) {
    throw new ComfyUiError('invalid-node', options.positiveNodeId);
  }

  if (options.negativeNodeId && typeof options.negativePrompt === 'string') {
    // 负向词优先走「负向字段」；节点里没这个字段才退回正向口
    if (!applyPromptToNode(workflow, options.negativeNodeId, options.negativePrompt, true)) {
      applyPromptToNode(workflow, options.negativeNodeId, options.negativePrompt);
    }
  }

  if (
    typeof options.width === 'number' &&
    typeof options.height === 'number' &&
    options.width > 0 &&
    options.height > 0
  ) {
    const sizeNodeIds =
      options.sizeNodeIds && options.sizeNodeIds.length > 0
        ? options.sizeNodeIds
        : analyzeComfyWorkflow(JSON.stringify(workflow)).sizeNodeIds;
    applySize(workflow, sizeNodeIds, options.width, options.height, options.aspectChoices);
  }

  // 种子完全由前端给：开着开关就每轮随机，关着就用玩家填的固定值、留空则兜底随机一个。
  // 🔴 不再沿用工作流里原本写死的种子 —— 那个值在本程序里不认。
  const seedNodes =
    options.seedNodes && options.seedNodes.length > 0
      ? options.seedNodes
      : analyzeComfyWorkflow(JSON.stringify(workflow)).seedNodes;
  applySeed(workflow, seedNodes, options.randomSeed ? createRandomComfySeed() : resolveFixedSeed(options.fixedSeed));

  let submitResponse: Response;
  try {
    submitResponse = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: `myriad-${Date.now()}` }),
      signal: options.signal,
    });
  } catch (error) {
    throw toComfyUiError(error);
  }

  if (!submitResponse.ok) {
    throw new ComfyUiError('execution-failed', await readErrorMessage(submitResponse));
  }

  const submitPayload = (await submitResponse.json()) as { prompt_id?: string };
  const promptId = submitPayload.prompt_id;
  if (!promptId) {
    throw new ComfyUiError('execution-failed', 'missing-prompt-id');
  }

  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new ComfyUiError('aborted', 'aborted');
    }
    if (Date.now() - startedAt > timeout) {
      throw new ComfyUiError('timeout', String(timeout));
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));

    let historyResponse: Response;
    try {
      historyResponse = await fetch(`${baseUrl}/history/${promptId}`, { signal: options.signal });
    } catch (error) {
      throw toComfyUiError(error);
    }

    if (!historyResponse.ok) {
      continue;
    }

    const history = (await historyResponse.json()) as Record<string, unknown>;
    const entry = history[promptId];
    if (!entry) continue;

    if (isNodeRecord(entry) && isNodeRecord(entry.status) && entry.status.status_str === 'error') {
      throw new ComfyUiError('execution-failed', JSON.stringify(entry.status).slice(0, 200));
    }

    const images = extractImages(entry, baseUrl);
    if (images.length > 0) {
      return images;
    }

    // 历史里已经有这条记录、但还没有图片，说明执行完却没有图像输出
    if (isNodeRecord(entry) && isNodeRecord(entry.outputs) && Object.keys(entry.outputs).length > 0) {
      throw new ComfyUiError('no-output', promptId);
    }
  }
}
