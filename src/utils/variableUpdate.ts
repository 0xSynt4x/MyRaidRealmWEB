import { z } from 'zod';
import { Schema } from '../../schema/schema';

export type StandaloneStatData = ReturnType<typeof Schema.parse>;

const JsonPatchOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('replace'),
    path: z.string().min(1),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal('delta'),
    path: z.string().min(1),
    value: z.number(),
  }),
  z.object({
    op: z.literal('insert'),
    path: z.string().min(1),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal('remove'),
    path: z.string().min(1),
  }),
  z.object({
    op: z.literal('move'),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
]);

const JsonPatchSchema = z.array(JsonPatchOperationSchema);

export type JsonPatchOperation = z.infer<typeof JsonPatchOperationSchema>;

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function decodeJsonPointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(path: string): string[] {
  if (!path.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer: ${path}`);
  }

  if (path === '/') {
    return [''];
  }

  return path.slice(1).split('/').map(decodeJsonPointerToken);
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getContainerChild(container: unknown, token: string): unknown {
  if (Array.isArray(container)) {
    if (token === '-') {
      return undefined;
    }

    const index = Number(token);
    if (!Number.isInteger(index) || index < 0 || index >= container.length) {
      return undefined;
    }
    return container[index];
  }

  if (isObjectLike(container)) {
    return container[token];
  }

  return undefined;
}

function resolveParentContainer(root: unknown, tokens: string[]): { container: unknown; finalToken: string } {
  if (tokens.length === 0) {
    throw new Error('Root path replacement is not supported');
  }

  let container = root;
  for (const token of tokens.slice(0, -1)) {
    const nextValue = getContainerChild(container, token);
    if (nextValue === undefined) {
      throw new Error(`Parent path does not exist: /${tokens.slice(0, -1).join('/')}`);
    }
    container = nextValue;
  }

  return {
    container,
    finalToken: tokens[tokens.length - 1],
  };
}

function getValueAtPointer(root: unknown, path: string): unknown {
  const tokens = parsePointer(path);
  let current: unknown = root;

  for (const token of tokens) {
    current = getContainerChild(current, token);
    if (current === undefined) {
      throw new Error(`Target path does not exist: ${path}`);
    }
  }

  return current;
}

function setArrayValue(array: unknown[], token: string, value: unknown): void {
  if (token === '-') {
    array.push(value);
    return;
  }

  const index = Number(token);
  if (!Number.isInteger(index) || index < 0 || index >= array.length) {
    throw new Error(`Array target index does not exist: ${token}`);
  }

  array[index] = value;
}

function insertArrayValue(array: unknown[], token: string, value: unknown): void {
  if (token === '-') {
    array.push(value);
    return;
  }

  const index = Number(token);
  if (!Number.isInteger(index) || index < 0 || index > array.length) {
    throw new Error(`Array insert index is invalid: ${token}`);
  }

  array.splice(index, 0, value);
}

function removeArrayValue(array: unknown[], token: string): unknown {
  const index = Number(token);
  if (!Number.isInteger(index) || index < 0 || index >= array.length) {
    throw new Error(`Array remove index does not exist: ${token}`);
  }

  const [removed] = array.splice(index, 1);
  return removed;
}

function setObjectValue(record: Record<string, unknown>, token: string, value: unknown): void {
  if (!(token in record)) {
    throw new Error(`Object target key does not exist: ${token}`);
  }

  record[token] = value;
}

function insertObjectValue(record: Record<string, unknown>, token: string, value: unknown): void {
  if (token in record) {
    throw new Error(`Object target key already exists: ${token}`);
  }

  record[token] = value;
}

const NPC_ARCHIVE_KEY = '人物档案';
const NPC_ID_PATTERN = /^NPC_(\d+)$/;

/**
 * 路径正好是 `/人物档案/-`：追加建人的哨兵写法。
 * 与数组追加 `/-` 是同一套语义，AI 不需要学新东西。
 */
function isNpcArchiveAppendPath(tokens: string[]): boolean {
  return tokens.length === 2 && tokens[0] === NPC_ARCHIVE_KEY && tokens[1] === '-';
}

/**
 * 路径正好是 `/人物档案/NPC_数字`：直接指向某一名人物的整张档案卡。
 * 只有这种形态才有明确的身份语义（可分配编号 / 可整体替换）。
 */
function isNpcArchiveEntryPath(tokens: string[]): boolean {
  return tokens.length === 2 && tokens[0] === NPC_ARCHIVE_KEY && NPC_ID_PATTERN.test(tokens[1]);
}

/**
 * 取当前档案中最大编号 +1 作为新编号（与前端招聘、Schema 归一化保持同一套规则）。
 */
function allocateNextNpcId(archive: Record<string, unknown>): string {
  let maxId = 0;

  for (const key of Object.keys(archive)) {
    const match = key.match(NPC_ID_PATTERN);
    if (!match) continue;

    const id = Number(match[1]);
    if (Number.isInteger(id) && id > maxId) {
      maxId = id;
    }
  }

  let nextId = maxId + 1;
  while (`NPC_${nextId}` in archive) {
    nextId += 1;
  }

  return `NPC_${nextId}`;
}

function removeObjectValue(record: Record<string, unknown>, token: string): unknown {
  if (!(token in record)) {
    throw new Error(`Object target key does not exist: ${token}`);
  }

  const removed = record[token];
  delete record[token];
  return removed;
}

function applyReplace(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'replace' }>): void {
  const tokens = parsePointer(operation.path);
  const { container, finalToken } = resolveParentContainer(root, tokens);

  if (Array.isArray(container)) {
    setArrayValue(container, finalToken, operation.value);
    return;
  }

  if (isObjectLike(container)) {
    // FALLBACK③：AI 拿一个「不存在的编号」做整体替换（它以为这人已存在），多半本意就是新建。
    // 只认「整张档案卡」这一种形态；深层字段的 replace 仍照常报错，不掩盖真正的路径错误。
    if (isNpcArchiveEntryPath(tokens) && !(finalToken in container) && isObjectLike(operation.value)) {
      console.warn(`[VariableUpdate] 人物编号 ${finalToken} 不存在，按新建处理：${operation.path}`);
      insertObjectValue(container, finalToken, operation.value);
      return;
    }

    setObjectValue(container, finalToken, operation.value);
    return;
  }

  throw new Error(`Replace target parent is not writable: ${operation.path}`);
}

function applyDelta(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'delta' }>): void {
  const currentValue = getValueAtPointer(root, operation.path);
  if (typeof currentValue !== 'number') {
    throw new Error(`Delta target is not a number: ${operation.path}`);
  }

  applyReplace(root, {
    op: 'replace',
    path: operation.path,
    value: currentValue + operation.value,
  });
}

function applyInsert(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'insert' }>): void {
  const tokens = parsePointer(operation.path);
  const { container, finalToken } = resolveParentContainer(root, tokens);

  if (Array.isArray(container)) {
    insertArrayValue(container, finalToken, operation.value);
    return;
  }

  if (isObjectLike(container)) {
    // FALLBACK②：追加语法 —— AI 不确定编号、或一次要建多人时的退路，由前端分配编号。
    // 默认写法仍是 AI 自己写编号（见下一条），这只是并行的一条备用通道。
    if (isNpcArchiveAppendPath(tokens) && isObjectLike(operation.value)) {
      const nextNpcId = allocateNextNpcId(container);
      console.warn(`[VariableUpdate] 人物档案追加建人，已分配编号 ${nextNpcId}：${operation.path}`);
      insertObjectValue(container, nextNpcId, operation.value);
      return;
    }

    // FALLBACK①：AI 自己写编号但该编号已被占用 → 改号，不让整批补丁作废
    // （连本回合其他变量更新一起丢）。仅对「人物档案/NPC_数字」且值为档案卡时生效。
    if (isNpcArchiveEntryPath(tokens) && finalToken in container && isObjectLike(operation.value)) {
      const nextNpcId = allocateNextNpcId(container);
      console.warn(
        `[VariableUpdate] 人物编号 ${finalToken} 已被占用，已自动改为 ${nextNpcId}：${operation.path}`,
      );
      insertObjectValue(container, nextNpcId, operation.value);
      return;
    }

    insertObjectValue(container, finalToken, operation.value);
    return;
  }

  throw new Error(`Insert target parent is not writable: ${operation.path}`);
}

function applyRemove(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'remove' }>): unknown {
  const { container, finalToken } = resolveParentContainer(root, parsePointer(operation.path));

  if (Array.isArray(container)) {
    return removeArrayValue(container, finalToken);
  }

  if (isObjectLike(container)) {
    return removeObjectValue(container, finalToken);
  }

  throw new Error(`Remove target parent is not writable: ${operation.path}`);
}

function applyMove(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'move' }>): void {
  const movedValue = cloneState(getValueAtPointer(root, operation.from));
  applyRemove(root, { op: 'remove', path: operation.from });
  applyInsert(root, { op: 'insert', path: operation.to, value: movedValue });
}

export interface VariableUpdateParseResult {
  patch: JsonPatchOperation[];
  patchText: string;
}

export function parseVariableUpdatePatch(patchText: string): VariableUpdateParseResult {
  const patch = JsonPatchSchema.parse(JSON.parse(patchText));
  return {
    patch,
    patchText,
  };
}

export function applyVariableUpdatePatch(
  statData: StandaloneStatData,
  patch: JsonPatchOperation[],
): StandaloneStatData {
  const nextState = cloneState(statData);

  for (const operation of patch) {
    switch (operation.op) {
      case 'replace':
        applyReplace(nextState, operation);
        break;
      case 'delta':
        applyDelta(nextState, operation);
        break;
      case 'insert':
        applyInsert(nextState, operation);
        break;
      case 'remove':
        applyRemove(nextState, operation);
        break;
      case 'move':
        applyMove(nextState, operation);
        break;
    }
  }

  return Schema.parse(nextState);
}
