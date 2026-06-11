import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import { $convertToMarkdownString } from '@lexical/markdown';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

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

function selectTextNode(
  editor: LexicalEditorWithDispose,
  text: string,
  offset: number
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      const selection = textNode.select(offset, offset);
      selection.format = textNode.getFormat();
    },
    { discrete: true }
  );
}

async function typeText(
  editor: LexicalEditorWithDispose,
  text: string
): Promise<void> {
  // One keystroke per character, like real typing.
  for (const char of text) {
    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, char);
    await Promise.resolve();
  }
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

describe('typing inside inline code', () => {
  it('inserts typed text into the middle of the code span', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '`test`');
    selectTextNode(editor, 'test', 2);

    await typeText(editor, '123');

    expect(exportMarkdown(editor)).toBe('`te123st`');

    editor.dispose();
  });
});
