import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditorWithDispose,
  type NodeKey,
} from 'lexical';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableCellNode,
  type TableNode,
} from '@lexical/table';

import { $exportMarkdownString } from '../extensions/index';
import type { MarkdownExportContext } from './import-export';

/** Build a GFM pipe table with a header row, divider, and (rows - 1) body rows. */
export function buildTableMarkdown(
  rows: number,
  cols: number,
  cellFn?: (row: number, col: number) => string
): string {
  const header = Array.from({ length: cols }, (_, c) => `C${c + 1}`).join(
    ' | '
  );
  const divider = Array.from({ length: cols }, () => '---').join(' | ');
  const body = Array.from({ length: rows - 1 }, (_row, row) =>
    Array.from(
      { length: cols },
      (_col, col) => cellFn?.(row, col) ?? `${row + 1}${col + 1}`
    ).join(' | ')
  );

  return [
    `| ${header} |`,
    `| ${divider} |`,
    ...body.map((row) => `| ${row} |`),
  ].join('\n');
}

export function getRootTable(): TableNode {
  const table = $getRoot().getFirstChild();
  if (!$isTableNode(table)) {
    throw new Error('Expected table at root');
  }
  return table;
}

export function getTableCellAt(
  table: TableNode,
  rowIndex: number,
  columnIndex: number
): TableCellNode {
  const row = table.getChildAtIndex(rowIndex);
  if (!$isTableRowNode(row)) {
    throw new Error('Expected table row');
  }

  const cell = row.getChildAtIndex(columnIndex);
  if (!$isTableCellNode(cell)) {
    throw new Error('Expected table cell');
  }

  return cell;
}

export function selectTableCell(
  editor: LexicalEditorWithDispose,
  rowIndex: number,
  columnIndex: number
): void {
  editor.update(
    () => {
      getTableCellAt(getRootTable(), rowIndex, columnIndex).selectEnd();
    },
    { discrete: true }
  );
}

export function setTableCellText(
  editor: LexicalEditorWithDispose,
  rowIndex: number,
  columnIndex: number,
  text: string
): TableCellNode {
  let cellKey = '';

  editor.update(
    () => {
      const cell = getTableCellAt(getRootTable(), rowIndex, columnIndex);
      cell.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      cell.append(paragraph);
      cellKey = cell.getKey();
    },
    { discrete: true }
  );

  return editor.getEditorState().read(() => {
    const cell = $getNodeByKey(cellKey);
    if (!$isTableCellNode(cell)) {
      throw new Error('Expected table cell');
    }
    return cell;
  });
}

export function insertTextAtSelection(
  editor: LexicalEditorWithDispose,
  text: string
): void {
  editor.update(
    () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      selection.insertText(text);
    },
    { discrete: true }
  );
}

/** Seed the Phase 2 root block export cache (cold → warm). */
export function seedBlockExportCache(editor: LexicalEditorWithDispose): void {
  editor.getEditorState().read(() => {
    $exportMarkdownString({
      dirtyElements: new Set<NodeKey>(),
      dirtyLeaves: new Set<NodeKey>(),
      editor,
    });
  });
}

export function exportIncrementalMarkdown(
  editor: LexicalEditorWithDispose,
  dirtyElements: ReadonlySet<NodeKey>,
  dirtyLeaves: ReadonlySet<NodeKey> = new Set()
): string {
  return editor.getEditorState().read(() =>
    $exportMarkdownString({
      dirtyElements,
      dirtyLeaves,
      editor,
    } satisfies MarkdownExportContext)
  );
}

export function exportFullMarkdown(editor: LexicalEditorWithDispose): string {
  return editor.getEditorState().read(() => $exportMarkdownString());
}

export { $rootTableRowKeyForDirtyKey as rootTableRowKeyForDirtyKey } from './table-export-cache';

export function rootTableKeyForDirtyKey(nodeKey: NodeKey): NodeKey | null {
  const node = $getNodeByKey(nodeKey);
  if (node === null) {
    return null;
  }

  let current = node;
  while (
    current.getParent() !== null &&
    current.getParent()?.getKey() !== $getRoot().getKey()
  ) {
    const parent = current.getParent();
    if (parent === null) {
      return null;
    }
    current = parent;
  }

  return current.getParent() === $getRoot() ? current.getKey() : null;
}
