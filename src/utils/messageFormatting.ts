type InlinePlaceholder = {
  token: string;
  html: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function applyInlineFormatting(text: string): string {
  const placeholders: InlinePlaceholder[] = [];
  let nextText = text.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `§§INLINECODE${placeholders.length}§§`;
    placeholders.push({
      token,
      html: `<code>${code}</code>`,
    });
    return token;
  });

  nextText = nextText
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');

  placeholders.forEach(({ token, html }) => {
    nextText = nextText.replaceAll(token, html);
  });

  return nextText;
}

function formatParagraph(lines: string[]): string {
  const content = lines.join('<br>');
  return `<p>${content}</p>`;
}

function formatBlockquote(lines: string[]): string {
  const normalizedLines = lines.map(line => line.replace(/^&gt;\s?/, '').trim()).filter(Boolean);
  return `<blockquote>${normalizedLines.join('<br>')}</blockquote>`;
}

function createListTag(ordered: boolean, items: string[]): string {
  const tag = ordered ? 'ol' : 'ul';
  const renderedItems = items.map(item => `<li>${item}</li>`).join('');
  return `<${tag}>${renderedItems}</${tag}>`;
}

function restoreBlockPlaceholders(text: string, placeholders: InlinePlaceholder[]): string {
  let nextText = text;
  placeholders.forEach(({ token, html }) => {
    nextText = nextText.replaceAll(token, html);
  });
  return nextText;
}

function wrapDialogueSegments(text: string): string {
  return text
    .replace(/“([^”]+)”/g, '<span class="quote">“$1”</span>')
    .replace(/&quot;([^&]+?)&quot;/g, '<span class="quote">&quot;$1&quot;</span>');
}

function formatStandaloneText(text: string): string {
  const escaped = escapeHtml(normalizeLineEndings(text));
  const blockPlaceholders: InlinePlaceholder[] = [];

  let working = escaped.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_, language: string | undefined, code: string) => {
    const token = `§§BLOCKCODE${blockPlaceholders.length}§§`;
    const languageAttr = language?.trim() ? ` data-language="${language.trim()}"` : '';
    blockPlaceholders.push({
      token,
      html: `<pre><code${languageAttr}>${code.trimEnd()}</code></pre>`,
    });
    return token;
  });

  working = applyInlineFormatting(working);
  const lines = working.split('\n');
  const blocks: string[] = [];
  let paragraphBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(formatParagraph(paragraphBuffer));
    paragraphBuffer = [];
  };

  const flushBlockquote = () => {
    if (blockquoteBuffer.length === 0) return;
    blocks.push(formatBlockquote(blockquoteBuffer));
    blockquoteBuffer = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushBlockquote();
      index += 1;
      continue;
    }

    if (/^§§BLOCKCODE\d+§§$/.test(trimmed)) {
      flushParagraph();
      flushBlockquote();
      blocks.push(trimmed);
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushBlockquote();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${headingMatch[2]}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^&gt;\s?/.test(trimmed)) {
      flushParagraph();
      blockquoteBuffer.push(trimmed);
      index += 1;
      continue;
    }

    if (blockquoteBuffer.length > 0) {
      flushBlockquote();
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (orderedMatch || unorderedMatch) {
      flushParagraph();
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index]?.trim() ?? '';
        const currentMatch = ordered ? currentLine.match(/^\d+\.\s+(.+)$/) : currentLine.match(/^[-*+]\s+(.+)$/);
        if (!currentMatch) {
          break;
        }
        items.push(currentMatch[1]);
        index += 1;
      }

      blocks.push(createListTag(ordered, items));
      continue;
    }

    paragraphBuffer.push(trimmed);
    index += 1;
  }

  flushParagraph();
  flushBlockquote();

  const html = wrapDialogueSegments(blocks.join(''));
  return restoreBlockPlaceholders(html || '<p></p>', blockPlaceholders);
}

export function formatMessageContentForDisplay(
  contentText: string,
  _role: 'user' | 'assistant',
  _messageId: number,
): string {
  return formatStandaloneText(contentText);
}

export function formatAuxiliaryContentForDisplay(contentText: string, _messageId: number): string {
  return formatStandaloneText(contentText);
}
