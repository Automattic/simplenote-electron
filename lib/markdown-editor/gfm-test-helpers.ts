import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  type LexicalEditorWithDispose,
  type LexicalNode,
} from 'lexical';
import { $convertToMarkdownString } from '@lexical/markdown';

import {
  $importMarkdownString,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';

export function makeGfmTestEditor(
  initialMarkdown = ''
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    createMarkdownEditorExtension(initialMarkdown)
  );
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
