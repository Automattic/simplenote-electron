import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableNode,
} from '@lexical/table';

import {
  $collectDirtyRootBlockKeys,
  $expandDirtyRootBlockNeighbors,
  $resolveIncrementalExportKeys,
  $rootChildKeyForDirtyKey,
} from './block-export-cache';
import { $exportMarkdownString } from '../extensions/index';
import { $importMarkdownString } from './import-export';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

const MIXED_NOTE_MARKDOWN = [
  '# Title',
  '',
  'intro paragraph',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '- one',
  '- two',
].join('\n');

describe('block export cache', () => {
  it('maps a dirty cell key to its table root block', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| A |', '| --- |', '| x |'].join('\n'));

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild();
      expect($isTableNode(table)).toBe(true);
      if (!$isTableNode(table)) {
        return;
      }
      const row = table.getLastChild();
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }
      const cell = row.getLastChild();
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected table cell');
      }

      const rootKey = $rootChildKeyForDirtyKey(cell.getKey());
      expect(rootKey).toBe(table.getKey());
    });

    editor.dispose();
  });

  it('expands dirty root blocks to immediate neighbors', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['intro', '', '| A |', '| --- |', '| 1 |'].join('\n')
    );

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      const tableIndex = children.findIndex((child) => $isTableNode(child));
      expect(tableIndex).toBeGreaterThan(0);

      const tableKey = children[tableIndex].getKey();
      const neighborKey = children[tableIndex - 1].getKey();
      const expanded = $expandDirtyRootBlockNeighbors(new Set([tableKey]));
      expect(expanded.has(tableKey)).toBe(true);
      expect(expanded.has(neighborKey)).toBe(true);
    });

    editor.dispose();
  });
});

function getLastRootTable(): TableNode {
  const tables = $getRoot()
    .getChildren()
    .filter((child): child is TableNode => $isTableNode(child));
  const table = tables[tables.length - 1];
  if (table === undefined) {
    throw new Error('Expected table');
  }
  return table;
}

describe('incremental markdown export', () => {
  it('matches full export after seeding the cache', () => {
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString(MIXED_NOTE_MARKDOWN), {
      discrete: true,
    });

    const full = editor.getEditorState().read(() => $exportMarkdownString());

    editor.getEditorState().read(() => {
      const seeded = $exportMarkdownString({
        dirtyElements: new Set([$getRoot().getFirstChild()!.getKey()]),
        dirtyLeaves: new Set(),
        editor,
      });
      expect(seeded).toBe(full);
    });

    editor.dispose();
  });

  it('matches full export after editing one table cell in a multi-table note', () => {
    const tables = Array.from({ length: 3 }, (_, index) =>
      [`| T${index + 1} |`, '| --- |', '| x |'].join('\n')
    ).join('\n\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, tables);

    editor.getEditorState().read(() => {
      $exportMarkdownString({
        dirtyElements: new Set(),
        dirtyLeaves: new Set(),
        editor,
      });
    });

    editor.update(
      () => {
        const table = getLastRootTable();
        const row = table.getLastChild();
        if (!$isTableRowNode(row)) {
          throw new Error('Expected table row');
        }
        const cell = row.getLastChild();
        if (!$isTableCellNode(cell)) {
          throw new Error('Expected table cell');
        }
        cell.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('edited'));
        cell.append(paragraph);
      },
      { discrete: true }
    );

    const {
      incremental,
      full,
      dirtyElements: dirty,
      dirtyLeaves: leaves,
    } = editor.getEditorState().read(() => {
      const dirtyElements = new Set<string>();
      const dirtyLeaves = new Set<string>();
      const table = getLastRootTable();
      const row = table.getLastChild();
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }
      const cell = row.getLastChild();
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected table cell');
      }
      dirtyElements.add(cell.getKey());

      return {
        dirtyElements,
        dirtyLeaves,
        incremental: $exportMarkdownString({
          dirtyElements,
          dirtyLeaves,
          editor,
        }),
        full: $exportMarkdownString(),
      };
    });

    expect(
      editor
        .getEditorState()
        .read(() => $collectDirtyRootBlockKeys(dirty, leaves).size)
    ).toBe(1);
    expect(incremental).toBe(full);

    editor.dispose();
  });

  it('re-exports every root block when dirty keys do not map to blocks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'before\n\nafter');

    editor.getEditorState().read(() => {
      $exportMarkdownString({
        dirtyElements: new Set([$getRoot().getFirstChild()!.getKey()]),
        dirtyLeaves: new Set(),
        editor,
      });
    });

    editor.getEditorState().read(() => {
      const rootKey = $getRoot().getKey();
      const contentBlockKeys = $getRoot()
        .getChildren()
        .filter((node) => !$isTransientParagraphNode(node))
        .map((node) => node.getKey());
      const reExportKeys = $resolveIncrementalExportKeys({
        dirtyElements: new Set([rootKey]),
        dirtyLeaves: new Set(),
        editor,
      });

      expect(reExportKeys.size).toBe(contentBlockKeys.length);
      for (const key of contentBlockKeys) {
        expect(reExportKeys.has(key)).toBe(true);
      }
    });

    editor.dispose();
  });
});
