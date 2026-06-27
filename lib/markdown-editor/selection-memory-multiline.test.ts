import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import { $isTableNode } from '@lexical/table';

import { $exportMarkdownString } from './extensions';
import { $importRemoteMarkdown } from './import-export';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import {
  $captureMarkdownSelectionOffsets,
  $captureStructuredSelection,
  $restoreMarkdownSelectionOffsets,
} from './selection-memory';
import {
  buildTableMarkdown,
  getTableCellAt,
  selectTableCell,
} from './table-export-test-helpers';

function getRootTableNode() {
  for (const child of $getRoot().getChildren()) {
    if ($isTableNode(child)) {
      return child;
    }
  }
  throw new Error('Expected table at root');
}

function restoreAndCapture(
  editor: ReturnType<typeof makeGfmTestEditor>,
  offsets: { anchor: number; focus: number; direction?: 'LTR' | 'RTL' }
) {
  editor.update(
    () => {
      expect(
        $restoreMarkdownSelectionOffsets({
          anchor: offsets.anchor,
          focus: offsets.focus,
          direction: offsets.direction ?? 'LTR',
        })
      ).toBe(true);
    },
    { discrete: true }
  );

  return editor.read(() => $captureMarkdownSelectionOffsets());
}

describe('selection memory multiline regressions', () => {
  describe('inter-block gap offsets', () => {
    it('maps an offset in a paragraph gap to the end of the previous paragraph', () => {
      const markdown = 'hello\n\nworld';
      const editor = makeGfmTestEditor();
      importMarkdown(editor, markdown);

      const restored = restoreAndCapture(editor, { anchor: 6, focus: 6 });

      expect(restored).toEqual({
        anchor: 5,
        focus: 5,
        direction: 'LTR',
      });

      editor.dispose();
    });

    it('maps an offset in the gap before a table to the end of the previous block', () => {
      const table = buildTableMarkdown(2, 2);
      const markdown = `intro\n${table}\n\noutro`;
      const editor = makeGfmTestEditor();
      importMarkdown(editor, markdown);

      const gapOffset = 'intro'.length;
      const restored = restoreAndCapture(editor, {
        anchor: gapOffset,
        focus: gapOffset,
      });

      expect(restored?.anchor).toBe('intro'.length);

      editor.dispose();
    });

    it('maps an offset in the gap after a table to the end of the table block', () => {
      const table = buildTableMarkdown(2, 2);
      const markdown = `intro\n\n${table}\n\noutro`;
      const editor = makeGfmTestEditor();
      importMarkdown(editor, markdown);

      const exported = editor
        .getEditorState()
        .read(() => $exportMarkdownString());
      const outroStart = exported.indexOf('outro');
      const gapOffset = outroStart - 1;

      const restored = restoreAndCapture(editor, {
        anchor: gapOffset,
        focus: gapOffset,
      });

      expect(restored?.anchor).toBe(outroStart - 2);

      editor.dispose();
    });
  });

  describe('tables', () => {
    it('restores the caret in the same table cell after a remote re-import', () => {
      const table = buildTableMarkdown(3, 3);
      const editor = makeGfmTestEditor();
      importMarkdown(editor, table);

      selectTableCell(editor, 1, 1);
      const saved = editor.getEditorState().read(() => {
        const offsets = $captureMarkdownSelectionOffsets();
        if (offsets === null) {
          throw new Error('Expected selection offsets in table cell');
        }
        return offsets;
      });

      editor.update(
        () => {
          $importRemoteMarkdown(table, table);
        },
        { discrete: true }
      );

      editor.read(() => {
        expect($captureMarkdownSelectionOffsets()).toEqual(saved);
      });

      editor.dispose();
    });

    it('remaps the caret within a table cell when remote text is inserted before it', () => {
      const table = buildTableMarkdown(2, 2, (row, col) =>
        row === 0 && col === 0 ? 'cell' : `${row}${col}`
      );
      const local = table;
      const remote = local.replace('| cell |', '| NEW cell |');
      const editor = makeGfmTestEditor();
      importMarkdown(editor, local);

      selectTableCell(editor, 1, 0);
      editor.update(
        () => {
          const cell = getTableCellAt(getRootTableNode(), 1, 0);
          const textNode = cell.getFirstDescendant();
          if (!$isTextNode(textNode)) {
            throw new Error('Expected cell text');
          }
          textNode.select(4, 4);
        },
        { discrete: true }
      );

      const before = editor.getEditorState().read(() => ({
        structured: $captureStructuredSelection(),
        anchorOffset: $isRangeSelection($getSelection())
          ? $getSelection()!.anchor.offset
          : -1,
      }));

      editor.update(
        () => {
          $importRemoteMarkdown(remote, local);
        },
        { discrete: true }
      );

      editor.read(() => {
        const after = {
          structured: $captureStructuredSelection(),
          anchorOffset: $isRangeSelection($getSelection())
            ? $getSelection()!.anchor.offset
            : -1,
          anchorText: $isRangeSelection($getSelection())
            ? $getSelection()!.anchor.getNode().getTextContent()
            : '',
        };
        expect(after.structured?.anchor.path).toEqual(
          before.structured?.anchor.path
        );
        expect(after.anchorText).toBe('NEW cell');
        expect(after.anchorOffset).toBe(before.anchorOffset + 'NEW '.length);
      });

      editor.dispose();
    });
  });

  describe('zero-length exported root blocks', () => {
    it.todo(
      'keeps offsets aligned when a root block is omitted from exported markdown'
    );
  });

  describe('remote sync local baseline', () => {
    it('remaps selection using the live document markdown, not a stale export snapshot', () => {
      const liveLocal = 'hello!\n\nworld';
      const remote = 'hello sync\n\nworld';
      const editor = makeGfmTestEditor();
      importMarkdown(editor, liveLocal);

      editor.update(
        () => {
          for (const child of $getRoot().getChildren()) {
            if (!$isParagraphNode(child)) {
              continue;
            }
            const textNode = child.getFirstChild();
            if (
              $isTextNode(textNode) &&
              textNode.getTextContent() === 'hello!'
            ) {
              textNode.select(6, 6);
              return;
            }
          }
          throw new Error('Expected hello paragraph');
        },
        { discrete: true }
      );

      editor.update(
        () => {
          $importRemoteMarkdown(remote, liveLocal);
        },
        { discrete: true }
      );

      editor.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        expect(selection.anchor.getNode().getTextContent()).toContain('sync');
      });

      editor.dispose();
    });

    it('remaps correctly even when the stale local markdown baseline differs', () => {
      const staleLocal = 'hello\n\nworld';
      const liveLocal = 'hello!\n\nworld';
      const remote = 'hello sync\n\nworld';
      const editor = makeGfmTestEditor();
      importMarkdown(editor, liveLocal);

      editor.update(
        () => {
          for (const child of $getRoot().getChildren()) {
            if (!$isParagraphNode(child)) {
              continue;
            }
            const textNode = child.getFirstChild();
            if (
              $isTextNode(textNode) &&
              textNode.getTextContent() === 'hello!'
            ) {
              textNode.select(6, 6);
              return;
            }
          }
          throw new Error('Expected hello paragraph');
        },
        { discrete: true }
      );

      editor.update(
        () => {
          $importRemoteMarkdown(remote, liveLocal);
        },
        { discrete: true }
      );

      const liveBaseline = editor.read(() =>
        $captureMarkdownSelectionOffsets()
      );

      importMarkdown(editor, liveLocal);
      editor.update(
        () => {
          for (const child of $getRoot().getChildren()) {
            if (!$isParagraphNode(child)) {
              continue;
            }
            const textNode = child.getFirstChild();
            if (
              $isTextNode(textNode) &&
              textNode.getTextContent() === 'hello!'
            ) {
              textNode.select(6, 6);
              return;
            }
          }
          throw new Error('Expected hello paragraph');
        },
        { discrete: true }
      );

      editor.update(
        () => {
          $importRemoteMarkdown(remote, staleLocal);
        },
        { discrete: true }
      );

      const staleBaseline = editor.read(() =>
        $captureMarkdownSelectionOffsets()
      );

      expect(staleBaseline).toEqual(liveBaseline);

      editor.dispose();
    });
  });
});
