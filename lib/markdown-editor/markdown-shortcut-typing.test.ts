import { $convertToMarkdownString } from '@lexical/markdown';
import { $isQuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  type LexicalEditorWithDispose,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { makeGfmTestEditor } from './gfm-test-helpers';

async function typeTextViaCommand(
  editor: LexicalEditorWithDispose,
  text: string
): Promise<void> {
  for (const char of text) {
    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, char);
    await Promise.resolve();
  }
  // Markdown shortcuts defer nested updates until the current commit finishes.
  await Promise.resolve();
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

function rootHasBlockquote(editor: LexicalEditorWithDispose): boolean {
  return editor.getEditorState().read(() => {
    const root = $getRoot();
    return root.getChildren().some((child) => $isQuoteNode(child));
  });
}

describe('markdown shortcut typing', () => {
  it('turns "> quote" into a blockquote while typing', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    await typeTextViaCommand(editor, '> quote');

    expect(exportMarkdown(editor)).toBe('> quote');
    expect(rootHasBlockquote(editor)).toBe(true);

    editor.dispose();
  });

  it('turns "*italic*" into italic text while typing', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    await typeTextViaCommand(editor, '*italic*');

    const hasItalic = editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      if (!paragraph) {
        return false;
      }
      for (const child of paragraph.getChildren()) {
        if (child.getType() === 'text' && child.hasFormat('italic')) {
          return child.getTextContent() === 'italic';
        }
      }
      return false;
    });

    expect(exportMarkdown(editor)).toBe('*italic*');
    expect(hasItalic).toBe(true);

    editor.dispose();
  });

  it('turns "**bold**" into bold text while typing', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );

    await typeTextViaCommand(editor, '**bold**');

    const hasBold = editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      if (!paragraph) {
        return false;
      }
      for (const child of paragraph.getChildren()) {
        if (child.getType() === 'text' && child.hasFormat('bold')) {
          return child.getTextContent() === 'bold';
        }
      }
      return false;
    });

    expect(exportMarkdown(editor)).toBe('**bold**');
    expect(hasBold).toBe(true);

    editor.dispose();
  });
});
