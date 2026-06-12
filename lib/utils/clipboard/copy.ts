import {
  htmlToMarkdown,
  SIMPLENOTE_SOURCE_HTML_MARKER,
} from './html-to-markdown';
import { renderNoteToHtmlIfReady } from '../render-note-to-html';
import { withCheckboxSyntax } from '../task-transform';
import { normalizeSafeImageSrc, normalizeSafeLinkHref } from '../url-safety';

const monacoClipboardMetadata = 'vscode-editor-data';

const allowedClipboardTags = new Set([
  'a',
  'b',
  'br',
  'blockquote',
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
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

const forbiddenClipboardTags = new Set([
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

type ClipboardWriter = Pick<DataTransfer, 'setData'> &
  Partial<Pick<DataTransfer, 'clearData' | 'getData'>>;

type ClipboardPayload = {
  html?: string | null;
  plain: string;
};

const isHidden = (node: Element): boolean => {
  const style = node instanceof HTMLElement ? node.style : null;
  const styleValue = (property: string) =>
    style?.getPropertyValue(property).trim().toLowerCase() ?? '';
  const opacity = styleValue('opacity');

  return (
    node.hasAttribute('hidden') ||
    node.hasAttribute('inert') ||
    node.getAttribute('aria-hidden') === 'true' ||
    styleValue('display') === 'none' ||
    styleValue('visibility') === 'hidden' ||
    (opacity !== '' && Number(opacity) === 0)
  );
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

const textFromHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
};

export const sanitizeClipboardHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Element);
  }

  nodes.forEach((node) => {
    if (!node.parentNode) {
      return;
    }

    const tagName = node.nodeName.toLowerCase();

    if (isHidden(node) || forbiddenClipboardTags.has(tagName)) {
      node.parentNode.removeChild(node);
      return;
    }

    if (!allowedClipboardTags.has(tagName)) {
      unwrapNode(node);
      return;
    }

    if (tagName === 'a') {
      const href = normalizeSafeLinkHref(node.getAttribute('href'));
      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );

      if (href) {
        node.setAttribute('href', href);
      }
      return;
    }

    if (tagName === 'img') {
      const src = normalizeSafeImageSrc(node.getAttribute('src'));
      const alt = (node.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim();

      if (!src) {
        replaceNodeWithText(node, alt);
        return;
      }

      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );
      node.setAttribute('src', src);

      if (alt) {
        node.setAttribute('alt', alt);
      }
      return;
    }

    if (tagName === 'input') {
      if (node.getAttribute('type') !== 'checkbox') {
        node.parentNode.removeChild(node);
        return;
      }

      const checked = node.hasAttribute('checked');
      Array.from(node.attributes).forEach(({ name }) =>
        node.removeAttribute(name)
      );
      node.setAttribute('type', 'checkbox');
      node.setAttribute('disabled', '');

      if (checked) {
        node.setAttribute('checked', '');
      }
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

    Array.from(node.attributes).forEach(({ name }) =>
      node.removeAttribute(name)
    );
  });

  return doc.body.innerHTML;
};

const escapeHtmlForClipboard = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Preview HTML for outbound clipboard: standard tags (checkbox inputs in
// lists, not Lexical's role="checkbox" on <li>) so paste targets like
// Cursor/VS Code chat can read the selection.
export const buildMarkdownClipboardHtml = (markdown: string): string => {
  const payload = buildSourceClipboardPayload(markdown, true);

  if (payload.html) {
    return payload.html;
  }

  return `<p>${escapeHtmlForClipboard(payload.plain).replace(/\n/g, '<br>')}</p>`;
};

export const buildSourceClipboardPayload = (
  plainText: string,
  markdownEnabled: boolean
): ClipboardPayload => {
  const plain = withCheckboxSyntax(plainText);

  if (!markdownEnabled) {
    return { plain };
  }

  const renderedHtml = renderNoteToHtmlIfReady(plain);

  return {
    plain,
    html: renderedHtml
      ? `${SIMPLENOTE_SOURCE_HTML_MARKER}${sanitizeClipboardHtml(renderedHtml)}`
      : null,
  };
};

export const buildPreviewClipboardPayload = (
  content: string,
  markdownEnabled: boolean,
  fallbackText = ''
): ClipboardPayload => {
  if (!markdownEnabled) {
    return { plain: withCheckboxSyntax(fallbackText || content) };
  }

  const renderedHtml = renderNoteToHtmlIfReady(content);

  if (!renderedHtml) {
    return { plain: withCheckboxSyntax(fallbackText || content) };
  }

  const html = sanitizeClipboardHtml(renderedHtml);

  return {
    html,
    plain: htmlToMarkdown(html) ?? textFromHtml(html) ?? fallbackText,
  };
};

export const writePlainTextOnlyClipboard = (
  clipboardData: ClipboardWriter & Pick<DataTransfer, 'types'>,
  plain: string
): boolean => {
  try {
    for (const type of [...clipboardData.types]) {
      clipboardData.clearData?.(type);
    }
    clipboardData.setData('text/plain', plain);
    return true;
  } catch {
    return false;
  }
};

export const writeClipboardPayload = (
  clipboardData: ClipboardWriter,
  payload: ClipboardPayload
): boolean => {
  try {
    clipboardData.clearData?.('text/html');
    clipboardData.clearData?.(monacoClipboardMetadata);
    clipboardData.setData('text/plain', payload.plain);

    if (payload.html) {
      clipboardData.setData('text/html', payload.html);
    }

    return true;
  } catch (e) {
    return false;
  }
};

export const selectionIsInsideNode = (
  node: Node,
  selection: Selection | null
): boolean => {
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  return (
    !!anchorNode &&
    !!focusNode &&
    node.contains(anchorNode) &&
    node.contains(focusNode)
  );
};

export const shouldCopyWholePreview = (
  node: HTMLElement,
  selection: Selection | null,
  activeElement: Element | null
): boolean => {
  if (selection && !selection.isCollapsed) {
    return false;
  }

  return (
    node.contains(activeElement) ||
    activeElement === node ||
    selectionIsInsideNode(node, selection)
  );
};
