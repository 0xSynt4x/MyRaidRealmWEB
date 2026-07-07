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

/**
 * 预设的多语言（英文）文本。
 * 数据文件（src/presets/preset-i18n/*.ts）提供 name/category/tags/description，
 * configEn 在运行时由 applyPresetI18n 动态生成并写回。
 */
export interface PresetI18nText {
  name: string;
  category: string;
  tags: string[];
  description: string;
  /** 运行时生成的英文化配置，供 applyPresetI18n 缓存复用 */
  configEn?: PresetConfig['config'];
}

/** 预设的多语言集合，目前仅提供英文 */
export interface PresetI18n {
  en?: PresetI18nText;
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
  /** 预设的多语言文本（目前仅英文），可由预设直接提供或运行时补全 */
  i18n?: PresetI18n;
}
