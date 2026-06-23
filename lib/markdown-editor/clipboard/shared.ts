import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import type { LexicalEditor, LexicalNode } from 'lexical';

import { parseNamespacedLexicalClipboardJson } from '../clipboard-lexical-json';
import { resolveClipboardPaste } from '../../utils/clipboard/html-to-markdown';

// Cut/copy of one full list line ends with a linebreak; prefer markdown paste
// over Lexical JSON so the item is reinserted as its own bullet, not merged.
const SINGLE_COMPLETE_LIST_LINE =
  /^\s{0,3}(?:[-*+]\s(?:\[[ xX]\]\s)?|\d+\.\s).+\n$/;

// Full code-block copies put fences in text/markdown but Lexical JSON only
// carries the inner text nodes. Prefer markdown paste so the block is restored.
const COMPLETE_FENCED_CODE_BLOCK =
  /^(`{3,}|~{3,})([^\n]*)\n[\s\S]*?\n\1(?:\n|$)/;

// Full blockquote copies put `> ` prefixes in text/markdown but Lexical JSON
// only carries the inner text nodes. Prefer markdown paste so the quote block
// is restored.
const COMPLETE_BLOCKQUOTE = /^(?:> .+(?:\n|$))+$/;

export function $shouldPreferMarkdownPasteOverLexicalJson(
  markdown: string
): boolean {
  return (
    SINGLE_COMPLETE_LIST_LINE.test(markdown) ||
    COMPLETE_FENCED_CODE_BLOCK.test(markdown) ||
    COMPLETE_BLOCKQUOTE.test(markdown)
  );
}

export const MARKDOWN_CLIPBOARD_MIME_TYPE = 'text/markdown';

export type ClipboardMarkdownSource =
  | 'text/markdown'
  | 'text/html'
  | 'text/plain';

export type ClipboardMarkdownPayload = {
  markdown: string;
  source: ClipboardMarkdownSource;
};

export function $getClipboardMarkdownFromDataTransfer(
  clipboardData: Pick<DataTransfer, 'getData'>
): ClipboardMarkdownPayload | null {
  const markdownMime = clipboardData.getData(MARKDOWN_CLIPBOARD_MIME_TYPE);
  if (markdownMime) {
    return { markdown: markdownMime, source: 'text/markdown' };
  }

  const html = clipboardData.getData('text/html');
  const plain = clipboardData.getData('text/plain');

  if (html) {
    const fromHtml = resolveClipboardPaste({ html, plain });
    if (fromHtml) {
      return { markdown: fromHtml, source: 'text/html' };
    }
  }

  if (plain) {
    return { markdown: plain, source: 'text/plain' };
  }

  return null;
}

// Editor-internal copies carry lossless Lexical JSON. Returns its nodes, or
// null when the clipboard holds no JSON or it came from a different editor (the
// namespace check mirrors Lexical's own importer). Shared by the paste handler
// and the ClipboardImportExtension importer so the parse rule lives in one spot.
export function $parseSameEditorClipboardJson(
  editor: LexicalEditor,
  dataTransfer: DataTransfer
): LexicalNode[] | null {
  const json = dataTransfer.getData('application/x-lexical-editor');
  if (!json) {
    return null;
  }
  const payload = parseNamespacedLexicalClipboardJson(
    json,
    editor._config.namespace
  );
  return payload ? $generateNodesFromSerializedNodes(payload.nodes) : null;
}
