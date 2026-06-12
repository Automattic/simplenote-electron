import { $convertToMarkdownString } from '@lexical/markdown';
import { $isLinkNode } from '@lexical/link';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import {
  getLinkHrefFromSelection,
  setLink,
  toggleBlockquote,
  toggleCodeBlock,
  toggleHeading,
} from './editor-commands';

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
  offset?: number
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      const at = offset ?? textNode.getTextContentSize();
      textNode.select(at, at);
    },
    { discrete: true }
  );
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

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

async function flushEditor(): Promise<void> {
  await Promise.resolve();
}

describe('toggleHeading', () => {
  it('converts a paragraph to heading 1', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    selectTextNode(editor, 'hello');

    toggleHeading(editor, 1);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('# hello');
    editor.dispose();
  });

  it('toggles heading 1 off back to a paragraph', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '# hello');
    selectTextNode(editor, 'hello');

    toggleHeading(editor, 1);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('hello');
    editor.dispose();
  });
});

describe('toggleBlockquote', () => {
  it('wraps a paragraph in a blockquote', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'quoted text');
    selectTextNode(editor, 'quoted text');

    toggleBlockquote(editor);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('> quoted text');
    editor.dispose();
  });

  it('unwraps an existing blockquote', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '> quoted text');
    selectTextNode(editor, 'quoted text');

    toggleBlockquote(editor);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('quoted text');
    editor.dispose();
  });
});

describe('toggleCodeBlock', () => {
  it('converts a non-empty paragraph into a fenced code block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'const x = 1;');
    selectTextNode(editor, 'const x = 1;');

    toggleCodeBlock(editor);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('```\nconst x = 1;\n```');
    editor.dispose();
  });

  it('unwraps an existing code block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nconst x = 1;\n```');
    editor.update(
      () => {
        $getRoot().getFirstChild()?.selectStart();
      },
      { discrete: true }
    );

    toggleCodeBlock(editor);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('const x = 1;');
    editor.dispose();
  });
});

describe('setLink', () => {
  it('inserts a link at a collapsed caret', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'see ');
    selectTextNode(editor, 'see ');

    setLink(editor, 'https://example.com');
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      'see [https://example.com](https://example.com)'
    );
    editor.dispose();
  });

  it('wraps selected text in a link', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'visit site today');
    selectTextRange(editor, 'visit site today', 6, 10);

    setLink(editor, 'https://example.com');
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      'visit [site](https://example.com) today'
    );
    editor.dispose();
  });

  it('removes a link when the url is empty', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');
    selectTextNode(editor, 'site', 0);

    setLink(editor, '');
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('site');
    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .some((child) => {
            if (!$isElementNode(child)) {
              return false;
            }
            return child.getChildren().some($isLinkNode);
          })
      ).toBe(false);
    });
    editor.dispose();
  });
});

describe('getLinkHrefFromSelection', () => {
  it('returns the href when the caret is inside a link', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[site](https://example.com)');
    selectTextNode(editor, 'site', 1);

    expect(getLinkHrefFromSelection(editor)).toBe('https://example.com');
    editor.dispose();
  });

  it('returns a detected URL from selected plain text', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'https://example.com');
    selectTextRange(editor, 'https://example.com', 0, 19);

    expect(getLinkHrefFromSelection(editor)).toBe('https://example.com');
    editor.dispose();
  });

  it('returns undefined when there is no link context', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'plain text');
    selectTextNode(editor, 'plain text', 0);

    expect(getLinkHrefFromSelection(editor)).toBeUndefined();
    editor.dispose();
  });
});
