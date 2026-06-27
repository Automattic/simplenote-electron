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
import { $markdownToNodes, clearBlockExportCache } from './import-export';
import { $isTransientParagraphNode } from './transient-paragraph-node';

function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isParagraphNode(node) &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

/** Root-level blocks excluding structural transient paragraphs. */
export function contentRootChildren(
  editor: LexicalEditorWithDispose
): LexicalNode[] {
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .filter((node) => !$isTransientParagraphNode(node))
  );
}

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
  clearBlockExportCache(editor);
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
  return editor
    .getEditorState()
    .read(() => $getRoot().getChildren().filter(isEmptyRootParagraph).length);
}

/** Import two blocks back-to-back with no empty root paragraph between them. */
export function makeEditorWithAdjacentBlocks(
  before: string,
  after: string
): LexicalEditorWithDispose {
  const editor = makeGfmTestEditor();
  importMarkdown(editor, before);
  editor.update(
    () => {
      for (const node of $markdownToNodes(after)) {
        $getRoot().append(node);
      }
    },
    { discrete: true }
  );
  return editor;
}
