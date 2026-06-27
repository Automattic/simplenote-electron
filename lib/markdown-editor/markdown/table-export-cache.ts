import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableNode,
  type TableRowNode,
} from '@lexical/table';
import { $getNodeByKey, type LexicalEditor, type NodeKey } from 'lexical';

import {
  registerExportCacheClearer,
  $hasUnmappedContentDirty,
  type MarkdownExportContext,
} from './block-export-cache';
import {
  $buildTableDividerLine,
  $exportTableRowMarkdown,
  type TableRowMarkdownExport,
} from './gfm-transformers';

type TableRowExportCache = Map<NodeKey, TableRowMarkdownExport>;

type TableExportCacheEntry = {
  dividerLine: string | null;
  rows: TableRowExportCache;
};

const tableExportCaches = new WeakMap<
  LexicalEditor,
  Map<NodeKey, TableExportCacheEntry>
>();

function getTableExportCaches(
  editor: LexicalEditor
): Map<NodeKey, TableExportCacheEntry> {
  let caches = tableExportCaches.get(editor);
  if (!caches) {
    caches = new Map();
    tableExportCaches.set(editor, caches);
  }
  return caches;
}

export function clearTableRowExportCaches(editor: LexicalEditor): void {
  tableExportCaches.delete(editor);
}

registerExportCacheClearer(clearTableRowExportCaches);

/** Walk a dirty node key up to its containing table row, if any. */
export function $rootTableRowKeyForDirtyKey(nodeKey: NodeKey): NodeKey | null {
  const node = $getNodeByKey(nodeKey);
  if (node === null) {
    return null;
  }

  let current = node;
  while (current.getParent() !== null && !$isTableNode(current.getParent())) {
    const parent = current.getParent();
    if (parent === null) {
      return null;
    }
    current = parent;
  }

  return $isTableRowNode(current) ? current.getKey() : null;
}

export function $collectDirtyTableRowKeys(
  table: TableNode,
  dirtyElements: ReadonlySet<NodeKey>,
  dirtyLeaves: ReadonlySet<NodeKey>
): Set<NodeKey> {
  const tableKey = table.getKey();
  const dirtyRowKeys = new Set<NodeKey>();

  for (const key of dirtyElements) {
    const rowKey = $rootTableRowKeyForDirtyKey(key);
    if (rowKey === null) {
      continue;
    }

    const row = $getNodeByKey(rowKey);
    if (row?.getParent()?.getKey() === tableKey) {
      dirtyRowKeys.add(rowKey);
    }
  }

  for (const key of dirtyLeaves) {
    const rowKey = $rootTableRowKeyForDirtyKey(key);
    if (rowKey === null) {
      continue;
    }

    const row = $getNodeByKey(rowKey);
    if (row?.getParent()?.getKey() === tableKey) {
      dirtyRowKeys.add(rowKey);
    }
  }

  return dirtyRowKeys;
}

function getTableRowKeys(table: TableNode): NodeKey[] {
  const rowKeys: NodeKey[] = [];

  for (const row of table.getChildren()) {
    if ($isTableRowNode(row)) {
      rowKeys.push(row.getKey());
    }
  }

  return rowKeys;
}

function rowKeysMatchCache(
  table: TableNode,
  rows: TableRowExportCache
): boolean {
  const currentRowKeys = getTableRowKeys(table);
  if (rows.size !== currentRowKeys.length) {
    return false;
  }

  for (const key of currentRowKeys) {
    if (!rows.has(key)) {
      return false;
    }
  }

  return true;
}

function seedTableRowCache(
  table: TableNode,
  entry: TableExportCacheEntry
): void {
  entry.rows.clear();
  entry.dividerLine = null;

  let headerDividerEmitted = false;

  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }

    const exported = $exportTableRowMarkdown(row);
    entry.rows.set(row.getKey(), exported);

    if (exported.isHeaderRow && !headerDividerEmitted) {
      entry.dividerLine = $buildTableDividerLine(table, exported.columnCount);
      headerDividerEmitted = true;
    }
  }
}

function assembleTableMarkdown(
  table: TableNode,
  entry: TableExportCacheEntry,
  dirtyRowKeys: ReadonlySet<NodeKey>
): string {
  const output: string[] = [];
  let headerDividerEmitted = false;

  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) {
      continue;
    }

    const rowKey = row.getKey();
    let exported = entry.rows.get(rowKey);

    if (dirtyRowKeys.has(rowKey) || exported === undefined) {
      exported = $exportTableRowMarkdown(row);
      entry.rows.set(rowKey, exported);
    }

    output.push(exported.line);

    if (exported.isHeaderRow && !headerDividerEmitted) {
      const dividerLine =
        dirtyRowKeys.has(rowKey) || entry.dividerLine === null
          ? $buildTableDividerLine(table, exported.columnCount)
          : entry.dividerLine;
      entry.dividerLine = dividerLine;
      output.push(dividerLine);
      headerDividerEmitted = true;
    }
  }

  return output.join('\n');
}

export function $exportTableMarkdown(
  table: TableNode,
  context: MarkdownExportContext
): string {
  const tableCaches = getTableExportCaches(context.editor);
  const tableKey = table.getKey();
  let entry = tableCaches.get(tableKey);

  if (entry === undefined) {
    entry = { dividerLine: null, rows: new Map() };
    tableCaches.set(tableKey, entry);
  }

  const dirtyRowKeys = $collectDirtyTableRowKeys(
    table,
    context.dirtyElements,
    context.dirtyLeaves
  );
  const rowKeysToExport =
    dirtyRowKeys.size === 0 && $hasUnmappedContentDirty(context)
      ? new Set(getTableRowKeys(table))
      : dirtyRowKeys;

  if (entry.rows.size === 0 || !rowKeysMatchCache(table, entry.rows)) {
    seedTableRowCache(table, entry);
  }

  return assembleTableMarkdown(table, entry, rowKeysToExport);
}
