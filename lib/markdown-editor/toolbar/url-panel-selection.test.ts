import {
  $getRoot,
  $isRangeSelection,
  $getSelection,
  $isElementNode,
  $isTextNode,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { importMarkdown, makeGfmTestEditor } from '../gfm-test-helpers';
import {
  $restoreSelectionSnapshot,
  selectionChangedSinceSnapshot,
  snapshotSelection,
  type UrlPanelSelectionSnapshot,
} from './url-panel-selection';

function findTextNode(node: LexicalNode, text: string): TextNode | undefined {
  if ($isTextNode(node) && node.getTextContent() === text) {
    return node;
  }
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      const found = findTextNode(child, text);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function selectTextOffset(
  editor: LexicalEditorWithDispose,
  text: string,
  offset: number
): void {
  editor.update(
    () => {
      const root = $getRoot();
      const walk = (node: typeof root): boolean => {
        if (node.getType() === 'text' && node.getTextContent() === text) {
          node.select(offset, offset);
          return true;
        }
        if ('getChildren' in node) {
          for (const child of node.getChildren()) {
            if (walk(child as typeof root)) {
              return true;
            }
          }
        }
        return false;
      };
      if (!walk(root)) {
        throw new Error(`Expected text node ${JSON.stringify(text)}`);
      }
    },
    { discrete: true }
  );
}

describe('url-panel-selection', () => {
  it('snapshots and restores a collapsed selection', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextOffset(editor, 'hello', 3);

    const snapshot = snapshotSelection(editor);
    expect(snapshot).not.toBeNull();

    selectTextOffset(editor, 'hello', 0);

    let restored = false;
    editor.update(
      () => {
        restored = $restoreSelectionSnapshot(snapshot!);
      },
      { discrete: true }
    );
    expect(restored).toBe(true);

    expect(
      editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection) && selection.anchor.offset;
      })
    ).toBe(3);
    editor.dispose();
  });

  it('reports selection changes since the snapshot', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextOffset(editor, 'hello', 3);

    const snapshot = snapshotSelection(editor) as UrlPanelSelectionSnapshot;
    selectTextOffset(editor, 'hello', 0);

    expect(
      selectionChangedSinceSnapshot(editor.getEditorState(), snapshot)
    ).toBe(true);
    editor.dispose();
  });

  it('restores a caret at the end of the text node', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextOffset(editor, 'hello', 5);

    const snapshot = snapshotSelection(editor) as UrlPanelSelectionSnapshot;
    expect(snapshot.anchor.offset).toBe(5);

    selectTextOffset(editor, 'hello', 0);

    let restored = false;
    editor.update(
      () => {
        restored = $restoreSelectionSnapshot(snapshot);
      },
      { discrete: true }
    );
    expect(restored).toBe(true);
    editor.dispose();
  });

  it('refuses to restore when the offset is past the text end', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextOffset(editor, 'hello', 3);

    const snapshot = snapshotSelection(editor) as UrlPanelSelectionSnapshot;
    const invalidSnapshot: UrlPanelSelectionSnapshot = {
      ...snapshot,
      anchor: { ...snapshot.anchor, offset: 100 },
      focus: { ...snapshot.focus, offset: 100 },
    };

    let restored = false;
    editor.update(
      () => {
        restored = $restoreSelectionSnapshot(invalidSnapshot);
      },
      { discrete: true }
    );
    expect(restored).toBe(false);
    editor.dispose();
  });

  it('reports no change when the selection matches the snapshot', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextOffset(editor, 'hello', 3);

    const snapshot = snapshotSelection(editor) as UrlPanelSelectionSnapshot;

    expect(
      selectionChangedSinceSnapshot(editor.getEditorState(), snapshot)
    ).toBe(false);
    editor.dispose();
  });

  it('restores inline format on the selection', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bold**\n\nplain');
    editor.update(
      () => {
        const textNode = findTextNode($getRoot(), 'bold');
        if (!textNode) {
          throw new Error('Expected bold text node');
        }
        const selection = textNode.select(2, 2);
        selection.format = textNode.getFormat();
      },
      { discrete: true }
    );

    const snapshot = snapshotSelection(editor) as UrlPanelSelectionSnapshot;
    selectTextOffset(editor, 'plain', 0);

    let restored = false;
    editor.update(
      () => {
        restored = $restoreSelectionSnapshot(snapshot);
      },
      { discrete: true }
    );
    expect(restored).toBe(true);

    expect(
      editor.read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection) && selection.hasFormat('bold');
      })
    ).toBe(true);
    editor.dispose();
  });
});
