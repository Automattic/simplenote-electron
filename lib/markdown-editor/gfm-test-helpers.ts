import { buildEditorFromExtensions } from '@lexical/extension';
import { $isListNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode, $isTableRowNode } from '@lexical/table';
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

/** Compact fingerprint for root-level block structure in symmetry tests. */
export function describeRootBlocks(children: LexicalNode[]): string[] {
  return children
    .filter((node) => !$isTransientParagraphNode(node))
    .map((node) => {
      if (isEmptyRootParagraph(node)) {
        return 'empty';
      }

      if ($isTableNode(node)) {
        const row = node.getFirstChild();
        const columns = $isTableRowNode(row) ? row.getChildrenSize() : 0;
        return `table:${columns}x${node.getChildrenSize()}`;
      }

      if ($isListNode(node)) {
        return `list:${node.getListType()}:${node.getChildrenSize()}`;
      }

      if ($isQuoteNode(node)) {
        return `quote:${JSON.stringify(node.getTextContent())}`;
      }

      return node.getType();
    });
}

export function describeRootBlocksFromEditor(
  editor: LexicalEditorWithDispose
): string[] {
  return editor
    .getEditorState()
    .read(() => describeRootBlocks($getRoot().getChildren()));
}

export function makeGfmTestEditorFromMarkdown(
  markdown: string
): LexicalEditorWithDispose {
  const editor = makeGfmTestEditor();
  importMarkdown(editor, markdown);
  return editor;
}

export function idempotentRoundtripMarkdown(markdown: string): {
  once: string;
  twice: string;
} {
  const editor1 = makeGfmTestEditor();
  const once = roundtrip(editor1, markdown);
  editor1.dispose();

  const editor2 = makeGfmTestEditor();
  const twice = roundtrip(editor2, once);
  editor2.dispose();

  return { once, twice };
}

export function stableNoteSwitchMarkdown(
  markdown: string,
  cycles = 2
): { finalMarkdown: string; rootBlocksPerCycle: string[][] } {
  let storeContent = markdown;
  const rootBlocksPerCycle: string[][] = [];

  for (let cycle = 0; cycle < cycles; cycle++) {
    const editor = makeGfmTestEditorFromMarkdown(storeContent);
    rootBlocksPerCycle.push(describeRootBlocksFromEditor(editor));
    storeContent = editor.getEditorState().read(() => $exportMarkdownString());
    editor.dispose();
  }

  return { finalMarkdown: storeContent, rootBlocksPerCycle };
}

export function simulateSaveReopenFromEditor(
  editor: LexicalEditorWithDispose
): {
  storeContent: string;
  rootBlocksAfterReopen: string[];
} {
  const storeContent = editor
    .getEditorState()
    .read(() => $exportMarkdownString());
  editor.dispose();

  const reopened = makeGfmTestEditorFromMarkdown(storeContent);
  const rootBlocksAfterReopen = describeRootBlocksFromEditor(reopened);
  reopened.dispose();

  return { storeContent, rootBlocksAfterReopen };
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
