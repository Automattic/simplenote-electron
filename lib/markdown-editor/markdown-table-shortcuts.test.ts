import { $convertToMarkdownString } from '@lexical/markdown';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isCodeNode } from '@lexical/code-core';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditorWithDispose,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

function selectTableCell(
  editor: LexicalEditorWithDispose,
  rowIndex: number,
  columnIndex: number
): void {
  editor.update(
    () => {
      const table = $getRoot().getFirstChild();
      if (!table || !$isTableNode(table)) {
        throw new Error('Expected table at root');
      }
      const row = table.getChildAtIndex(rowIndex);
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }
      const cell = row.getChildAtIndex(columnIndex);
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected table cell');
      }
      cell.selectStart();
    },
    { discrete: true }
  );
}

async function typeText(
  editor: LexicalEditorWithDispose,
  text: string
): Promise<void> {
  for (const char of text) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }
  await Promise.resolve();
}

function cellHasQuoteOrCodeBlock(editor: LexicalEditorWithDispose): boolean {
  return editor.getEditorState().read(() => {
    const table = $getRoot().getFirstChild();
    if (!$isTableNode(table)) {
      return false;
    }
    const row = table.getChildAtIndex(1);
    const cell = row?.getChildAtIndex(0);
    if (!cell) {
      return false;
    }
    for (const child of cell.getChildren()) {
      if ($isQuoteNode(child) || $isCodeNode(child)) {
        return true;
      }
    }
    return false;
  });
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

describe('block markdown shortcuts in table cells', () => {
  it('does not turn "> " into a blockquote inside a cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| Cell |', '| --- |', '| |'].join('\n'));
    selectTableCell(editor, 1, 0);

    await typeText(editor, '> test');

    expect(cellHasQuoteOrCodeBlock(editor)).toBe(false);
    expect(exportMarkdown(editor)).toBe('| Cell |\n| --- |\n| > test |');

    editor.dispose();
  });

  it('does not turn "```" into a fenced code block inside a cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| Cell |', '| --- |', '| |'].join('\n'));
    selectTableCell(editor, 1, 0);

    await typeText(editor, '```');
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertParagraph();
        }
      },
      { discrete: true }
    );
    await typeText(editor, 'line');
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertParagraph();
        }
      },
      { discrete: true }
    );
    await typeText(editor, '```');

    expect(cellHasQuoteOrCodeBlock(editor)).toBe(false);

    editor.dispose();
  });
});
