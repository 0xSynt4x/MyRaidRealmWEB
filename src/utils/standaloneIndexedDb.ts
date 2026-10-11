/**
 * IndexedDB 薄封装。
 *
 * 只做一件事：把原生 IndexedDB 那套事件回调 API 包成 Promise，供上层存档层使用。
 * 不引第三方库 —— 本仓的硬边界是「所有依赖打进产物、零外部运行时依赖」，
 * 而这里需要的只是 KV 读写，手写成本低于新增一个依赖。
 *
 * 设计取舍：
 * - 单个 object store 存所有 key，靠 key 前缀区分业务域。够用且省去版本迁移的复杂度。
 * - 连接只开一次，模块级缓存。开库是异步的，重复开库会拖慢每次读写。
 * - 出错统一归一化成 StorageQuotaError / StorageUnavailableError，
 *   让上层能分辨「空间不够」和「浏览器不让用」，而不是拿到一个看不懂的 DOMException。
 */

const DB_NAME = 'myraidrealm-standalone';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

/** 空间不够。上层据此提示用户清理存档。 */
export class StorageQuotaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageQuotaError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** 当前环境用不了 IndexedDB（无痕模式、隐私设置禁用等）。上层据此降级回 localStorage。 */
export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageUnavailableError';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * IndexedDB 是否可用。
 *
 * 🔴 不能只判断 `'indexedDB' in window`：Safari 无痕模式下这个属性存在，
 * 但 open() 会直接失败。真正的可用性要等 open 结果，见 getDatabase()。
 */
export function isIndexedDbSupported(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/**
 * 把各浏览器五花八门的配额报错归一成 StorageQuotaError。
 *
 * Chrome 报 QuotaExceededError，Firefox 历史上报 NS_ERROR_DOM_QUOTA_REACHED，
 * Safari 报 QuotaExceededError 但 code 是 22。只看 name 会漏。
 */
function normalizeError(error: unknown, context: string): Error {
  if (error instanceof StorageQuotaError || error instanceof StorageUnavailableError) {
    return error;
  }

  const candidate = error as { name?: string; code?: number; message?: string } | null;
  const name = candidate?.name ?? '';
  const code = candidate?.code ?? 0;
  const message = candidate?.message ?? '';

  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || /quota/i.test(message)) {
    return new StorageQuotaError(`${context}：存储空间已满`, { cause: error });
  }

  if (name === 'InvalidStateError' || name === 'UnknownError' || name === 'SecurityError') {
    return new StorageUnavailableError(`${context}：数据库当前不可用`, { cause: error });
  }

  return error instanceof Error ? error : new Error(`${context}：${String(error)}`);
}

function getDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbSupported()) {
    return Promise.reject(new StorageUnavailableError('当前环境不支持 IndexedDB'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      dbPromise = null;
      reject(normalizeError(error, '打开数据库失败'));
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // 别的标签页要升级版本时，本页主动断开，否则会把对方卡死。
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(normalizeError(request.error, '打开数据库失败'));
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new StorageUnavailableError('数据库被其他标签页占用，无法升级'));
    };
  });

  return dbPromise;
}

/** 把一次 request 包成 Promise。 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 等事务真正提交完成。只等 request 成功是不够的 —— 事务仍可能回滚。 */
function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('事务被中止'));
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const result = await promisifyRequest<T | undefined>(transaction.objectStore(STORE_NAME).get(key));
    return result === undefined ? null : result;
  } catch (error) {
    throw normalizeError(error, `读取 ${key} 失败`);
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    // 等事务提交，否则调用方以为写成功了、其实可能在中途回滚。
    await promisifyTransaction(transaction);
  } catch (error) {
    throw normalizeError(error, `写入 ${key} 失败`);
  }
}

/** 一次批量提交里的一步：写入某个 key，或删除某个 key。 */
export type IdbBatchOperation = { type: 'put'; key: string; value: unknown } | { type: 'delete'; key: string };

/**
 * 把一批「写入 + 删除」放进同一个事务。
 *
 * 存档目录与存档正文必须一起落盘 —— 目录里有一行，正文就得在；正文在，目录里就得有那一行。
 * 分开写会留下两类坏状态：目录指向不存在的正文（点开报错），或正文没有目录
 * （白占空间、列表里永远看不见）。走同一个事务就不存在「只落了一半」这个中间状态。
 */
export async function idbApplyBatch(operations: IdbBatchOperation[]): Promise<void> {
  if (operations.length === 0) {
    return;
  }

  let transaction: IDBTransaction;
  try {
    const db = await getDatabase();
    transaction = db.transaction(STORE_NAME, 'readwrite');
  } catch (error) {
    throw normalizeError(error, '批量写入失败');
  }

  const completion = promisifyTransaction(transaction);
  let issueError: unknown = null;

  try {
    const store = transaction.objectStore(STORE_NAME);
    for (const operation of operations) {
      if (operation.type === 'put') {
        store.put(operation.value, operation.key);
      } else {
        store.delete(operation.key);
      }
    }
  } catch (error) {
    // 中途抛错（例如值没法结构化克隆）时，事务**不会**因此自动回滚，
    // 已经排进去的那几步照样可能落盘 —— 必须显式中止，
    // 否则「要么都成、要么都不成」这句话就不成立。
    issueError = error;
    try {
      transaction.abort();
    } catch {
      // 事务已经结束，无需再中止
    }
  }

  try {
    await completion;
  } catch (error) {
    // 中止引发的失败要报真正的原因，而不是笼统的 abort。
    throw normalizeError(issueError ?? error, '批量写入失败');
  }

  if (issueError) {
    throw normalizeError(issueError, '批量写入失败');
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    await promisifyTransaction(transaction);
  } catch (error) {
    throw normalizeError(error, `删除 ${key} 失败`);
  }
}

export async function idbKeys(): Promise<string[]> {
  try {
    const db = await getDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const keys = await promisifyRequest<IDBValidKey[]>(transaction.objectStore(STORE_NAME).getAllKeys());
    return keys.filter((key): key is string => typeof key === 'string');
  } catch (error) {
    throw normalizeError(error, '读取 key 列表失败');
  }
}

/** 关掉缓存的连接。回到首页或测试时用，下次访问会重新开库。 */
export function closeStandaloneDatabase(): void {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) {
    return;
  }

  void pending.then(db => db.close()).catch(() => undefined);
}
