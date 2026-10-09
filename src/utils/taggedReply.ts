export interface ParsedTaggedAssistantReply {
  rawContent: string;
  contentText: string;
  thinkContent: string | null;
  summaryContent: string | null;
  updateContent: string | null;
  updateAnalysis: string | null;
  updateJsonPatchText: string | null;
  actionOptions: string[];
}

export interface TaggedUpdateDetails {
  updateAnalysis: string | null;
  updateJsonPatchText: string | null;
}

const UPDATE_VARIABLE_BLOCK_REGEX = /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/i;
const CONTENT_TEXT_REGEX = /<contenttext\b[^>]*>([\s\S]*?)<\/contenttext>/i;
const ACTION_OPTIONS_REGEX = /<action_options\b[^>]*>([\s\S]*?)<\/action_options>/i;

/**
 * 正文之外的标签块。补齐正文时要把它们整块剥掉，剩下的才是正文。
 * 顺序无关紧要 —— 每个正则各自从完整文本里找自己的块。
 */
const NON_BODY_BLOCK_REGEXES: readonly RegExp[] = [
  /<analysis_block>[\s\S]*?<\/analysis_block>/gi,
  /<summary>[\s\S]*?<\/summary>/gi,
  /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi,
  /<action_options\b[^>]*>[\s\S]*?<\/action_options>/gi,
];

/**
 * 只剥标签本身、内容保留：
 * - `<texttoimage>` 是生图本地内容块自己的外衣，模型会连标签一起抄进回复；
 *   里面的 `image### 提示词 ###` 本来就该留在正文里（图片槽按它出图），所以只去标签。
 * - 正文标签只写了一半（`<contenttext>正文` 没闭合）时，这个孤零零的开标签也要去掉。
 */
const BODY_WRAPPER_TAG_REGEX = /<\/?(?:texttoimage|contenttext)\b[^>]*>/gi;

/** 流式输出时这些块可能只吐了一半，没闭合就得从开标签处截断 */
const STREAMING_BLOCK_TAGS: readonly string[] = ['analysis_block', 'summary', 'UpdateVariable', 'action_options'];

function stripNonBodyBlocks(text: string): string {
  let working = text;
  for (const regex of NON_BODY_BLOCK_REGEXES) {
    working = working.replace(regex, '');
  }

  return working.replace(BODY_WRAPPER_TAG_REGEX, '');
}

/**
 * 正文补齐（完整回复）：模型偶尔漏写 `<contenttext>` 包裹，正文裸在
 * `</analysis_block>` 与 `<summary>` 之间。有标签就按标签取；没有才把非正文块剥掉，
 * 剩下的当正文。
 *
 * 标签在、内容为空时**不兜底** —— 那是模型确实没写正文，不该拿别的块来凑。
 */
function resolveContentText(rawContent: string): string {
  if (CONTENT_TEXT_REGEX.test(rawContent)) {
    return extractTaggedContentText(rawContent);
  }

  return stripNonBodyBlocks(rawContent).trim();
}

/** 从最后一个未闭合的开标签处截断（流式输出时后半截还没吐出来） */
function truncateAtUnclosedBlock(text: string, tagName: string): string {
  const lowerText = text.toLowerCase();
  const lastOpenIndex = lowerText.lastIndexOf(`<${tagName.toLowerCase()}>`);
  const lastCloseIndex = lowerText.lastIndexOf(`</${tagName.toLowerCase()}>`);

  return lastOpenIndex > lastCloseIndex ? text.slice(0, lastOpenIndex) : text;
}

/**
 * 正文补齐（流式）：规则同 `resolveContentText`，区别是流式输出中途块可能还没闭合，
 * 那种半截块也得切掉，否则小总结 / 行动选项的半句话会闪进正文。
 */
function resolveStreamingContentText(message: string): string {
  const tagged = extractStreamingTaggedSection(message, 'contenttext');
  if (tagged) {
    return tagged;
  }

  let working = message;
  for (const tagName of STREAMING_BLOCK_TAGS) {
    working = truncateAtUnclosedBlock(working, tagName);
  }

  return stripNonBodyBlocks(working).trim();
}

function extractTagContents(text: string, regex: RegExp): { content: string | null; cleaned: string } {
  const contents: string[] = [];
  const cleaned = text.replace(regex, (_, inner: string) => {
    const trimmed = inner?.trim();
    if (trimmed) {
      contents.push(trimmed);
    }
    return '';
  });

  return {
    content: contents.length > 0 ? contents.join('\n\n') : null,
    cleaned,
  };
}

export function extractTaggedContentText(message: string): string {
  const match = message.match(CONTENT_TEXT_REGEX);
  return match?.[1]?.trim() ?? '';
}

export function extractTaggedActionOptions(message: string): string[] {
  const match = message.match(ACTION_OPTIONS_REGEX);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

export function parseUpdateVariableDetails(updateContent: string | null): TaggedUpdateDetails {
  if (!updateContent) {
    return {
      updateAnalysis: null,
      updateJsonPatchText: null,
    };
  }

  const analysisMatch = updateContent.match(/<Analysis>([\s\S]*?)<\/Analysis>/i);
  const jsonPatchMatch = updateContent.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/i);

  return {
    updateAnalysis: analysisMatch?.[1]?.trim() ?? null,
    updateJsonPatchText: jsonPatchMatch?.[1]?.trim() ?? null,
  };
}

export function parseTaggedAssistantReply(rawContent: string): ParsedTaggedAssistantReply {
  let working = rawContent;

  const thinkingTags = extractTagContents(working, /<analysis_block>([\s\S]*?)<\/analysis_block>/gi);
  working = thinkingTags.cleaned;

  const summaryTags = extractTagContents(working, /<summary>([\s\S]*?)<\/summary>/gi);
  working = summaryTags.cleaned;

  const updateTags = extractTagContents(working, /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/gi);
  const { updateAnalysis, updateJsonPatchText } = parseUpdateVariableDetails(updateTags.content);

  return {
    rawContent,
    contentText: resolveContentText(rawContent),
    thinkContent: thinkingTags.content,
    summaryContent: summaryTags.content,
    updateContent: updateTags.content,
    updateAnalysis,
    updateJsonPatchText,
    actionOptions: extractTaggedActionOptions(rawContent),
  };
}

export function hasUpdateVariableBlock(rawContent: string): boolean {
  return UPDATE_VARIABLE_BLOCK_REGEX.test(rawContent);
}

export function replaceOrAppendUpdateVariableBlock(rawContent: string, updateBlock: string): string {
  if (hasUpdateVariableBlock(rawContent)) {
    return rawContent.replace(UPDATE_VARIABLE_BLOCK_REGEX, updateBlock.trim());
  }

  const normalizedRawContent = rawContent.trimEnd();
  const normalizedUpdateBlock = updateBlock.trim();
  return normalizedRawContent ? `${normalizedRawContent}\n\n${normalizedUpdateBlock}` : normalizedUpdateBlock;
}

const SUMMARY_BLOCK_REGEX = /<summary>([\s\S]*?)<\/summary>/gi;
const SUMMARY_BLOCK_TEST_REGEX = /<summary>[\s\S]*?<\/summary>/i;

/**
 * 编辑框的初始内容：正文 + 小总结。
 *
 * 小总结不单独开一块输入区，而是用它原本的 <summary> 标签包着跟在正文后面 ——
 * 用户把整段标签删掉就等于删掉这楼的小总结。
 * 用户楼层没有小总结，只给正文。
 */
export function composeEditableContent(message: {
  role: string;
  content_text?: string | null;
  summary_content?: string | null;
}): string {
  const body = message.content_text ?? '';
  const summary = message.summary_content?.trim();

  if (message.role !== 'assistant' || !summary) {
    return body;
  }

  return `${body}\n<summary>${summary}</summary>`;
}

/**
 * 编辑框内容拆回「正文 + 小总结」，与 composeEditableContent 互为逆操作。
 * 没有 <summary> 标签时整段都算正文。
 */
export function splitEditableBodyAndSummary(text: string): { contentText: string; summaryContent: string | null } {
  const { content: summaryContent, cleaned } = extractTagContents(text, SUMMARY_BLOCK_REGEX);

  return {
    contentText: cleaned.trim(),
    summaryContent,
  };
}

/**
 * 把编辑后的小总结写回原始消息：
 * 原本有就替换；原本没有就插在变量更新块之前（跟模型原本的输出顺序一致）。
 * 传 null 表示用户在编辑框里删掉了小总结，这里一并删掉。
 */
export function replaceOrAppendSummaryBlock(rawContent: string, summaryContent: string | null): string {
  const block = summaryContent ? `<summary>${summaryContent}</summary>` : '';

  if (SUMMARY_BLOCK_TEST_REGEX.test(rawContent)) {
    return rawContent.replace(SUMMARY_BLOCK_REGEX, () => block);
  }

  if (!block) {
    return rawContent;
  }

  const updateIndex = rawContent.search(UPDATE_VARIABLE_BLOCK_REGEX);
  if (updateIndex === -1) {
    const normalizedRawContent = rawContent.trimEnd();
    return normalizedRawContent ? `${normalizedRawContent}\n${block}` : block;
  }

  return `${rawContent.slice(0, updateIndex)}${block}\n${rawContent.slice(updateIndex)}`;
}

/** 带开闭标签的正文块，捕获开标签本身以便保留它的属性 */
const CONTENT_TEXT_REPLACE_REGEX = /(<contenttext\b[^>]*>)([\s\S]*?)(<\/contenttext>)/i;

/** 收集所有「非正文块」在原串里的区间，按起点升序 */
function collectNonBodyBlockRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  for (const regex of NON_BODY_BLOCK_REGEXES) {
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = globalRegex.exec(text)) !== null) {
      if (match[0].length === 0) {
        globalRegex.lastIndex += 1;
        continue;
      }
      ranges.push([match.index, match.index + match[0].length]);
    }
  }

  return ranges.sort((a, b) => a[0] - b[0]);
}

/**
 * 定位「裸正文」在原串里的区间。
 *
 * 正文的定义是「剥掉非正文块后剩下的内容」—— 它可能被夹在正文里的**字面块状文本**
 * （例如正文里恰好写到 `<summary>…</summary>`）劈成几段。所以这里取
 * 「第一段非空内容 到 最末一段非空内容」的**整段区间**，与 `resolveContentText` 的裸正文口径保持一致；
 * 只取最长的一段会让 `raw_content` 半新半旧。
 *
 * 两端空白不纳入区间，替换时保留原有排版。整段都定位不到时返回 null。
 */
function locateBareBodySpan(text: string): { start: number; end: number } | null {
  const ranges = collectNonBodyBlockRanges(text);
  const gaps: Array<[number, number]> = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) {
      gaps.push([cursor, start]);
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < text.length) {
    gaps.push([cursor, text.length]);
  }

  let firstStart = -1;
  let lastEnd = -1;

  for (const [start, end] of gaps) {
    const segment = text.slice(start, end);
    const innerStart = start + (segment.match(/^\s*/)?.[0].length ?? 0);
    const innerEnd = end - (segment.match(/\s*$/)?.[0].length ?? 0);
    if (innerEnd <= innerStart) {
      continue;
    }
    if (!stripNonBodyBlocks(text.slice(innerStart, innerEnd)).trim()) {
      continue;
    }

    if (firstStart === -1) {
      firstStart = innerStart;
    }
    lastEnd = innerEnd;
  }

  return firstStart !== -1 ? { start: firstStart, end: lastEnd } : null;
}

/**
 * 把改稿后的正文写回原始回复。
 *
 * 正文在原始回复里有两种形态，分别处理：
 * - **有 `<contenttext>` 标签**：只换标签内的内容，开标签属性与其它块逐字保留；
 * - **裸正文**（模型漏写标签）：定位「剥掉非正文块后剩下的那段」在原串里的位置，整段换成新正文，
 *   其余块（analysis_block / summary / UpdateVariable / action_options）逐字保留。
 *
 * 定位不到正文段时原样返回 —— 宁可不动，也不要把原始回复写坏。
 */
export function replaceContentTextBlock(rawContent: string, contentText: string): string {
  if (CONTENT_TEXT_REPLACE_REGEX.test(rawContent)) {
    return rawContent.replace(
      CONTENT_TEXT_REPLACE_REGEX,
      (_match, openTag: string) => `${openTag}\n${contentText}\n</contenttext>`,
    );
  }

  const span = locateBareBodySpan(rawContent);
  if (!span) {
    return rawContent;
  }

  return `${rawContent.slice(0, span.start)}${contentText}${rawContent.slice(span.end)}`;
}

export function extractStreamingTaggedSection(message: string, tagName: string): string | null {
  const contents: string[] = [];
  const fullTagRegex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'gi');

  message.replace(fullTagRegex, (_, inner: string) => {
    const trimmed = inner?.trim();
    if (trimmed) {
      contents.push(trimmed);
    }
    return '';
  });

  const lowerMessage = message.toLowerCase();
  const openTag = `<${tagName.toLowerCase()}>`;
  const closeTag = `</${tagName.toLowerCase()}>`;
  const lastOpenIndex = lowerMessage.lastIndexOf(openTag);
  const lastCloseIndex = lowerMessage.lastIndexOf(closeTag);

  if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
    const partialContent = message.slice(lastOpenIndex + openTag.length).trim();
    if (partialContent) {
      contents.push(partialContent);
    }
  }

  return contents.length > 0 ? contents.join('\n\n') : null;
}

export function parseStreamingTaggedAssistantReply(message: string): ParsedTaggedAssistantReply {
  const parsedComplete = parseTaggedAssistantReply(message);

  return {
    ...parsedComplete,
    contentText: resolveStreamingContentText(message),
    thinkContent: extractStreamingTaggedSection(message, 'analysis_block'),
    summaryContent: extractStreamingTaggedSection(message, 'summary'),
    updateContent: extractStreamingTaggedSection(message, 'UpdateVariable'),
    ...parseUpdateVariableDetails(extractStreamingTaggedSection(message, 'UpdateVariable')),
    actionOptions: extractTaggedActionOptions(message),
  };
}
