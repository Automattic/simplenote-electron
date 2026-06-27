import { $isTableCellNode, $isTableRowNode } from '@lexical/table';

import {
  buildTableMarkdown,
  exportFullMarkdown,
  exportIncrementalMarkdown,
  getRootTable,
  insertTextAtSelection,
  seedBlockExportCache,
  selectTableCell,
} from './table-export-test-helpers';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

describe('table export performance', () => {
  it('exports a 50×50 plain table correctly', () => {
    const markdown = buildTableMarkdown(50, 50);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    expect(exportFullMarkdown(editor)).toBe(markdown);

    editor.dispose();
  });

  it('records 50×50 plain table full export timing', () => {
    const markdown = buildTableMarkdown(50, 50);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    const start = performance.now();
    const exported = exportFullMarkdown(editor);
    const ms = performance.now() - start;

    expect(exported).toBe(markdown);
    console.log(`50×50 plain table full export: ${ms.toFixed(1)}ms`);

    editor.dispose();
  });

  it('records 50×50 sparse formatted table full export timing', () => {
    const markdown = buildTableMarkdown(50, 50, (row, col) =>
      row === 0 && col === 0
        ? '**bold**'
        : (row + col) % 20 === 0
          ? '`code`'
          : `${row + 1}${col + 1}`
    );
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    const start = performance.now();
    const exported = exportFullMarkdown(editor);
    const ms = performance.now() - start;

    expect(exported).toBe(markdown);
    console.log(`50×50 sparse formatted table full export: ${ms.toFixed(1)}ms`);

    editor.dispose();
  });

  it('records single cell edit export timing in a 50×50 single-table note', () => {
    const markdown = buildTableMarkdown(50, 50);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);
    seedBlockExportCache(editor);

    selectTableCell(editor, 25, 25);
    insertTextAtSelection(editor, '!');

    const { incrementalMs, fullMs } = editor.getEditorState().read(() => {
      const row = getRootTable().getChildAtIndex(25);
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }
      const cell = row.getLastChild();
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected table cell');
      }

      const dirtyElements = new Set([cell.getKey()]);
      const incrementalStart = performance.now();
      exportIncrementalMarkdown(editor, dirtyElements);
      const incrementalMs = performance.now() - incrementalStart;

      const fullStart = performance.now();
      exportFullMarkdown(editor);
      const fullMs = performance.now() - fullStart;

      return { incrementalMs, fullMs };
    });

    console.log(
      `50×50 single-table cell edit export: ${incrementalMs.toFixed(1)}ms incremental (full ${fullMs.toFixed(1)}ms) — Phase 3 row cache target < 16ms`
    );
    expect(incrementalMs).toBeLessThan(500);
    expect(incrementalMs).toBeLessThan(fullMs / 3);

    editor.dispose();
  });
});
