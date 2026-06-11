import { buildEditorFromExtensions } from '@lexical/extension';
import { $getRoot, type LexicalEditor, type LexicalNode } from 'lexical';
import {
  $convertToMarkdownString,
  registerMarkdownShortcuts,
} from '@lexical/markdown';

import {
  $importMarkdownString,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';

export function makeGfmTestEditor(initialMarkdown = ''): LexicalEditor {
  const editor = buildEditorFromExtensions(
    createMarkdownEditorExtension(initialMarkdown)
  );
  registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
  return editor;
}

export function importMarkdown(editor: LexicalEditor, markdown: string): void {
  editor.update(() => $importMarkdownString(markdown), { discrete: true });
}

export function roundtrip(editor: LexicalEditor, markdown: string): string {
  importMarkdown(editor, markdown);
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

export function rootChildren(editor: LexicalEditor): LexicalNode[] {
  return editor.getEditorState().read(() => $getRoot().getChildren());
}
