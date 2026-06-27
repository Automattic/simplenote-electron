import { $getRoot } from 'lexical';
import { $isTableCellNode, $isTableRowNode } from '@lexical/table';

import * as gfmTransformers from './gfm-transformers';
import {
  INSERT_TABLE_COLUMN_AFTER_COMMAND,
  INSERT_TABLE_ROW_BELOW_COMMAND,
} from '../extensions/table-controls';
import {
  buildTableMarkdown,
  exportFullMarkdown,
  exportIncrementalMarkdown,
  getRootTable,
  getTableCellAt,
  rootTableKeyForDirtyKey,
  rootTableRowKeyForDirtyKey,
  seedBlockExportCache,
  selectTableCell,
  setTableCellText,
} from './table-export-test-helpers';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

async function dispatchTableCommand(
  editor: ReturnType<typeof makeGfmTestEditor>,
  command: typeof INSERT_TABLE_ROW_BELOW_COMMAND
) {
  editor.dispatchCommand(command, undefined);
  await Promise.resolve();
}

describe('table row export (Phase 3 contract)', () => {
  it('maps a dirty cell key to its table row and root table block', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, buildTableMarkdown(3, 2));

    editor.getEditorState().read(() => {
      const cell = getTableCellAt(getRootTable(), 2, 1);
      const cellKey = cell.getKey();

      expect(rootTableRowKeyForDirtyKey(cellKey)).toBe(
        getRootTable().getChildAtIndex(2)?.getKey()
      );
      expect(rootTableKeyForDirtyKey(cellKey)).toBe(getRootTable().getKey());
      expect(rootTableRowKeyForDirtyKey(cellKey)).not.toBe(
        rootTableKeyForDirtyKey(cellKey)
      );
    });

    editor.dispose();
  });

  it('maps a dirty row key to itself', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, buildTableMarkdown(2, 2));

    editor.getEditorState().read(() => {
      const row = getRootTable().getFirstChild();
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }

      expect(rootTableRowKeyForDirtyKey(row.getKey())).toBe(row.getKey());
    });

    editor.dispose();
  });
});

describe('single-table export equivalence (Phase 3 reference)', () => {
  const alignedTable = [
    '| L | C | R |',
    '| :--- | :---: | ---: |',
    '| a | b | c |',
  ].join('\n');

  const formattedTable = [
    '| **Bold** | `code` |',
    '| --- | --- |',
    '| [x](https://example.com) | y |',
  ].join('\n');

  it('matches full export after a body cell edit in a large single-table note', () => {
    const markdown = buildTableMarkdown(20, 10);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 5, 3, 'edited');
    const dirtyElements = new Set([cell.getKey()]);

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('matches full export after a header cell edit', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, alignedTable);
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 0, 1, 'Center');
    const dirtyElements = new Set([cell.getKey()]);

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('matches full export after editing inline markdown in a cell', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, formattedTable);
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 1, 1, 'changed');
    const dirtyElements = new Set([cell.getKey()]);

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('matches full export after inserting a table row', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, buildTableMarkdown(3, 2));
    seedBlockExportCache(editor);

    selectTableCell(editor, 1, 0);
    await dispatchTableCommand(editor, INSERT_TABLE_ROW_BELOW_COMMAND);

    const dirtyElements = editor.getEditorState().read(() => {
      const keys = new Set<string>();
      for (const row of getRootTable().getChildren()) {
        if ($isTableRowNode(row)) {
          keys.add(row.getKey());
        }
      }
      return keys;
    });

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('marks only the table root block dirty for a single cell edit', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, buildTableMarkdown(10, 10));
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 4, 4, 'x');

    editor.getEditorState().read(() => {
      expect($getRoot().getChildren()).toHaveLength(1);
      expect(rootTableKeyForDirtyKey(cell.getKey())).toBe(
        getRootTable().getKey()
      );
    });

    editor.dispose();
  });
});

describe('Phase 3 row cache', () => {
  it('re-exports only dirty rows inside a single-table note (not all R × C cells)', () => {
    const markdown = buildTableMarkdown(20, 10);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);
    seedBlockExportCache(editor);

    const exportRowSpy = jest.spyOn(gfmTransformers, '$exportTableRowMarkdown');
    exportRowSpy.mockClear();

    const cell = setTableCellText(editor, 5, 3, 'edited');
    const dirtyElements = new Set([cell.getKey()]);

    exportIncrementalMarkdown(editor, dirtyElements);

    expect(exportRowSpy).toHaveBeenCalledTimes(1);

    exportRowSpy.mockRestore();
    editor.dispose();
  });

  it('matches full export via $exportTableMarkdown when row cache is warm', () => {
    const markdown = buildTableMarkdown(20, 10);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 8, 4, 'warm');
    const dirtyElements = new Set([cell.getKey()]);

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('invalidates row cache on column insert', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, buildTableMarkdown(3, 2));
    seedBlockExportCache(editor);

    selectTableCell(editor, 0, 0);
    await dispatchTableCommand(editor, INSERT_TABLE_COLUMN_AFTER_COMMAND);

    const dirtyElements = editor.getEditorState().read(() => {
      const keys = new Set<string>();
      for (const row of getRootTable().getChildren()) {
        if ($isTableRowNode(row)) {
          for (const cell of row.getChildren()) {
            if ($isTableCellNode(cell)) {
              keys.add(cell.getKey());
            }
          }
        }
      }
      return keys;
    });

    expect(exportIncrementalMarkdown(editor, dirtyElements)).toBe(
      exportFullMarkdown(editor)
    );

    editor.dispose();
  });

  it('recomputes divider line when header row is dirty', () => {
    const alignedTable = [
      '| L | C | R |',
      '| :--- | :---: | ---: |',
      '| a | b | c |',
    ].join('\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, alignedTable);
    seedBlockExportCache(editor);

    const cell = setTableCellText(editor, 0, 1, 'Center');
    const dirtyElements = new Set([cell.getKey()]);
    const exported = exportIncrementalMarkdown(editor, dirtyElements);

    expect(exported).toContain('| L | Center | R |');
    expect(exported).toContain('| :--- | :---: | ---: |');
    expect(exported).toBe(exportFullMarkdown(editor));

    editor.dispose();
  });
});
