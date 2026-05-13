import TurndownService from 'turndown';

import { withCheckboxCharacters } from '../task-transform';
import { normalizeSafeImageSrc, normalizeSafeLinkHref } from '../url-safety';

const forbiddenTags = new Set([
  'audio',
  'canvas',
  'embed',
  'form',
  'head',
  'html',
  'iframe',
  'link',
  'math',
  'meta',
  'object',
  'script',
  'style',
  'svg',
  'template',
  'video',
]);

const hiddenClassNames = ['hidden', 'sr-only', 'visually-hidden'];
const languageClassPrefix = 'language-';
const supportedLanguageName = /^[a-zA-Z0-9_-]+$/;

const allowedTags = new Set([
  'a',
  'article',
  'b',
  'br',
  'blockquote',
  'body',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'section',
  'span',
  'strike',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

export const SIMPLENOTE_SOURCE_HTML_MARKER =
  '<!--simplenote-clipboard-source:v1-->';

type TurndownNode = HTMLElement & {
  isBlock?: boolean;
};

type RichPasteEditor<Selection> = {
  executeEdits: (
    source: string,
    edits: Array<{
      range: Selection;
      text: string;
      forceMoveMarkers: boolean;
    }>
  ) => unknown;
  getSelections: () => Selection[] | null;
  pushUndoStop: () => unknown;
};

type ClipboardItemReader = Pick<ClipboardItem, 'getType' | 'types'>;

const isHidden = (node: Element): boolean => {
  const style = node instanceof HTMLElement ? node.style : null;
  const styleValue = (property: string) =>
    style?.getPropertyValue(property).trim().toLowerCase() ?? '';
  const hasHiddenClass = hiddenClassNames.some((className) =>
    node.classList.contains(className)
  );
  const opacity = styleValue('opacity');
  const fontSize = styleValue('font-size');
  const position = styleValue('position');
  const offsetProperties = ['left', 'right', 'top', 'bottom'];
  const hasNegativeOffset = offsetProperties.some(
    (property) => parseFloat(styleValue(property)) <= -100
  );
  const hasNegativeTextIndent = parseFloat(styleValue('text-indent')) <= -100;

  return (
    node.hasAttribute('hidden') ||
    node.hasAttribute('inert') ||
    node.getAttribute('aria-hidden') === 'true' ||
    hasHiddenClass ||
    styleValue('display') === 'none' ||
    styleValue('visibility') === 'hidden' ||
    (opacity !== '' && parseFloat(opacity) === 0) ||
    (fontSize !== '' && parseFloat(fontSize) === 0) ||
    /(?:^|;)\s*mso-hide\s*:\s*all\s*(?:;|$)/i.test(
      node.getAttribute('style') ?? ''
    ) ||
    /^rect\s*\(\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*\)$/.test(
      styleValue('clip')
    ) ||
    /^inset\s*\(\s*(?:50%|100%)\s*\)$/.test(styleValue('clip-path')) ||
    ((position === 'absolute' || position === 'fixed') &&
      (hasNegativeOffset || hasNegativeTextIndent))
  );
};

const safeLink = (href: string | null): string | null => {
  return normalizeSafeLinkHref(href);
};

const safeImageSource = (src: string | null): string | null => {
  return normalizeSafeImageSrc(src);
};

const replaceNodeWithText = (node: Element, text: string) => {
  node.parentNode?.replaceChild(document.createTextNode(text), node);
};

const unwrapNode = (node: Element) => {
  const parent = node.parentNode;

  if (!parent) {
    return;
  }

  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }

  parent.removeChild(node);
};

const textForUnsafeImage = (node: Element) => {
  const alt = node.getAttribute('alt')?.trim().replace(/\s+/g, ' ');

  return alt ? alt : '';
};

const prepareHtmlForMarkdown = (html: string): HTMLElement => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Element);
  }

  nodes.forEach((node) => {
    const tagName = node.nodeName.toLowerCase();

    if (!node.parentNode) {
      return;
    }

    if (isHidden(node) || forbiddenTags.has(tagName)) {
      node.parentNode.removeChild(node);
      return;
    }

    if (!allowedTags.has(tagName)) {
      unwrapNode(node);
      return;
    }

    if (tagName === 'a') {
      const href = safeLink(node.getAttribute('href'));
      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );

      if (href) {
        node.setAttribute('href', href);
      }
      return;
    }

    if (tagName === 'img') {
      const src = safeImageSource(node.getAttribute('src'));
      const alt = node.getAttribute('alt') ?? '';

      if (!src) {
        replaceNodeWithText(node, textForUnsafeImage(node));
        return;
      }

      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );
      node.setAttribute('src', src);
      node.setAttribute('alt', alt);
      return;
    }

    if (tagName === 'input') {
      if (node.getAttribute('type') !== 'checkbox' || !node.closest('li')) {
        node.parentNode.removeChild(node);
        return;
      }

      replaceNodeWithText(node, node.hasAttribute('checked') ? '[x] ' : '[ ] ');
      return;
    }

    if (tagName === 'ol') {
      const start = node.getAttribute('start');
      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );

      if (start && /^\d+$/.test(start)) {
        node.setAttribute('start', start);
      }
      return;
    }

    if (tagName === 'code') {
      const language = Array.from(node.classList)
        .map((className) =>
          className.startsWith(languageClassPrefix)
            ? className.slice(languageClassPrefix.length)
            : null
        )
        .find(
          (language) =>
            language !== null && supportedLanguageName.test(language)
        );
      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );

      if (language) {
        node.setAttribute('class', `language-${language}`);
      }
      return;
    }

    Array.from(node.attributes).forEach(({ name }) =>
      node.removeAttribute(name)
    );
  });

  return doc.body;
};

const tableCellText = (cell: Element) =>
  (cell.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');

const tableToMarkdown = (table: Element): string => {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((row) => Array.from(row.children).map(tableCellText))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (!rows.length) {
    return '';
  }

  const columnCount = Math.max(...rows.map((row) => row.length));

  if (!columnCount || rows.some((row) => row.length !== columnCount)) {
    return rows.map((row) => row.join('\t')).join('\n');
  }

  const [header, ...body] = rows;
  const separator = Array(columnCount).fill('---');
  const markdownRows = [header, separator, ...body].map(
    (row) => `| ${row.join(' | ')} |`
  );

  return `\n\n${markdownRows.join('\n')}\n\n`;
};

const normalizeMarkdown = (markdown: string): string | null => {
  const normalized = markdown
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized.length ? normalized : null;
};

const turndownService = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  headingStyle: 'atx',
  hr: '---',
  strongDelimiter: '**',
});

turndownService.addRule('lineItems', {
  filter: 'li',
  replacement: (content, node, options) => {
    const trimmedContent = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .replace(/\n/gm, '\n    ')
      .replace(/^\\\[( |x)\\\]\s+/, '[$1] ');
    const parent = node.parentNode as HTMLElement;
    let prefix = `${options.bulletListMarker} `;

    if (parent?.nodeName === 'OL') {
      const start = parent.getAttribute('start');
      const index = Array.prototype.indexOf.call(parent.children, node);
      prefix = `${start ? Number(start) + index : index + 1}. `;
    }

    return (
      prefix +
      trimmedContent +
      (node.nextSibling && !/\n$/.test(trimmedContent) ? '\n' : '')
    );
  },
});

turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => (content.trim() ? `~~${content}~~` : ''),
});

turndownService.addRule('links', {
  filter: 'a',
  replacement: (content, node) => {
    const href = safeLink((node as TurndownNode).getAttribute('href'));
    const text = content.trim();

    if (!text) {
      return href ?? '';
    }

    return href ? `[${content}](${href.replace(/([()])/g, '\\$1')})` : content;
  },
});

turndownService.addRule('images', {
  filter: 'img',
  replacement: (content, node) => {
    const element = node as TurndownNode;
    const src = safeImageSource(element.getAttribute('src'));

    if (!src) {
      return element.getAttribute('alt') ?? '';
    }

    const alt = (element.getAttribute('alt') ?? '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[[\]]/g, '');

    return `![${alt}](${src.replace(/([()])/g, '\\$1')})`;
  },
});

turndownService.addRule('tables', {
  filter: 'table',
  replacement: (_content, node) => tableToMarkdown(node as TurndownNode),
});

export const htmlToMarkdown = (html: string): string | null => {
  if (!html.trim()) {
    return null;
  }

  const prepared = prepareHtmlForMarkdown(html);

  return normalizeMarkdown(turndownService.turndown(prepared));
};

export const hasSimplenoteSourceHtmlMarker = (
  html: string | null | undefined
): boolean => html?.includes(SIMPLENOTE_SOURCE_HTML_MARKER) ?? false;

type ClipboardPastePayload = {
  html?: string | null;
  plain?: string | null;
};

export const resolveClipboardPaste = (
  { html, plain }: ClipboardPastePayload,
  includePlainFallback = false
): string | null => {
  const plainText = plain ?? null;

  if (html && hasSimplenoteSourceHtmlMarker(html)) {
    return plainText && plainText.length > 0 ? plainText : null;
  }

  if (html) {
    const markdown = htmlToMarkdown(html);

    if (markdown) {
      return markdown;
    }
  }

  return includePlainFallback && plainText && plainText.length > 0
    ? plainText
    : null;
};

export const clipboardHtmlToMarkdown = (
  clipboardData: Pick<DataTransfer, 'getData'> | null | undefined
): string | null => {
  const html = clipboardData?.getData('text/html');
  const plain = clipboardData?.getData('text/plain');

  return resolveClipboardPaste({ html, plain });
};

const readClipboardItemText = async (
  item: ClipboardItemReader,
  type: string
): Promise<string | null> => {
  if (!item.types.includes(type)) {
    return null;
  }

  try {
    return await (await item.getType(type)).text();
  } catch (e) {
    return null;
  }
};

export const clipboardItemsHtmlToMarkdown = async (
  clipboardItems: ClipboardItemReader[] | null | undefined,
  includePlainFallback = true
): Promise<string | null> => {
  for (const item of clipboardItems ?? []) {
    if (!item.types.includes('text/html')) {
      continue;
    }

    const html = await readClipboardItemText(item, 'text/html');
    const plain = await readClipboardItemText(item, 'text/plain');
    const markdown = resolveClipboardPaste({ html, plain });

    if (markdown) {
      return markdown;
    }
  }

  if (includePlainFallback) {
    for (const item of clipboardItems ?? []) {
      const plain = await readClipboardItemText(item, 'text/plain');

      if (plain) {
        return plain;
      }
    }
  }

  return null;
};

export const insertMarkdownPaste = <Selection>(
  editor: RichPasteEditor<Selection>,
  markdown: string
): boolean => {
  if (markdown.length === 0) {
    return false;
  }

  const selections = editor.getSelections();

  if (!selections?.length) {
    return false;
  }

  const text = withCheckboxCharacters(markdown);

  editor.pushUndoStop();
  editor.executeEdits(
    'richPaste',
    selections.map((selection) => ({
      range: selection,
      text,
      forceMoveMarkers: true,
    }))
  );
  editor.pushUndoStop();

  return true;
};
