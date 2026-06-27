import { $isQuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  CONTROLLED_TEXT_INSERTION_COMMAND,
} from 'lexical';

import { createMarkdownEditorExtension } from '../extensions/index';
import { buildEditorFromExtensions } from '@lexical/extension';

describe('nested update pressure', () => {
  it('still applies blockquote shortcuts when other listeners enqueue nested updates', async () => {
    const editor = buildEditorFromExtensions(
      createMarkdownEditorExtension('', jest.fn())
    );

    editor.registerUpdateListener(() => {
      // Simulate another extension nesting updates during the same root commit.
      for (let i = 0; i < 3; i++) {
        editor.update(() => {});
      }
    });

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    for (const char of '> quote') {
      editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, char);
      await Promise.resolve();
    }
    await Promise.resolve();

    const hasQuote = editor.getEditorState().read(() => {
      return $getRoot()
        .getChildren()
        .some((child) => $isQuoteNode(child));
    });

    expect(hasQuote).toBe(true);

    editor.dispose();
  });
});
