import { registeredWorldbookContentByName } from '../worldbook-registry';

/**
 * 兼容旧版 worldbookEntries -> standalone localContentEntries 的过渡资产入口。
 *
 * 说明：
 * - worldbookEntries 只用于读取旧预设，不是新预设的写入格式；
 * - 这里集中维护 legacy 名称与 standalone 本地内容正文的对应关系；
 * - 兼容迁移层只依赖本模块，不再直接引用旧 SillyTavern 世界书目录。
 */
export const legacyWorldbookContentByName = registeredWorldbookContentByName;
