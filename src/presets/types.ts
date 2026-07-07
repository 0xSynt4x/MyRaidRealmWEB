import type { z } from 'zod';
import type { Schema } from '../../schema/schema';
import type { StandaloneLocalContentKind, StandaloneLocalContentRoute } from '../utils/standaloneLocalContent';

export interface LocalContentEntryConfig {
  name: string;
  content: string;
  registeredWorldbookName?: string;
  kind?: StandaloneLocalContentKind;
  route?: StandaloneLocalContentRoute;
  enabled?: boolean;
}

export interface PresetMigrationWarning {
  code: 'legacy_worldbook_entries_unresolved';
  entryNames: string[];
}

// 世界配置预设数据
export interface PresetConfig {
  id: string;
  name: string;
  icon: string;
  category: string;
  tags: string[];
  description: string;
  config: z.input<typeof Schema>;
  /** 显式声明需要补回的已注册本地世界资料名称，便于序列化恢复与未来扩展 */
  registeredWorldbookNames?: string[];
  /** standalone 模式下可直接注入到本地内容系统的附加条目 */
  localContentEntries?: LocalContentEntryConfig[];
  /** 预设兼容迁移时遗留的提醒信息，用于在选择/应用时提示用户 */
  legacyMigrationWarnings?: PresetMigrationWarning[];
  /** 创意工坊作者信息，可直接由 ws JSON 提供 */
  author?: {
    name: string;
    link?: string;
  };
}
