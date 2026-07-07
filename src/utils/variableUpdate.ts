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

function removeObjectValue(record: Record<string, unknown>, token: string): unknown {
  if (!(token in record)) {
    throw new Error(`Object target key does not exist: ${token}`);
  }

  const removed = record[token];
  delete record[token];
  return removed;
}

function applyReplace(root: StandaloneStatData, operation: Extract<JsonPatchOperation, { op: 'replace' }>): void {
  const { container, finalToken } = resolveParentContainer(root, parsePointer(operation.path));

  if (Array.isArray(container)) {
    setArrayValue(container, finalToken, operation.value);
    return;
  }

  if (isObjectLike(container)) {
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
  const { container, finalToken } = resolveParentContainer(root, parsePointer(operation.path));

  if (Array.isArray(container)) {
    insertArrayValue(container, finalToken, operation.value);
    return;
  }

  if (isObjectLike(container)) {
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
