import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalCommand,
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
      // In a browser the selectionchange handler syncs the anchor node's
      // format onto the selection; headless select() leaves it at 0.
      selection.format = textNode.getFormat();
    },
    { discrete: true }
  );
}

// Command listeners run in a non-discrete update; the committed state is not
// visible from getEditorState() until the next microtask.
async function dispatchArrow(
  editor: LexicalEditorWithDispose,
  command: LexicalCommand<KeyboardEvent>,
  init: KeyboardEventInit = {}
): Promise<boolean> {
  const key = command === KEY_ARROW_RIGHT_COMMAND ? 'ArrowRight' : 'ArrowLeft';
  const handled = editor.dispatchCommand(
    command,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: key,
      key,
      ...init,
    })
  );
  await Promise.resolve();
  return handled;
}

type SelectionSnapshot = {
  formats: string[];
  anchorText: string | null;
  anchorOffset: number | null;
};

function readSelection(editor: LexicalEditorWithDispose): SelectionSnapshot {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return { formats: [], anchorText: null, anchorOffset: null };
    }
    const formats = (
      ['bold', 'italic', 'strikethrough', 'highlight', 'code'] as const
    ).filter((format) => selection.hasFormat(format));
    const anchorNode = selection.anchor.getNode();
    return {
      formats,
      anchorText: $isTextNode(anchorNode) ? anchorNode.getTextContent() : null,
      anchorOffset: selection.anchor.offset,
    };
  });
}

describe('format escape at text boundaries', () => {
  it('clears bold without moving the caret at the trailing edge', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'plain **bolded**\n\nnext paragraph');
    selectTextNode(editor, 'bolded', 'bolded'.length);

    expect(readSelection(editor).formats).toEqual(['bold']);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);

    const after = readSelection(editor);
    expect(after.formats).toEqual([]);
    expect(after.anchorText).toBe('bolded');
    expect(after.anchorOffset).toBe('bolded'.length);

    editor.dispose();
  });

  it('clears the format at the leading edge with ArrowLeft', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '*italic* plain');
    selectTextNode(editor, 'italic', 0);

    expect(readSelection(editor).formats).toEqual(['italic']);

    expect(await dispatchArrow(editor, KEY_ARROW_LEFT_COMMAND)).toBe(true);

    const after = readSelection(editor);
    expect(after.formats).toEqual([]);
    expect(after.anchorText).toBe('italic');
    expect(after.anchorOffset).toBe(0);

    editor.dispose();
  });

  it('clears stacked formats in a single press', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**~~both~~**');
    selectTextNode(editor, 'both', 'both'.length);

    expect(readSelection(editor).formats).toEqual(['bold', 'strikethrough']);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    expect(readSelection(editor).formats).toEqual([]);

    editor.dispose();
  });

  it('moves the caret on the second press once the format is escaped', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bolded**\n\nnext');
    selectTextNode(editor, 'bolded', 'bolded'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    expect(readSelection(editor).anchorText).toBe('bolded');

    // Second press has nothing to escape; rich-text moves the caret across
    // the block boundary into the next paragraph.
    await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND);
    expect(readSelection(editor).anchorText).not.toBe('bolded');

    editor.dispose();
  });

  it('ignores arrow presses in the middle of formatted text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bolded**');
    selectTextNode(editor, 'bolded', 3);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);
    expect(readSelection(editor).formats).toEqual(['bold']);

    editor.dispose();
  });

  it('ignores shift+arrow so range selection still works', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bolded**');
    selectTextNode(editor, 'bolded', 'bolded'.length);

    expect(
      await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND, { shiftKey: true })
    ).toBe(false);
    expect(readSelection(editor).formats).toEqual(['bold']);

    editor.dispose();
  });

  it('does not trigger when a sibling text node follows', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bolded** trailing');
    selectTextNode(editor, 'bolded', 'bolded'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);
    expect(readSelection(editor).formats).toEqual(['bold']);

    editor.dispose();
  });
});

// Typing goes through the controlled insertion path at link boundaries
// (LinkNode.canInsertTextAfter is false), so dispatching the command mirrors
// real typing more closely than calling selection.insertText directly. The
// commit only becomes readable after the microtask, hence the await.
async function typeText(
  editor: LexicalEditorWithDispose,
  text: string
): Promise<void> {
  editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, text);
  await Promise.resolve();
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

describe('link escape at link boundaries', () => {
  const LINK = '[linktext](https://example.com)';

  it('typing at the trailing edge extends the link text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    await typeText(editor, 'more');

    expect(exportMarkdown(editor)).toBe('[linktextmore](https://example.com)');

    editor.dispose();
  });

  it('ArrowRight escapes the link so typing lands outside it', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    await typeText(editor, 'after');

    expect(exportMarkdown(editor)).toBe(`${LINK}after`);

    editor.dispose();
  });

  it('typing at the leading edge lands before the link by default', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 0);

    // No escape needed on the left: Lexical already inserts outside the link.
    expect(await dispatchArrow(editor, KEY_ARROW_LEFT_COMMAND)).toBe(false);
    await typeText(editor, 'pre');

    expect(exportMarkdown(editor)).toBe(`pre${LINK}`);

    editor.dispose();
  });

  it('escapes into a following sibling text node when one exists', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, `${LINK} trailing`);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    await typeText(editor, 'X');

    expect(exportMarkdown(editor)).toBe(`${LINK}X trailing`);

    editor.dispose();
  });

  it('does not trigger in the middle of the link text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 3);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);

    editor.dispose();
  });

  it('keeps typing outside the link even if the caret normalizes back in', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    // Browsers (and Lexical's selection normalization) can move the caret
    // from "just after the link" back to the link text's trailing edge
    // before the next keystroke; the escape must survive that round trip.
    selectTextNode(editor, 'linktext', 'linktext'.length);
    await typeText(editor, 'after');

    expect(exportMarkdown(editor)).toBe(`${LINK}after`);

    editor.dispose();
  });

  it('lets a second ArrowRight move the caret on', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    // Simulate the caret normalizing back to the link text's trailing edge.
    selectTextNode(editor, 'linktext', 'linktext'.length);
    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);

    editor.dispose();
  });

  it('re-extends the link after the caret leaves and returns', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINK);
    selectTextNode(editor, 'linktext', 'linktext'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);
    // Moving the caret elsewhere invalidates the escape...
    selectTextNode(editor, 'linktext', 0);
    // ...so coming back to the trailing edge extends the link again.
    selectTextNode(editor, 'linktext', 'linktext'.length);
    await typeText(editor, 'more');

    expect(exportMarkdown(editor)).toBe('[linktextmore](https://example.com)');

    editor.dispose();
  });
});

describe('bare URLs stay plain text', () => {
  const URL = 'https://example.com';

  it('does not consume ArrowRight at the trailing edge', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, URL);
    selectTextNode(editor, URL, URL.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);

    editor.dispose();
  });

  it('typing at the trailing edge stays plain text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, URL);
    selectTextNode(editor, URL, URL.length);

    await typeText(editor, ' and');

    expect(exportMarkdown(editor)).toBe(`${URL} and`);

    editor.dispose();
  });
});
