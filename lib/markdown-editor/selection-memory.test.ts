import {
  $getRoot,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $getSelection,
} from 'lexical';

import { $importRemoteMarkdown } from './import-export';
import { makeGfmTestEditor } from './gfm-test-helpers';
import { $captureMarkdownSelectionOffsets } from './selection-memory';

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

describe('selection memory', () => {
  it('restores the caret at the same markdown offset after a full re-import', () => {
    const markdown = 'hello\n\nworld';
    const editor = makeGfmTestEditor(markdown);

    selectTextNode(editor, 'hello', 3);

    editor.update(
      () => {
        $importRemoteMarkdown(markdown, markdown);
      },
      { discrete: true }
    );

    editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected a range selection after restore');
      }

      expect($captureMarkdownSelectionOffsets()).toEqual({
        anchor: 3,
        focus: 3,
        direction: 'LTR',
      });
    });

    editor.dispose();
  });

  it('keeps the caret on the same content when remote text is inserted before it', () => {
    const local = 'hello\n\nworld';
    const remote = 'NEW hello\n\nworld';
    const editor = makeGfmTestEditor(local);

    selectTextNode(editor, 'hello', 5);

    editor.update(
      () => {
        $importRemoteMarkdown(remote, local);
      },
      { discrete: true }
    );

    editor.read(() => {
      expect($captureMarkdownSelectionOffsets()).toEqual({
        anchor: 9,
        focus: 9,
        direction: 'LTR',
      });
    });

    editor.dispose();
  });

  it('restores a non-collapsed selection across a remote re-import', () => {
    const markdown = 'alpha\n\nbeta';
    const editor = makeGfmTestEditor(markdown);

    editor.update(
      () => {
        for (const child of $getRoot().getChildren()) {
          if (!$isParagraphNode(child)) {
            continue;
          }
          const textNode = child.getFirstChild();
          if ($isTextNode(textNode) && textNode.getTextContent() === 'alpha') {
            textNode.select(1, 4);
            return;
          }
        }
        throw new Error('Expected alpha paragraph');
      },
      { discrete: true }
    );

    editor.update(
      () => {
        $importRemoteMarkdown(markdown, markdown);
      },
      { discrete: true }
    );

    editor.read(() => {
      expect($captureMarkdownSelectionOffsets()).toEqual({
        anchor: 1,
        focus: 4,
        direction: 'LTR',
      });
    });

    editor.dispose();
  });
});
