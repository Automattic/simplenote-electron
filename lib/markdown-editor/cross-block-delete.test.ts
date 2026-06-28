import { $convertToMarkdownString } from '@lexical/markdown';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  DELETE_CHARACTER_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions/index';
import { makeGfmTestEditor } from './markdown/gfm-test-helpers';

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

async function dispatchDelete(
  editor: LexicalEditorWithDispose
): Promise<boolean> {
  const handled = editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
  await Promise.resolve();
  return handled;
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

describe('cross-block delete', () => {
  it('deletes a partial selection spanning code blocks and horizontal rules', async () => {
    const markdown = '```ABC```\n---\n---\n```DEF```';
    const editor = makeGfmTestEditor(markdown);
    editor.update(
      () => {
        const abc = findTextNode($getRoot(), 'ABC');
        const def = findTextNode($getRoot(), 'DEF');
        if (!abc || !def) {
          throw new Error('Expected code block text nodes');
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        selection.anchor.set(abc.getKey(), 1, 'text');
        selection.focus.set(def.getKey(), def.getTextContentSize(), 'text');
      },
      { discrete: true }
    );

    await dispatchDelete(editor);

    const result = exportMarkdown(editor);
    expect(result).not.toContain('DEF');
    expect(result).not.toContain('BC');
    expect(result).not.toContain('---');
    expect(result.replace(/\n/g, '')).toBe('```A```');
    editor.dispose();
  });
});
