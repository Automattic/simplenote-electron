import { TableExtension } from '@lexical/table';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableRowNode,
} from '@lexical/table';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';

export const INSERT_TABLE_ROW_ABOVE_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_TABLE_ROW_ABOVE_COMMAND');

export const INSERT_TABLE_ROW_BELOW_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_TABLE_ROW_BELOW_COMMAND');

export const DELETE_TABLE_ROW_COMMAND: LexicalCommand<void> = createCommand(
  'DELETE_TABLE_ROW_COMMAND'
);

export const INSERT_TABLE_COLUMN_BEFORE_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_TABLE_COLUMN_BEFORE_COMMAND');

export const INSERT_TABLE_COLUMN_AFTER_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_TABLE_COLUMN_AFTER_COMMAND');

export const DELETE_TABLE_COLUMN_COMMAND: LexicalCommand<void> = createCommand(
  'DELETE_TABLE_COLUMN_COMMAND'
);

const DEFAULT_TABLE_ROWS = '3';
const DEFAULT_TABLE_COLUMNS = '3';

export const DEFAULT_INSERT_TABLE_PAYLOAD = {
  columns: DEFAULT_TABLE_COLUMNS,
  rows: DEFAULT_TABLE_ROWS,
  includeHeaders: { columns: false, rows: true },
} as const;

function $getAnchorTableCell() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  return $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
}

function $selectTableCellAtColumn(
  row: ReturnType<typeof $insertTableRowAtSelection>,
  columnIndex: number
) {
  if (row === null) {
    return;
  }

  const cell = row.getChildAtIndex(columnIndex);
  if ($isTableCellNode(cell)) {
    cell.selectStart();
  }
}

function $runTableRowInsert(insertAfter: boolean): boolean {
  const anchorCell = $getAnchorTableCell();
  if (anchorCell === null) {
    return false;
  }

  const columnIndex = $getTableColumnIndexFromTableCellNode(anchorCell);
  const row = $insertTableRowAtSelection(insertAfter);
  $selectTableCellAtColumn(row, columnIndex);
  return true;
}

export function registerTableControls(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      INSERT_TABLE_ROW_ABOVE_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          handled = $runTableRowInsert(false);
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_TABLE_ROW_BELOW_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          handled = $runTableRowInsert(true);
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      DELETE_TABLE_ROW_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          if ($getAnchorTableCell() === null) {
            return;
          }
          $deleteTableRowAtSelection();
          handled = true;
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_TABLE_COLUMN_BEFORE_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          if ($getAnchorTableCell() === null) {
            return;
          }
          $insertTableColumnAtSelection(false);
          handled = true;
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_TABLE_COLUMN_AFTER_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          if ($getAnchorTableCell() === null) {
            return;
          }
          $insertTableColumnAtSelection(true);
          handled = true;
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      DELETE_TABLE_COLUMN_COMMAND,
      () => {
        let handled = false;
        editor.update(() => {
          if ($getAnchorTableCell() === null) {
            return;
          }
          $deleteTableColumnAtSelection();
          handled = true;
        });
        return handled;
      },
      COMMAND_PRIORITY_EDITOR
    )
  );
}

/** Whether the current range selection sits inside a table cell. */
export function $isSelectionInTable(): boolean {
  return $getAnchorTableCell() !== null;
}

/** Table row/column dimensions for the table containing the selection. */
export function $getTableDimensionsAtSelection(): {
  columnCount: number;
  rowCount: number;
} | null {
  const anchorCell = $getAnchorTableCell();
  if (anchorCell === null) {
    return null;
  }

  const [, , table] = $getNodeTriplet(anchorCell);
  const firstRow = table.getFirstChild();
  return {
    columnCount:
      firstRow !== null && $isTableRowNode(firstRow)
        ? firstRow.getChildrenSize()
        : 0,
    rowCount: table.getChildrenSize(),
  };
}

export const TableControlsExtension = defineExtension({
  name: '@simplenote/table-controls',
  dependencies: [TableExtension],
  register(editor) {
    return registerTableControls(editor);
  },
});
