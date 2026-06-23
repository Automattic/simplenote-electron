import { $convertToMarkdownString } from '@lexical/markdown';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from '../extensions';
import { importMarkdown, makeGfmTestEditor } from '../gfm-test-helpers';
import { insertImage, setLink } from './commands';
import { $restoreSelectionSnapshot, snapshotSelection } from './index';

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

function selectTextRange(
  editor: LexicalEditorWithDispose,
  text: string,
  start: number,
  end: number
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      textNode.select(start, end);
    },
    { discrete: true }
  );
}

function clearSelection(editor: LexicalEditorWithDispose): void {
  editor.update(() => $setSelection(null), { discrete: true });
}

function restoreSelectionSnapshot(
  editor: LexicalEditorWithDispose,
  snapshot: NonNullable<ReturnType<typeof snapshotSelection>>
): void {
  let restored = false;
  editor.update(
    () => {
      restored = $restoreSelectionSnapshot(snapshot);
    },
    { discrete: true }
  );
  expect(restored).toBe(true);
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

function getSelectedText(editor: LexicalEditorWithDispose): string | null {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    return $isRangeSelection(selection) ? selection.getTextContent() : null;
  });
}

async function flushEditor(): Promise<void> {
  await Promise.resolve();
}

describe('toolbar URL panel selection snapshots', () => {
  it('restores selected text before applying a link after the URL input takes focus', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'visit site today');
    selectTextRange(editor, 'visit site today', 6, 10);

    const snapshot = snapshotSelection(editor);
    expect(snapshot).not.toBeNull();
    clearSelection(editor);

    restoreSelectionSnapshot(editor, snapshot!);
    setLink(editor, 'https://example.com');
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      'visit [site](https://example.com) today'
    );
    editor.dispose();
  });

  it('restores selected text before applying an image after the URL input takes focus', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Photo caption');
    selectTextRange(editor, 'Photo caption', 0, 5);

    const snapshot = snapshotSelection(editor);
    expect(snapshot).not.toBeNull();
    clearSelection(editor);

    restoreSelectionSnapshot(editor, snapshot!);
    expect(insertImage(editor, 'example.com/photo.jpg')).toBe(true);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      '![Photo](https://example.com/photo.jpg) caption'
    );
    editor.dispose();
  });

  it('restores selected text after cancelling the URL input without applying a command', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'visit site today');
    selectTextRange(editor, 'visit site today', 6, 10);

    const snapshot = snapshotSelection(editor);
    expect(snapshot).not.toBeNull();
    clearSelection(editor);

    restoreSelectionSnapshot(editor, snapshot!);

    expect(getSelectedText(editor)).toBe('site');
    expect(exportMarkdown(editor)).toBe('visit site today');
    editor.dispose();
  });
});
