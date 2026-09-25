/**
 * 云端生图的图片仓库。
 *
 * ## 为什么单独存
 *
 * 本地 ComfyUI 出图返回的是**地址**（图留在 ComfyUI 的 output 目录），
 * 但云端出图返回的是**图片数据本身**，没有地址可存。而消息数据、存档载荷
 * 都是要跟着存档导出走的 —— 一张 1.5MB 的图塞进存档，几轮下来就把存档撑爆了。
 *
 * 所以：**图片本体进 IndexedDB，消息里只留一个编号**。导出存档只带编号不带图，
 * 存档体积不受影响；代价是换台机器打开存档看不到图（图还在原机器的浏览器里），
 * 这与现状语义一致 —— 现在 ComfyUI 的图换机器同样看不到。
 *
 * ## 为什么走 standaloneStorage 而不是直接开 IndexedDB
 *
 * 那一层已经把「无痕模式 / 隐私设置禁用 IndexedDB」的降级路径处理好了，
 * 并且负责在启动时把数据搬进 IndexedDB。这里直接复用它的异步大块读写接口。
 */

import { listKeysByPrefixAsync, readLargeAsync, removeLargeAsync, writeLargeAsync } from './standaloneStorage';

/**
 * 图片在存储层的 key 前缀。
 *
 * 🔴 这个字符串是数据的一部分：改动会让老玩家的图读不出来（只剩编号），不要动。
 */
export const GENERATED_IMAGE_KEY_PREFIX = 'th1980s:standalone-generated-image:';

/** 一条云端图片记录 */
export interface StoredGeneratedImage {
  id: string;
  /** 可直接塞进 <img src> 的 data URL */
  dataUrl: string;
  mimeType: string;
  /** 出图时实际提交的提示词，便于排查「这张图为什么长这样」 */
  prompt: string;
  createdAt: string;
}

export interface GeneratedImageStorageUsage {
  count: number;
  bytes: number;
}

/** 生成一个图片编号。时间戳打头，方便排障时按时间认图。 */
export function createGeneratedImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function imageKey(id: string): string {
  return `${GENERATED_IMAGE_KEY_PREFIX}${id}`;
}

/** data URL 的实际字节数：base64 每 4 个字符编码 3 字节，再扣掉头部与换行 */
export function estimateDataUrlByteSize(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return dataUrl.length;

  const payload = dataUrl.slice(commaIndex + 1);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

/** 存一张图。写不进去（配额满 / 存储不可用）会抛错，由调用方提示玩家。 */
export async function saveGeneratedImage(image: StoredGeneratedImage): Promise<void> {
  await writeLargeAsync(imageKey(image.id), image);
  cachedUsage = null;
}

/** 按编号取图；取不到（被清理过、或换了机器）返回 null */
export async function loadGeneratedImage(id: string): Promise<StoredGeneratedImage | null> {
  return readLargeAsync<StoredGeneratedImage>(imageKey(id));
}

/**
 * 列出全部云端图片，**最新的在前**。
 *
 * 给设置里的图片浏览器用。`createdAt` 是 ISO 字符串，直接按字典序排就是时间序。
 * 编号对不上数据的（读不出来 / 没有图）直接跳过，不让坏数据把列表打断。
 */
export async function listGeneratedImages(): Promise<StoredGeneratedImage[]> {
  const keys = await listKeysByPrefixAsync(GENERATED_IMAGE_KEY_PREFIX);
  const images: StoredGeneratedImage[] = [];

  for (const key of keys) {
    const image = await readLargeAsync<StoredGeneratedImage>(key);
    if (image?.id && image.dataUrl) {
      images.push(image);
    }
  }

  images.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return images;
}

/** 按编号删图。删不存在的图不报错。 */
export async function deleteGeneratedImage(id: string): Promise<void> {
  await removeLargeAsync(imageKey(id));
  cachedUsage = null;
}

/**
 * 统计占用。
 *
 * IndexedDB 没有「这个 key 占多大」的接口，只能把图读出来量一遍。
 * 结果是模块级缓存的 —— 清理入口是个手动动作，不需要每次进设置都重算。
 */
let cachedUsage: GeneratedImageStorageUsage | null = null;

export async function getGeneratedImageStorageUsage(options?: { refresh?: boolean }): Promise<GeneratedImageStorageUsage> {
  if (cachedUsage && !options?.refresh) {
    return cachedUsage;
  }

  const keys = await listKeysByPrefixAsync(GENERATED_IMAGE_KEY_PREFIX);
  let bytes = 0;

  for (const key of keys) {
    const image = await readLargeAsync<StoredGeneratedImage>(key);
    if (image?.dataUrl) {
      bytes += estimateDataUrlByteSize(image.dataUrl);
    }
  }

  cachedUsage = { count: keys.length, bytes };
  return cachedUsage;
}

/** 清空全部云端图片。返回清掉了多少张、腾出多少字节。 */
export async function clearGeneratedImages(): Promise<GeneratedImageStorageUsage> {
  const before = await getGeneratedImageStorageUsage({ refresh: true });
  const keys = await listKeysByPrefixAsync(GENERATED_IMAGE_KEY_PREFIX);

  for (const key of keys) {
    await removeLargeAsync(key);
  }

  cachedUsage = { count: 0, bytes: 0 };
  return before;
}

/** 人话的容量显示：1.5 MB / 320 KB */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 测试与排障用：清掉缓存，让下次统计重新算 */
export function resetGeneratedImageUsageCacheForTesting(): void {
  cachedUsage = null;
}
