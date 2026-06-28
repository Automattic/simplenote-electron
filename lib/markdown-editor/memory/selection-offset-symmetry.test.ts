import { $getRoot, $isParagraphNode, $isTextNode } from 'lexical';

import { $exportMarkdownString } from '../extensions/index';
import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
import {
  $captureMarkdownSelectionOffsets,
  $restoreMarkdownSelectionOffsets,
} from './selection-memory';

function selectTextNode(
  editor: ReturnType<typeof makeGfmTestEditor>,
  text: string,
  offset: number
): void {
  editor.update(
    () => {
      for (const child of $getRoot().getChildren()) {
        if (!$isParagraphNode(child)) {
          continue;
        }
        const textNode = child.getFirstChild();
        if ($isTextNode(textNode) && textNode.getTextContent() === text) {
          textNode.select(offset, offset);
          return;
        }
      }
      throw new Error(`Expected paragraph with text ${JSON.stringify(text)}`);
    },
    { discrete: true }
  );
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

describe('selection offset symmetry', () => {
  it.each([
    ['hello\\n\\nworld at hello offset 3', 'hello\n\nworld', 'hello', 3, 3],
    ['hard break note', 'zero  \nzero', 'zero', 3, 3],
  ])('%s', (_label, markdown, text, offset, expected) => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);
    selectTextNode(editor, text, offset);

    const captured = editor.read(() => $captureMarkdownSelectionOffsets());
    expect(captured?.anchor).toBe(expected);

    const roundTripped = restoreAndCapture(editor, {
      anchor: captured!.anchor,
      focus: captured!.focus,
    });
    expect(roundTripped).toEqual(captured);

    editor.dispose();
  });

  it('round-trips offsets across a full re-import', () => {
    const markdown = 'hello\n\nworld';
    const editor = makeGfmTestEditor(markdown);
    selectTextNode(editor, 'hello', 3);

    const saved = editor.read(() => $captureMarkdownSelectionOffsets());
    expect(saved).toEqual({ anchor: 3, focus: 3, direction: 'LTR' });

    editor.update(
      () => {
        importMarkdown(editor, markdown);
      },
      { discrete: true }
    );

    editor.update(
      () => {
        expect($restoreMarkdownSelectionOffsets(saved!)).toBe(true);
      },
      { discrete: true }
    );

    editor.read(() => {
      expect($captureMarkdownSelectionOffsets()).toEqual(saved);
    });

    editor.dispose();
  });

  it('matches exported markdown length for fixture notes', () => {
    const markdown = [
      '# Browser Article Clip',
      '',
      'Intro paragraph.',
      '',
      '- First bullet',
      '',
      '| A |',
      '| --- |',
      '| 1 |',
    ].join('\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($exportMarkdownString()).toBe(markdown);
    });
    editor.dispose();
  });
});
