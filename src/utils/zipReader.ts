/**
 * 极简 zip 读取器 —— 只为了从 NovelAI 兼容接口返回的 zip 里取出图片。
 *
 * ## 为什么不引第三方库
 *
 * 本仓的硬边界是「所有依赖打进产物、零外部运行时依赖」。这里需要的能力很窄：
 * 读出 zip 里每个条目的名字和内容，压缩方式只会遇到「不压缩」和「deflate」两种。
 * 浏览器自带的 `DecompressionStream('deflate-raw')` 正好覆盖后者，
 * 所以手写一个几百字节的解析器比新增一个依赖划算得多。
 *
 * ## 覆盖范围与不覆盖的
 *
 * - 覆盖：单盘 zip、stored（0）与 deflate（8）两种压缩方式。
 * - 不覆盖：zip64（条目超过 4GB）、加密、分卷。出图场景下不可能碰到。
 */

export interface ZipEntry {
  /** zip 里的条目名，如 `image_0.png` */
  name: string;
  /** 解压后的原始字节 */
  data: Uint8Array;
}

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

/** EOCD 结构体固定 22 字节，尾部可能跟着最长 64KB 的注释，所以往回找这么多字节 */
const MAX_COMMENT_LENGTH = 0xffff;
const EOCD_SIZE = 22;

const COMPRESSION_STORED = 0;
const COMPRESSION_DEFLATE = 8;

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/** 从文件尾部往回找 EOCD 的位置；找不到说明这不是一个合法的 zip */
function findEndOfCentralDirectory(view: DataView): number {
  const earliest = Math.max(0, view.byteLength - MAX_COMMENT_LENGTH - EOCD_SIZE);

  for (let offset = view.byteLength - EOCD_SIZE; offset >= earliest; offset -= 1) {
    if (readUint32(view, offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }

  throw new Error('不是合法的 zip：找不到中央目录结束记录');
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 DecompressionStream，无法解压 zip');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 读出 zip 里的全部条目。
 *
 * 走中央目录而不是顺序扫本地头：本地头在有数据描述符（data descriptor）时
 * 压缩后长度字段是 0，顺序扫会算错偏移；中央目录里的长度是准的。
 */
export async function readZipEntries(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocdOffset = findEndOfCentralDirectory(view);

  const entryCount = readUint16(view, eocdOffset + 10);
  const centralDirectoryOffset = readUint32(view, eocdOffset + 16);

  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, cursor) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('zip 中央目录结构异常');
    }

    const compressionMethod = readUint16(view, cursor + 10);
    const compressedSize = readUint32(view, cursor + 20);
    const fileNameLength = readUint16(view, cursor + 28);
    const extraFieldLength = readUint16(view, cursor + 30);
    const fileCommentLength = readUint16(view, cursor + 32);
    const localHeaderOffset = readUint32(view, cursor + 42);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + fileNameLength));

    // 本地头里的文件名/扩展区长度可能与中央目录不同（扩展区常被重写），以本地头为准
    if (readUint32(view, localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`zip 条目 ${name} 的本地头结构异常`);
    }

    const localFileNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraFieldLength = readUint16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === COMPRESSION_STORED) {
      entries.push({ name, data: compressed.slice() });
    } else if (compressionMethod === COMPRESSION_DEFLATE) {
      entries.push({ name, data: await inflateRaw(compressed) });
    } else {
      throw new Error(`zip 条目 ${name} 使用了不支持的压缩方式（${compressionMethod}）`);
    }

    cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export interface ExtractedZipImage {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}

/**
 * 从 zip 里挑出图片条目。
 *
 * 出图只请求 1 张，但 zip 里的命名是 `image_0.png`；将来若放多张会是
 * `image_1.png`、`image_2.png`…，所以这里按名字排序后**返回全部图片**，
 * 由调用方决定用哪张，而不是写死取第一个。
 */
export async function extractImagesFromZip(buffer: ArrayBuffer): Promise<ExtractedZipImage[]> {
  const entries = await readZipEntries(buffer);

  return entries
    .map(entry => {
      const extension = entry.name.split('.').pop()?.toLowerCase() ?? '';
      const mimeType = IMAGE_MIME_BY_EXTENSION[extension];
      return mimeType ? { name: entry.name, mimeType, bytes: entry.data } : null;
    })
    .filter((item): item is ExtractedZipImage => item !== null)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
}

/** 把图片字节转成可直接塞进 <img src> 的 data URL */
export function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** 从 base64 字符串转成 data URL（官方接口可能直接回 JSON + base64） */
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  const trimmed = base64.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:${mimeType};base64,${trimmed}`;
}
