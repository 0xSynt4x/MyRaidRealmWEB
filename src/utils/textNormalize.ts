/**
 * 文本换行归一化工具（叶子模块，不依赖任何其他模块）
 */

/**
 * 仅统一行尾：CRLF → LF，保留首尾空白。用于渲染管线。
 * @param text 原始文本
 * @returns 统一行尾后的文本
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/**
 * 统一行尾并裁剪首尾空白。用于拼装 prompt / 规则文本。
 * @param text 原始文本
 * @returns 统一行尾并裁剪后的文本
 */
export function normalizeLineEndingsTrimmed(text: string): string {
  return normalizeLineEndings(text).trim();
}
