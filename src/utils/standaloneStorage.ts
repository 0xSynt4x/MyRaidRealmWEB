/**
 * 本地存储层：IndexedDB 为主，localStorage 为降级。
 *
 * ## 为什么要有这一层
 *
 * localStorage 只有 5MB，而且写入失败是**同步抛错**。本仓会把整局的楼层快照、
 * 调试记录、世界书条目全放进本地存储，实测聊一回合就能吃掉六成配额，
 * 再聊一两回合必然触顶 —— 表现为存档失败、数据悄悄丢。IndexedDB 配额按磁盘比例给
 * （通常几百 MB 起），是这类数据的正确归宿。
 *
 * ## 两个关键设计
 *
 * **1. 启动时一次性搬完，之后不再碰 localStorage。**
 * 迁移发生在应用挂载之前（见 `src/index.ts`），搬完即删旧副本。
 * 放在启动时做的代价是首屏要等一次异步 IO，但换来的是：运行期所有读写语义不变，
 * 不需要把整条调用链都改成异步。
 *
 * **2. 小数据进内存缓存，读接口保持同步。**
 * 会话、消息、统计变量、存档索引都是「小但读得极频繁」的数据 —— 启动时一次性读进内存，
 * 之后同步读缓存、写时同步更新缓存并异步落盘。
 * 这样 `loadStandaloneRuntimeSession()` 这类被 store 初始化和 computed 调用的函数
 * **不需要改签名**，避免异步传染到整棵组件树（Vue 的 computed 不能 await）。
 *
 * 存档载荷（单个可达数 MB）不进缓存，走 `readLargeAsync` / `writeLargeAsync` 按需读写。
 *
 * ## 降级
 *
 * 无痕模式、隐私设置禁用 IndexedDB 时（Safari 无痕尤其典型），
 * 整体退回 localStorage 路径 —— 容量还是 5MB，但功能不中断、数据不丢。
 */

import {
  StorageQuotaError,
  StorageUnavailableError,
  closeStandaloneDatabase,
  idbClear,
  idbDelete,
  idbGet,
  idbKeys,
  idbSet,
  isIndexedDbSupported,
} from './standaloneIndexedDb';

/**
 * 需要搬进 IndexedDB 的固定 key。
 *
 * 🔴 这些字符串同时也是各模块的存储 key，改动会丢老用户数据，不要动。
 */
const MIGRATED_FIXED_KEYS = [
  'th1980s:standalone-runtime-session',
  'th1980s:standalone-runtime-messages',
  'th1980s:standalone-stat-data',
  'th1980s:standalone-archive-index',
] as const;

/**
 * 存档载荷是「一个存档一个 key」，前缀匹配扫描。
 * 这些是最大块的数据，也正是当初把 localStorage 撑爆的元凶。
 */
const MIGRATED_KEY_PREFIXES = ['th1980s:standalone-archive:'] as const;

/** 走内存缓存的 key —— 小且读得频繁。存档载荷不在其中。 */
const CACHED_KEY_SET = new Set<string>(MIGRATED_FIXED_KEYS);

type StorageMode = 'indexeddb' | 'localstorage' | 'uninitialized';

let storageMode: StorageMode = 'uninitialized';

/** 小数据的内存副本。IndexedDB 模式下所有同步读都打在这里。 */
const memoryCache = new Map<string, unknown>();

/** 迁移统计，供排障与自检用。 */
export interface StandaloneStorageMigrationReport {
  mode: StorageMode;
  migratedKeys: string[];
  failedKeys: string[];
  /** 迁移完成后是否清掉了 localStorage 里的旧副本 */
  clearedLocalCopies: boolean;
}

let lastMigrationReport: StandaloneStorageMigrationReport = {
  mode: 'uninitialized',
  migratedKeys: [],
  failedKeys: [],
  clearedLocalCopies: false,
};

export function getStandaloneStorageMigrationReport(): StandaloneStorageMigrationReport {
  return { ...lastMigrationReport, migratedKeys: [...lastMigrationReport.migratedKeys], failedKeys: [...lastMigrationReport.failedKeys] };
}

export function getStandaloneStorageMode(): StorageMode {
  return storageMode;
}

/* ------------------------------------------------------------------ *
 * localStorage 访问垫片
 * ------------------------------------------------------------------ */

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 删不掉不影响正确性：读取已经以 IndexedDB 为准
  }
}

/** 枚举 localStorage 里所有匹配这些前缀的 key。 */
function collectLocalKeysByPrefix(): string[] {
  const matched: string[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && MIGRATED_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        matched.push(key);
      }
    }
  } catch {
    // localStorage 整个不可用时当作没有旧数据
  }

  return matched;
}

/* ------------------------------------------------------------------ *
 * 初始化与迁移
 * ------------------------------------------------------------------ */

/**
 * 启动时调用一次，必须在应用挂载、任何 store 初始化之前 await 完成。
 *
 * 顺序：打开数据库 → 逐个 key 判断「搬」还是「读」→ 填充内存缓存 → 删旧副本。
 * 单个 key 搬家失败不影响其他 key，也不会让启动中断 —— 失败的那个留在 localStorage 里继续可用。
 */
export async function initializeStandaloneStorage(): Promise<StandaloneStorageMigrationReport> {
  if (storageMode !== 'uninitialized') {
    return getStandaloneStorageMigrationReport();
  }

  if (!isIndexedDbSupported()) {
    storageMode = 'localstorage';
    lastMigrationReport = { mode: 'localstorage', migratedKeys: [], failedKeys: [], clearedLocalCopies: false };
    console.warn('[Storage] 当前环境不支持 IndexedDB，继续使用 localStorage（容量仍为 5MB）');
    return getStandaloneStorageMigrationReport();
  }

  const migratedKeys: string[] = [];
  const failedKeys: string[] = [];

  try {
    // 先探一次连接。Safari 无痕模式下 indexedDB 存在但 open 会失败，
    // 这里失败就整体降级，不要等到用户存档时才发现。
    await idbKeys();
  } catch (error) {
    storageMode = 'localstorage';
    lastMigrationReport = { mode: 'localstorage', migratedKeys: [], failedKeys: [], clearedLocalCopies: false };
    console.warn('[Storage] IndexedDB 打不开，继续使用 localStorage:', error);
    return getStandaloneStorageMigrationReport();
  }

  storageMode = 'indexeddb';

  const allKeys = [...MIGRATED_FIXED_KEYS, ...collectLocalKeysByPrefix()];

  for (const key of allKeys) {
    try {
      const moved = await migrateOneKey(key);
      if (moved) {
        migratedKeys.push(key);
      }

      // 不管是不是刚搬的，缓存型 key 都要读进内存。
      if (CACHED_KEY_SET.has(key)) {
        const cached = await idbGet(key);
        if (cached !== null) {
          memoryCache.set(key, cached);
        }
      }
    } catch (error) {
      failedKeys.push(key);
      console.warn(`[Storage] ${key} 迁移失败，该 key 继续留在 localStorage:`, error);

      // 搬不进去就让它继续走 localStorage，至少这次会话功能不中断。
      if (CACHED_KEY_SET.has(key)) {
        const raw = safeLocalGet(key);
        if (raw !== null) {
          try {
            memoryCache.set(key, JSON.parse(raw));
          } catch {
            // 老数据不是合法 JSON，当作不存在
          }
        }
      }
    }
  }

  const clearedLocalCopies = failedKeys.length === 0;

  lastMigrationReport = {
    mode: storageMode,
    migratedKeys,
    failedKeys,
    clearedLocalCopies,
  };

  if (migratedKeys.length > 0) {
    console.info(`[Storage] 已把 ${migratedKeys.length} 个 key 迁移到 IndexedDB`, {
      keys: migratedKeys,
      failed: failedKeys,
    });
  }

  return getStandaloneStorageMigrationReport();
}

/**
 * 搬一个 key：IndexedDB 已有就以它为准；否则从 localStorage 读出来写进去。
 *
 * 🔴 先写成功再删源。写失败时保持原样，调用方继续读 localStorage，不会丢数据。
 */
async function migrateOneKey(key: string): Promise<boolean> {
  const existing = await idbGet(key);
  if (existing !== null) {
    // 已经搬过了，把可能残留的旧副本清掉（上次搬到一半失败会留下）
    safeLocalRemove(key);
    return false;
  }

  const raw = safeLocalGet(key);
  if (raw === null) {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[Storage] ${key} 不是合法 JSON，已跳过迁移:`, error);
    return false;
  }

  await idbSet(key, parsed);
  safeLocalRemove(key);
  return true;
}

/* ------------------------------------------------------------------ *
 * 同步读写（小数据，走内存缓存）
 * ------------------------------------------------------------------ */

/**
 * 同步读一个小数据 key。
 *
 * IndexedDB 模式下读内存缓存 —— 缓存由 initializeStandaloneStorage() 在启动时填好。
 * 降级模式下直接读 localStorage。
 *
 * 返回 null 表示「没有这条数据」，与 localStorage.getItem 语义一致。
 */
export function readStorageSync<T = unknown>(key: string): T | null {
  if (storageMode === 'indexeddb') {
    const cached = memoryCache.get(key);
    return cached === undefined ? null : (cached as T);
  }

  // 降级路径：indexeddb 不可用，或还没初始化（此时只能读 localStorage）
  const raw = safeLocalGet(key);
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] ${key} 不是合法 JSON，已忽略:`, error);
    return null;
  }
}

/**
 * 同步写一个小数据 key：立即更新内存缓存，落盘异步进行。
 *
 * 调用方拿到的是「已生效」的语义，刷新后能否读回取决于落盘结果 ——
 * 落盘失败会打日志并尝试写 localStorage 兜底，不会静默丢数据。
 */
export function writeStorageSync(key: string, value: unknown): void {
  if (storageMode !== 'indexeddb') {
    // 降级模式：没得选，只能同步写 localStorage
    safeLocalSet(key, JSON.stringify(value));
    return;
  }

  memoryCache.set(key, value);

  void idbSet(key, value).catch(error => {
    handleWriteFailure(key, value, error);
  });
}

/** 删一个小数据 key：缓存和落盘一起清。 */
export function removeStorageSync(key: string): void {
  memoryCache.delete(key);

  if (storageMode !== 'indexeddb') {
    safeLocalRemove(key);
    return;
  }

  // 两边都删：IndexedDB 留着会让下次启动把已删数据读回来。
  safeLocalRemove(key);
  void idbDelete(key).catch(error => {
    console.warn(`[Storage] 删除 ${key} 失败:`, error);
  });
}

function handleWriteFailure(key: string, value: unknown, error: unknown): void {
  if (error instanceof StorageQuotaError) {
    console.error(`[Storage] ${key} 写入失败：IndexedDB 空间已满`);
  } else if (error instanceof StorageUnavailableError) {
    console.error(`[Storage] ${key} 写入失败：数据库当前不可用`, error);
  } else {
    console.error(`[Storage] ${key} 写入失败:`, error);
  }

  // 兜底：至少留一份在 localStorage。可能同样失败（配额也是 5MB），
  // 但比完全丢掉强，而且用户下次打开还能从这份恢复。
  const fallback = safeLocalSet(key, JSON.stringify(value));
  if (fallback) {
    console.warn(`[Storage] 已把 ${key} 兜底写入 localStorage`);
  } else {
    console.error(`[Storage] ${key} 兜底写入 localStorage 同样失败，这次改动未能持久化`);
  }
}

/* ------------------------------------------------------------------ *
 * 异步读写（大块存档载荷，不进缓存）
 * ------------------------------------------------------------------ */

export async function readLargeAsync<T = unknown>(key: string): Promise<T | null> {
  if (storageMode !== 'indexeddb') {
    const raw = safeLocalGet(key);
    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[Storage] ${key} 不是合法 JSON，已忽略:`, error);
      return null;
    }
  }

  try {
    return await idbGet<T>(key);
  } catch (error) {
    console.warn(`[Storage] 读取 ${key} 失败:`, error);
    return null;
  }
}

export async function writeLargeAsync(key: string, value: unknown): Promise<void> {
  if (storageMode !== 'indexeddb') {
    if (!safeLocalSet(key, JSON.stringify(value))) {
      throw new StorageQuotaError(`写入 ${key} 失败：本地存储空间已满`);
    }
    return;
  }

  await idbSet(key, value);
}

export async function removeLargeAsync(key: string): Promise<void> {
  safeLocalRemove(key);

  if (storageMode !== 'indexeddb') {
    return;
  }

  await idbDelete(key);
}

/** 列出某个前缀下的所有 key（IndexedDB 与降级路径行为一致）。 */
export async function listKeysByPrefixAsync(prefix: string): Promise<string[]> {
  if (storageMode !== 'indexeddb') {
    const legacyPrefixes = MIGRATED_KEY_PREFIXES.filter(item => item.startsWith(prefix) || prefix.startsWith(item));
    const collected = new Set<string>();

    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && (key.startsWith(prefix) || legacyPrefixes.some(item => key.startsWith(item)))) {
          collected.add(key);
        }
      }
    } catch {
      // localStorage 不可用，返回空
    }

    return [...collected];
  }

  const keys = await idbKeys();
  return keys.filter(key => key.startsWith(prefix));
}

/* ------------------------------------------------------------------ *
 * 清空
 * ------------------------------------------------------------------ */

/**
 * 清掉本层管理的所有数据。「重置游戏」走这里。
 *
 * 会同时清内存缓存、IndexedDB 和 localStorage 残留 —— 少清一边都会导致
 * 重置后刷新又把旧数据读回来。
 */
export async function clearStandaloneStorage(): Promise<void> {
  memoryCache.clear();

  // 固定 key 一律清
  for (const key of MIGRATED_FIXED_KEYS) {
    safeLocalRemove(key);
  }

  // 前缀 key 也清（存档载荷）
  for (const key of collectLocalKeysByPrefix()) {
    safeLocalRemove(key);
  }

  if (storageMode !== 'indexeddb') {
    return;
  }

  try {
    await idbClear();
  } catch (error) {
    console.warn('[Storage] 清空 IndexedDB 失败:', error);
  }
}

/** 测试与排障用：重置模块状态，让下次 initialize 重新走一遍迁移。 */
export function resetStandaloneStorageForTesting(): void {
  memoryCache.clear();
  storageMode = 'uninitialized';
  lastMigrationReport = { mode: 'uninitialized', migratedKeys: [], failedKeys: [], clearedLocalCopies: false };
  closeStandaloneDatabase();
}

/** 排障用：把存储层的当前状况暴露到 window，供 E2E 与人工检查。 */
export function installStandaloneStorageBridge(): void {
  if (typeof window === 'undefined') {
    return;
  }

  (window as unknown as Record<string, unknown>).__MYRAIDREALM_STORAGE__ = {
    initialize: initializeStandaloneStorage,
    report: getStandaloneStorageMigrationReport,
    mode: getStandaloneStorageMode,
    readSync: readStorageSync,
    readLarge: readLargeAsync,
    listKeys: listKeysByPrefixAsync,
    clear: clearStandaloneStorage,
    reset: resetStandaloneStorageForTesting,
  };
}
