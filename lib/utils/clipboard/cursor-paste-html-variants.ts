import { buildMarkdownClipboardHtml } from './copy';
import { warmMarkdownRenderer } from '../render-note-to-html';

/** Shared plain-text payload for every HTML variant when bisecting Cursor paste. */
export const CURSOR_PASTE_DEBUG_PLAIN =
  '- [ ] Sample task text for Cursor paste debugging';

export type CursorPasteHtmlVariant = {
  id: string;
  label: string;
  description: string;
  html: string;
};

/** Lexical's native checklist export (from DevTools clipboard inspection). */
export const LEXICAL_NATIVE_CHECKLIST_HTML = `<meta charset="utf-8"><ul __lexicallisttype="check"><li role="checkbox" tabindex="-1" aria-checked="false" value="2" class="task-list-item"><span style="white-space: pre-wrap;">${CURSOR_PASTE_DEBUG_PLAIN.replace(
  /^- \[ \] /,
  ''
)}</span></li></ul>`;

const taskText = CURSOR_PASTE_DEBUG_PLAIN.replace(/^- \[ \] /, '');

/** HTML snippets to bisect what Cursor's agent chat rejects on paste. */
export const CURSOR_PASTE_HTML_VARIANTS: CursorPasteHtmlVariant[] = [
  {
    id: 'lexical-native',
    label: '1. Lexical native (broken in Cursor)',
    description:
      'Exact shape from Simplenote copy before plain-text-only: role=checkbox on <li>, __lexicallisttype, tabindex, value, inline style.',
    html: LEXICAL_NATIVE_CHECKLIST_HTML,
  },
  {
    id: 'lexical-no-role',
    label: '2. Lexical without role=checkbox',
    description: 'Same as native but <li> has no role/tabindex/aria/value.',
    html: `<meta charset="utf-8"><ul __lexicallisttype="check"><li class="task-list-item"><span style="white-space: pre-wrap;">${taskText}</span></li></ul>`,
  },
  {
    id: 'lexical-no-listtype-attr',
    label: '3. Lexical without __lexicallisttype',
    description:
      'Keeps role=checkbox on <li> but drops the custom list attribute.',
    html: `<meta charset="utf-8"><ul><li role="checkbox" tabindex="-1" aria-checked="false" class="task-list-item"><span style="white-space: pre-wrap;">${taskText}</span></li></ul>`,
  },
  {
    id: 'lexical-role-only',
    label: '4. Minimal role=checkbox list item',
    description: 'Isolated test: only role=checkbox on a plain <li>.',
    html: `<ul><li role="checkbox">${taskText}</li></ul>`,
  },
  {
    id: 'lexical-listtype-only',
    label: '5. Minimal __lexicallisttype only',
    description: 'Isolated test: only the Lexical custom attribute on <ul>.',
    html: `<ul __lexicallisttype="check"><li>${taskText}</li></ul>`,
  },
  {
    id: 'plain-ul-li',
    label: '6. Plain ul/li (no ARIA, no inputs)',
    description: 'Standard HTML list with text only.',
    html: `<ul><li>${CURSOR_PASTE_DEBUG_PLAIN}</li></ul>`,
  },
  {
    id: 'plain-ol-li',
    label: '7. Plain ol/li',
    description: 'Ordered list baseline.',
    html: `<ol><li>${taskText}</li></ol>`,
  },
  {
    id: 'showdown-checkbox-enabled',
    label: '8. Showdown-style checkbox (enabled input)',
    description: 'GFM-style <input type="checkbox"> inside <li>, not disabled.',
    html: `<ul><li><input type="checkbox">${taskText}</li></ul>`,
  },
  {
    id: 'showdown-checkbox-disabled',
    label: '9. Showdown-style checkbox (disabled input)',
    description: 'What sanitizeClipboardHtml keeps for outbound copy.',
    html: `<ul><li><input type="checkbox" disabled>${taskText}</li></ul>`,
  },
  {
    id: 'paragraph-literal-markdown',
    label: '10. Paragraph with literal markdown text',
    description: 'No list markup; text includes "- [ ]" prefix.',
    html: `<p>${CURSOR_PASTE_DEBUG_PLAIN}</p>`,
  },
  {
    id: 'meta-charset-wrapper',
    label: '11. meta charset + plain ul/li',
    description: 'Tests whether the meta prefix alone causes issues.',
    html: `<meta charset="utf-8"><ul><li>${taskText}</li></ul>`,
  },
  {
    id: 'showdown-simplenote-sanitized',
    label: '13. Simplenote Showdown export (actual)',
    description:
      'Real buildMarkdownClipboardHtml output: source marker + disabled checkbox + leading space after input.',
    html: '<!--simplenote-clipboard-source:v1--><ul><li><input type="checkbox" disabled=""> Sample task text for Cursor paste debugging</li></ul>',
  },
];

export async function getShowdownSanitizedClipboardHtml(
  markdown = CURSOR_PASTE_DEBUG_PLAIN
): Promise<string | null> {
  await warmMarkdownRenderer();
  return buildMarkdownClipboardHtml(markdown);
}

export function writeDualMimeClipboard(plain: string, html: string): boolean {
  const listener = (event: ClipboardEvent) => {
    if (!event.clipboardData) {
      return;
    }
    event.clipboardData.setData('text/plain', plain);
    event.clipboardData.setData('text/html', html);
    event.preventDefault();
  };

  document.addEventListener('copy', listener);
  const copied = document.execCommand('copy');
  document.removeEventListener('copy', listener);
  return copied;
}
