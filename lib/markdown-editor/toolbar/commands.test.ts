import { $convertToMarkdownString } from '@lexical/markdown';
import { $isLinkNode } from '@lexical/link';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $createNodeSelection,
  $setSelection,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from '../extensions';
import { importMarkdown, makeGfmTestEditor } from '../gfm-test-helpers';
import { $isImageNode } from '../image-node';
import {
  getImageSrcFromSelection,
  getLinkHrefFromSelection,
  insertImage,
  setLink,
  toggleBlockquote,
  toggleCodeBlock,
  toggleHeading,
} from './commands';

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

function selectTableCell(
  editor: LexicalEditorWithDispose,
  rowIndex: number,
  columnIndex: number
): void {
  editor.update(
    () => {
      const table = $getRoot().getFirstChild();
      if (!table || !$isTableNode(table)) {
        throw new Error('Expected table at root');
      }
      const row = table.getChildAtIndex(rowIndex);
      if (!$isTableRowNode(row)) {
        throw new Error('Expected table row');
      }
      const cell = row.getChildAtIndex(columnIndex);
      if (!$isTableCellNode(cell)) {
        throw new Error('Expected table cell');
      }
      cell.selectStart();
    },
    { discrete: true }
  );
}

describe('block commands in tables', () => {
  it('does not apply heading, blockquote, or code block toggles inside a cell', async () => {
    const editor = makeGfmTestEditor();
    const tableMarkdown = ['| City |', '| --- |', '| Kyoto |'].join('\n');
    importMarkdown(editor, tableMarkdown);
    selectTableCell(editor, 1, 0);

    const before = exportMarkdown(editor);

    toggleHeading(editor, 1);
    await flushEditor();
    expect(exportMarkdown(editor)).toBe(before);

    toggleBlockquote(editor);
    await flushEditor();
    expect(exportMarkdown(editor)).toBe(before);

    toggleCodeBlock(editor);
    await flushEditor();
    expect(exportMarkdown(editor)).toBe(before);

    editor.dispose();
  });
});

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

  it('ignores invalid urls', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'visit site today');
    selectTextRange(editor, 'visit site today', 6, 10);

    setLink(editor, 'javascript:alert(1)');
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('visit site today');
    editor.dispose();
  });
});

describe('insertImage', () => {
  it('inserts an image at a collapsed caret', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'see ');
    selectTextNode(editor, 'see ');

    expect(insertImage(editor, 'https://example.com/photo.jpg', 'Photo')).toBe(
      true
    );
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      'see ![Photo](https://example.com/photo.jpg)'
    );
    editor.dispose();
  });

  it('uses selected text as the alt text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Photo caption');
    selectTextRange(editor, 'Photo caption', 0, 5);

    expect(insertImage(editor, 'example.com/photo.jpg')).toBe(true);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      '![Photo](https://example.com/photo.jpg) caption'
    );
    editor.dispose();
  });

  it('ignores unsafe image sources', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'see ');
    selectTextNode(editor, 'see ');

    expect(insertImage(editor, 'http://127.0.0.1/photo.jpg', 'Local')).toBe(
      false
    );
    await flushEditor();

    expect(exportMarkdown(editor)).toBe('see ');
    editor.dispose();
  });

  it('updates the src of a selected image node', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '![Photo](https://example.com/old.jpg)');

    editor.update(
      () => {
        const image = $getRoot()
          .getFirstChild()
          ?.getChildren()
          .find($isImageNode);
        if (!image) {
          throw new Error('Expected image node');
        }
        const selection = $createNodeSelection();
        selection.add(image.getKey());
        $setSelection(selection);
      },
      { discrete: true }
    );

    expect(getImageSrcFromSelection(editor)).toBe(
      'https://example.com/old.jpg'
    );
    expect(insertImage(editor, 'https://example.com/new.jpg')).toBe(true);
    await flushEditor();

    expect(exportMarkdown(editor)).toBe(
      '![Photo](https://example.com/new.jpg)'
    );
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
