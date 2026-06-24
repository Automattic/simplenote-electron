import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  $isParagraphNode,
  type LexicalEditorWithDispose,
  type LexicalNode,
} from 'lexical';
import {
  $exportMarkdownString,
  $importMarkdownString,
  createMarkdownEditorExtension,
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
  return editor.getEditorState().read(() => $exportMarkdownString());
}

export function rootChildren(editor: LexicalEditorWithDispose): LexicalNode[] {
  return editor.getEditorState().read(() => $getRoot().getChildren());
}

/** Line-native: N blank lines between blocks is encoded as (N + 1) newlines. */
export function markdownWithGap(
  before: string,
  emptyLineCount: number,
  after: string
): string {
  return `${before}${'\n'.repeat(emptyLineCount + 1)}${after}`;
}

export function countEmptyRootParagraphs(
  editor: LexicalEditorWithDispose
): number {
  return editor.getEditorState().read(
    () =>
      $getRoot()
        .getChildren()
        .filter(
          (node) =>
            $isParagraphNode(node) &&
            node.getChildrenSize() === 0 &&
            node.getTextContent() === ''
        ).length
  );
}
