import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  type LexicalEditorWithDispose,
  type LexicalNode,
} from 'lexical';
import {
  $convertToMarkdownString,
  registerMarkdownShortcuts,
} from '@lexical/markdown';

import {
  $importMarkdownString,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';

export function makeGfmTestEditor(
  initialMarkdown = ''
): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    createMarkdownEditorExtension(initialMarkdown)
  );
  registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
  return editor;
}

export function importMarkdown(
  editor: LexicalEditorWithDispose,
  markdown: string
): void {
  editor.update(() => $importMarkdownString(markdown), { discrete: true });
}

export function roundtrip(
  editor: LexicalEditorWithDispose,
  markdown: string
): string {
  importMarkdown(editor, markdown);
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

export function rootChildren(editor: LexicalEditorWithDispose): LexicalNode[] {
  return editor.getEditorState().read(() => $getRoot().getChildren());
}
