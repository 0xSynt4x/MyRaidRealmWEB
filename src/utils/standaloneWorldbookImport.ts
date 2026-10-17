import type { LocalContentEntryConfig } from '../presets/types';

/** 酒馆（SillyTavern）世界书导出格式：顶层 `entries` 是「uid 字符串 → 条目对象」的字典。 */
type TavernWorldbookEntry = {
  comment?: unknown;
  content?: unknown;
  disable?: unknown;
};

type TavernWorldbookDocument = {
  entries?: unknown;
};

export type StandaloneWorldbookImportResult = {
  entries: LocalContentEntryConfig[];
  /** 因被作者停用（disable=true）而跳过的条目数。 */
  disabledCount: number;
  /** 因标题或正文为空而跳过的条目数。 */
  emptyCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toEntryText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 把酒馆世界书 JSON 文本解析成本项目的本地内容条目。
 *
 * 本项目世界书没有关键词触发（每轮整块进提示词，见 spec/06-content-assets.md），
 * 所以 key / keysecondary / constant / probability 等触发字段一律丢弃，
 * 只保留标题（comment）与正文（content）。标题保持原作者原样，不加 `[WB]` 前缀。
 * 作者停用的条目（disable=true）跳过不导。
 */
export function parseStandaloneTavernWorldbookDocument(rawText: string): StandaloneWorldbookImportResult {
  let document: TavernWorldbookDocument;
  try {
    document = JSON.parse(rawText) as TavernWorldbookDocument;
  } catch (error) {
    console.warn('[StandaloneWorldbookImport] 解析酒馆世界书失败:', error);
    return { entries: [], disabledCount: 0, emptyCount: 0 };
  }

  if (!isRecord(document.entries)) {
    return { entries: [], disabledCount: 0, emptyCount: 0 };
  }

  const entries: LocalContentEntryConfig[] = [];
  let disabledCount = 0;
  let emptyCount = 0;

  Object.values(document.entries).forEach(rawEntry => {
    if (!isRecord(rawEntry)) {
      return;
    }

    const entry = rawEntry as TavernWorldbookEntry;
    if (entry.disable === true) {
      disabledCount += 1;
      return;
    }

    const name = toEntryText(entry.comment);
    const content = toEntryText(entry.content);
    if (!name || !content) {
      emptyCount += 1;
      return;
    }

    entries.push({
      name,
      content,
      kind: 'worldbook',
      route: 'main',
      enabled: true,
    });
  });

  return { entries, disabledCount, emptyCount };
}
