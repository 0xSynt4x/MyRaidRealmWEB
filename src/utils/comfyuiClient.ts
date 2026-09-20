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
  /** 节点里可填文字的字段值预览（用于界面上区分正向/负向） */
  preview: string;
}

export interface ComfyUiWorkflowAnalysis {
  ok: boolean;
  error?: string;
  /** 所有带 text 字段的节点，供玩家手动指定 */
  textNodes: ComfyUiWorkflowNode[];
  /** 自动认出的正向提示词节点 */
  positiveNodeId: string;
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
  /** 尺寸节点，缺省时自动推断 */
  sizeNodeIds?: string[];
  /** 种子节点，缺省时自动推断 */
  seedNodes?: { id: string; field: string }[];
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

function findUpstreamTextNode(
  workflow: Record<string, unknown>,
  startNodeId: string,
  visited: Set<string>,
): string | null {
  if (visited.has(startNodeId)) return null;
  visited.add(startNodeId);

  const node = workflow[startNodeId];
  if (!isNodeRecord(node)) return null;

  const inputs = readNodeInputs(node);
  if (typeof inputs.text === 'string') {
    return startNodeId;
  }

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

    api[String(rawNode.id)] = { class_type: nodeType, inputs };
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
  const sizeNodeIds: string[] = [];
  const seedNodes: { id: string; field: string }[] = [];
  const samplers: string[] = [];
  let hasSaveImage = false;

  nodeIds.forEach(id => {
    const node = workflow[id] as Record<string, unknown>;
    const classType = typeof node.class_type === 'string' ? node.class_type : '';
    const inputs = readNodeInputs(node);

    if (/saveimage/i.test(classType)) {
      hasSaveImage = true;
    }

    if (typeof inputs.text === 'string') {
      textNodes.push({
        id,
        classType,
        preview: inputs.text.replace(/\s+/g, ' ').slice(0, 60),
      });
    }

    if (typeof inputs.width === 'number' && typeof inputs.height === 'number') {
      if (isCanvasSizeNode(classType)) {
        sizeNodeIds.unshift(id);
      } else {
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

  if (textNodes.length === 0) {
    return { ...empty, error: 'workflow-no-text-node' };
  }

  let positiveNodeId = '';
  let negativeNodeId = '';

  for (const samplerId of samplers) {
    const inputs = readNodeInputs(workflow[samplerId] as Record<string, unknown>);
    const positiveRef = readNodeRef(inputs.positive);
    const negativeRef = readNodeRef(inputs.negative);

    if (!positiveNodeId && positiveRef) {
      positiveNodeId = findUpstreamTextNode(workflow, positiveRef, new Set()) || '';
    }
    if (!negativeNodeId && negativeRef) {
      negativeNodeId = findUpstreamTextNode(workflow, negativeRef, new Set()) || '';
    }
    if (positiveNodeId && negativeNodeId) break;
  }

  // 兜底：没有采样器或找不到连线时，退化成「第一个文本节点作正向」
  if (!positiveNodeId) {
    positiveNodeId = textNodes[0].id;
  }
  if (negativeNodeId === positiveNodeId) {
    negativeNodeId = '';
  }

  return {
    ok: true,
    textNodes,
    positiveNodeId,
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

function applyPromptToNode(workflow: Record<string, unknown>, nodeId: string, text: string): boolean {
  const node = workflow[nodeId];
  if (!isNodeRecord(node)) return false;
  const inputs = node.inputs;
  if (!isNodeRecord(inputs)) return false;
  if (typeof inputs.text !== 'string') return false;
  inputs.text = text;
  return true;
}

function applySize(workflow: Record<string, unknown>, sizeNodeIds: string[], width: number, height: number): void {
  sizeNodeIds.forEach(id => {
    const node = workflow[id];
    if (!isNodeRecord(node)) return;
    const inputs = node.inputs;
    if (!isNodeRecord(inputs)) return;
    if (typeof inputs.width === 'number') inputs.width = width;
    if (typeof inputs.height === 'number') inputs.height = height;
  });
}

function applyRandomSeed(workflow: Record<string, unknown>, seedNodes: { id: string; field: string }[]): void {
  const seed = Math.floor(Math.random() * 4294967295);
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
    applyPromptToNode(workflow, options.negativeNodeId, options.negativePrompt);
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
    applySize(workflow, sizeNodeIds, options.width, options.height);
  }

  if (options.randomSeed) {
    const seedNodes =
      options.seedNodes && options.seedNodes.length > 0
        ? options.seedNodes
        : analyzeComfyWorkflow(JSON.stringify(workflow)).seedNodes;
    applyRandomSeed(workflow, seedNodes);
  }

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
