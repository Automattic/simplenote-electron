import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditorWithDispose,
} from 'lexical';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';

import {
  DEFAULT_INSERT_TABLE_PAYLOAD,
  DELETE_TABLE_COLUMN_COMMAND,
  DELETE_TABLE_ROW_COMMAND,
  INSERT_TABLE_COLUMN_AFTER_COMMAND,
  INSERT_TABLE_COLUMN_BEFORE_COMMAND,
  INSERT_TABLE_ROW_ABOVE_COMMAND,
  INSERT_TABLE_ROW_BELOW_COMMAND,
  $getTableDimensionsAtSelection,
} from './table-controls';
import {
  importMarkdown,
  makeGfmTestEditor,
  rootChildren,
} from './gfm-test-helpers';

const simpleTable = ['| City | Days |', '| --- | --- |', '| Kyoto | 3 |'].join(
  '\n'
);

// Command listeners commit on the next microtask (see tab-indentation.test.ts).
async function dispatchTableCommand(
  editor: LexicalEditorWithDispose,
  command: Parameters<LexicalEditorWithDispose['dispatchCommand']>[0]
) {
  editor.dispatchCommand(command, undefined);
  await Promise.resolve();
}

function selectTableCell(
  editor: ReturnType<typeof makeGfmTestEditor>,
  rowIndex: number,
  columnIndex: number
) {
  editor.update(
    () => {
      const table = rootChildren(editor)[0];
      if (!$isTableNode(table)) {
        throw new Error('expected table at root');
      }

      const row = table.getChildAtIndex(rowIndex);
      if (!$isTableRowNode(row)) {
        throw new Error('expected table row');
      }

      const cell = row.getChildAtIndex(columnIndex);
      if (!$isTableCellNode(cell)) {
        throw new Error('expected table cell');
      }

      cell.selectStart();
    },
    { discrete: true }
  );
}

function tableDimensions(editor: ReturnType<typeof makeGfmTestEditor>) {
  return editor.getEditorState().read(() => $getTableDimensionsAtSelection());
}

describe('table controls', () => {
  it('inserts a 3×3 table with a header row via INSERT_TABLE_COMMAND', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        $getRoot().clear();
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    editor.dispatchCommand(INSERT_TABLE_COMMAND, DEFAULT_INSERT_TABLE_PAYLOAD);
    await Promise.resolve();

    editor.getEditorState().read(() => {
      const table = rootChildren(editor).find($isTableNode);
      expect(table).toBeDefined();
      expect(table!.getChildrenSize()).toBe(3);
      expect(table!.getFirstChild()?.getChildrenSize()).toBe(3);
    });
    editor.dispose();
  });

  it('inserts a row below the current cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 1, 0);

    await dispatchTableCommand(editor, INSERT_TABLE_ROW_BELOW_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 2, rowCount: 3 });
    editor.dispose();
  });

  it('inserts a row above the current cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 1, 0);

    await dispatchTableCommand(editor, INSERT_TABLE_ROW_ABOVE_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 2, rowCount: 3 });
    editor.dispose();
  });

  it('deletes the current row', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 1, 0);

    await dispatchTableCommand(editor, DELETE_TABLE_ROW_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 2, rowCount: 1 });
    editor.dispose();
  });

  it('inserts a column after the current cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 0, 0);

    await dispatchTableCommand(editor, INSERT_TABLE_COLUMN_AFTER_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 3, rowCount: 2 });
    editor.dispose();
  });

  it('inserts a column before the current cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 0, 1);

    await dispatchTableCommand(editor, INSERT_TABLE_COLUMN_BEFORE_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 3, rowCount: 2 });
    editor.dispose();
  });

  it('deletes the current column', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 0, 1);

    await dispatchTableCommand(editor, DELETE_TABLE_COLUMN_COMMAND);

    expect(tableDimensions(editor)).toEqual({ columnCount: 1, rowCount: 2 });
    editor.dispose();
  });

  it('moves the selection into a newly inserted row at the same column', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);
    selectTableCell(editor, 1, 1);

    await dispatchTableCommand(editor, INSERT_TABLE_ROW_ABOVE_COMMAND);

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);

      const anchorNode = selection!.anchor.getNode();
      const cell = $isTableCellNode(anchorNode)
        ? anchorNode
        : anchorNode.getParents().find($isTableCellNode);

      expect($isTableCellNode(cell)).toBe(true);
      expect($getTableRowIndexFromTableCellNode(cell!)).toBe(1);
      expect(cell!.getTextContent()).toBe('');
    });
    editor.dispose();
  });
});
