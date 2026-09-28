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
    contentText: extractTaggedContentText(rawContent),
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
    contentText: extractStreamingTaggedSection(message, 'contenttext') ?? '',
    thinkContent: extractStreamingTaggedSection(message, 'analysis_block'),
    summaryContent: extractStreamingTaggedSection(message, 'summary'),
    updateContent: extractStreamingTaggedSection(message, 'UpdateVariable'),
    ...parseUpdateVariableDetails(extractStreamingTaggedSection(message, 'UpdateVariable')),
    actionOptions: extractTaggedActionOptions(message),
  };
}
