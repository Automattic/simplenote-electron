import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  createEditor,
} from 'lexical';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode, $isHeadingNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code-core';
import { LinkNode } from '@lexical/link';
import {
  $convertToMarkdownString,
  registerMarkdownShortcuts,
} from '@lexical/markdown';

import { $importMarkdownString, MARKDOWN_TRANSFORMERS } from './extensions';

function makeEditor() {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, CodeNode, LinkNode],
    onError: (error) => {
      throw error;
    },
  });
  registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
  return editor;
}

function typeAtEnd(editor: ReturnType<typeof createEditor>, text: string) {
  for (const char of text) {
    editor.update(
      () => {
        const last = $getRoot().getLastDescendant();
        if (last) {
          last.selectEnd();
        } else {
          $getRoot().selectEnd();
        }
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }
}

describe('$importMarkdownString', () => {
  it('imports non-list blocks as direct children of the root', () => {
    const editor = makeEditor();
    editor.update(() => $importMarkdownString('# title\n\nhello\n\nworld'), {
      discrete: true,
    });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect($isHeadingNode(children[0])).toBe(true);
      expect($isParagraphNode(children[1])).toBe(true);
      expect(children[1].getTextContent()).toBe('hello');
      expect(children[2].getTextContent()).toBe('world');
    });
  });

  it('round-trips imported paragraphs without merging them', () => {
    const editor = makeEditor();
    editor.update(() => $importMarkdownString('hello\n\nworld'), {
      discrete: true,
    });

    const roundtrip = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
    expect(roundtrip).toBe('hello\n\nworld');
  });

  it('keeps element markdown shortcuts working inside imported notes', async () => {
    const editor = makeEditor();
    editor.update(() => $importMarkdownString('hello'), { discrete: true });

    // Simulate pressing Enter at the end of the note, then typing "# ".
    editor.update(
      () => {
        $getRoot().getLastDescendant()!.selectEnd();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertParagraph();
        }
      },
      { discrete: true }
    );
    typeAtEnd(editor, '# ');
    // The shortcut transform runs in a follow-up microtask.
    await Promise.resolve();

    editor.getEditorState().read(() => {
      const lastBlock = $getRoot().getLastChild();
      expect($isHeadingNode(lastBlock)).toBe(true);
    });
  });
});
