import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';

import { $exportMarkdownString } from './extensions';
import { $importRemoteMarkdown } from './import-export';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import {
  $captureMarkdownSelectionOffsets,
  $captureStructuredSelection,
} from './selection-memory';
import {
  buildTableMarkdown,
  getTableCellAt,
} from './table-export-test-helpers';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

/** Mirrors `note-editor.tsx` remote sync: microtask → live export → import. */
async function simulateNoteEditorRemoteSync(
  editor: ReturnType<typeof makeGfmTestEditor>,
  remote: string,
  preserveSelection = true
): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(() => {
      editor.update(
        () => {
          const local = $exportMarkdownString();
          if (remote === local) {
            return;
          }
          $importRemoteMarkdown(remote, local, { preserveSelection });
        },
        { discrete: true, onUpdate: resolve }
      );
    });
  });
  await flushMicrotasks();
}

function getRootTableNode() {
  for (const child of $getRoot().getChildren()) {
    if ($isTableNode(child)) {
      return child;
    }
  }
  throw new Error('Expected table at root');
}

function getSelectedTableCellPosition(): { col: number; row: number } | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  let node = selection.anchor.getNode();
  while (node.getParent() !== null) {
    if ($isTableCellNode(node)) {
      const row = node.getParent();
      const table = row?.getParent();
      if (!$isTableRowNode(row) || !$isTableNode(table)) {
        return null;
      }
      return {
        col: row
          .getChildren()
          .findIndex((cell) => cell.getKey() === node.getKey()),
        row: table.getChildren().findIndex((r) => r.getKey() === row.getKey()),
      };
    }
    node = node.getParent()!;
  }

  return null;
}

describe('note-editor remote sync baseline', () => {
  it('ignores a stale local markdown baseline when the live document differs', async () => {
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
          if ($isTextNode(textNode) && textNode.getTextContent() === 'hello!') {
            textNode.select(6, 6);
            return;
          }
        }
        throw new Error('Expected hello paragraph');
      },
      { discrete: true }
    );

    let capturedInsideUpdate: ReturnType<
      typeof $captureMarkdownSelectionOffsets
    > = null;

    await new Promise<void>((resolve) => {
      queueMicrotask(() => {
        editor.update(
          () => {
            capturedInsideUpdate = $captureMarkdownSelectionOffsets();
            $importRemoteMarkdown(remote, staleLocal);
          },
          { discrete: true, onUpdate: resolve }
        );
      });
    });
    await flushMicrotasks();

    const stalePattern = editor.read(() => $captureMarkdownSelectionOffsets());

    importMarkdown(editor, liveLocal);
    editor.update(
      () => {
        for (const child of $getRoot().getChildren()) {
          if (!$isParagraphNode(child)) {
            continue;
          }
          const textNode = child.getFirstChild();
          if ($isTextNode(textNode) && textNode.getTextContent() === 'hello!') {
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

    const livePattern = editor.read(() => $captureMarkdownSelectionOffsets());

    expect(capturedInsideUpdate?.anchor).toBe(6);
    expect(stalePattern).toEqual(livePattern);

    editor.dispose();
  });

  it('remaps correctly when import reads the live export inside the microtask update', async () => {
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
          if ($isTextNode(textNode) && textNode.getTextContent() === 'hello!') {
            textNode.select(6, 6);
            return;
          }
        }
        throw new Error('Expected hello paragraph');
      },
      { discrete: true }
    );

    await new Promise<void>((resolve) => {
      queueMicrotask(() => {
        editor.update(
          () => {
            const local = $exportMarkdownString();
            expect(local).toBe(liveLocal);
            expect(local).not.toBe(staleLocal);
            $importRemoteMarkdown(remote, local);
          },
          { discrete: true, onUpdate: resolve }
        );
      });
    });
    await flushMicrotasks();

    editor.read(() => {
      const offsets = $captureMarkdownSelectionOffsets();
      expect(offsets?.anchor).toBeGreaterThanOrEqual(5);
    });

    editor.dispose();
  });
});

describe('note-editor remote sync in tables', () => {
  it('keeps the caret in the same table cell when remote edits a different cell', async () => {
    const table = buildTableMarkdown(3, 3);
    const local = `intro\n\n${table}\n\noutro`;
    const remote = local.replace('| C1 |', '| REMOTE |');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, local);

    const targetRow = 2;
    const targetCol = 2;
    const targetOffset = 1;

    editor.update(
      () => {
        const cell = getTableCellAt(getRootTableNode(), targetRow, targetCol);
        const textNode = cell.getFirstDescendant();
        if (!$isTextNode(textNode)) {
          throw new Error('Expected table cell text');
        }
        textNode.select(targetOffset, targetOffset);
      },
      { discrete: true }
    );

    const before = editor.read(() => ({
      cell: getSelectedTableCellPosition(),
      selection: $captureStructuredSelection(),
      text: $getSelection()?.getTextContent() ?? '',
    }));
    expect(before.cell).toEqual({ row: targetRow, col: targetCol });

    await simulateNoteEditorRemoteSync(editor, remote);

    const after = editor.read(() => ({
      cell: getSelectedTableCellPosition(),
      selection: $captureStructuredSelection(),
      text: $getSelection()?.getTextContent() ?? '',
      rootStartSelected:
        $isRangeSelection($getSelection()) &&
        $getSelection()?.anchor.offset === 0 &&
        $getRoot().getFirstChild()?.getKey() ===
          $getSelection()?.anchor.getNode().getKey(),
    }));

    expect(after.cell).toEqual({ row: targetRow, col: targetCol });
    expect(after.selection).toEqual(before.selection);
    expect(after.rootStartSelected).toBe(false);

    editor.dispose();
  });

  it('keeps the caret mid-cell when remote sync runs during an in-cell edit', async () => {
    const table = buildTableMarkdown(3, 3);
    const base = `intro\n\n${table}\n\noutro`;
    const editor = makeGfmTestEditor();
    importMarkdown(editor, base);

    const targetRow = 1;
    const targetCol = 1;

    editor.update(
      () => {
        const cell = getTableCellAt(getRootTableNode(), targetRow, targetCol);
        cell.clear();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('editing');
        paragraph.append(textNode);
        cell.append(paragraph);
        textNode.select(4, 4);
      },
      { discrete: true }
    );

    const local = editor.getEditorState().read(() => $exportMarkdownString());
    const remote = local.replace('editing', 'edited');

    const before = editor.read(() => ({
      cell: getSelectedTableCellPosition(),
      anchorText: $isRangeSelection($getSelection())
        ? $getSelection()!.anchor.getNode().getTextContent()
        : '',
      anchorOffset: $isRangeSelection($getSelection())
        ? $getSelection()!.anchor.offset
        : -1,
    }));
    expect(before.cell).toEqual({ row: targetRow, col: targetCol });
    expect(before.anchorText).toBe('editing');
    expect(before.anchorOffset).toBe(4);

    await simulateNoteEditorRemoteSync(editor, remote);

    const after = editor.read(() => ({
      cell: getSelectedTableCellPosition(),
      anchorText: $isRangeSelection($getSelection())
        ? $getSelection()!.anchor.getNode().getTextContent()
        : '',
      anchorOffset: $isRangeSelection($getSelection())
        ? $getSelection()!.anchor.offset
        : -1,
    }));

    expect(after.cell).toEqual({ row: targetRow, col: targetCol });
    expect(after.anchorText).toBe('edited');
    expect(after.anchorOffset).toBe(4);

    editor.dispose();
  });

  it('clamps to the new last row when remote deletes the row containing the caret', async () => {
    const table = buildTableMarkdown(3, 3);
    const local = table;
    const remote = buildTableMarkdown(2, 3);
    const editor = makeGfmTestEditor();
    importMarkdown(editor, local);

    const targetRow = 2;
    const targetCol = 1;
    const targetOffset = 2;

    editor.update(
      () => {
        const cell = getTableCellAt(getRootTableNode(), targetRow, targetCol);
        const textNode = cell.getFirstDescendant();
        if (!$isTextNode(textNode)) {
          throw new Error('Expected table cell text');
        }
        textNode.select(targetOffset, targetOffset);
      },
      { discrete: true }
    );

    expect(editor.read(() => getSelectedTableCellPosition())).toEqual({
      row: targetRow,
      col: targetCol,
    });

    await simulateNoteEditorRemoteSync(editor, remote);

    expect(editor.read(() => getSelectedTableCellPosition())).toEqual({
      row: 1,
      col: targetCol,
    });

    editor.dispose();
  });
});
