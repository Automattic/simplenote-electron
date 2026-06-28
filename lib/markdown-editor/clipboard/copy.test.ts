import {
  $getClipboardDataFromSelection,
  $insertDataTransferForRichText,
} from '@lexical/clipboard';
import { buildEditorFromExtensions } from '@lexical/extension';
import { $convertToMarkdownString } from '@lexical/markdown';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import { $isCodeNode } from '@lexical/code-core';
import { $isListItemNode, $isListNode } from '@lexical/list';

import { LEXICAL_CLIPBOARD_JSON_PREFIX } from './clipboard-lexical-json';
import * as paste from './paste';
import {
  MARKDOWN_CLIPBOARD_MIME_TYPE,
  $shouldPreferMarkdownPasteOverLexicalJson,
} from './shared';
import {
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from '../extensions/index';

function makeEditor(markdown: string) {
  return buildEditorFromExtensions(createMarkdownEditorExtension(markdown));
}

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

function getClipboardDataForAll(editor: ReturnType<typeof makeEditor>) {
  editor.update(
    () => {
      const root = $getRoot();
      root.select(0, root.getChildrenSize());
    },
    { discrete: true }
  );
  return editor.read(() => $getClipboardDataFromSelection($getSelection()));
}

function getClipboardDataForSelection(
  editor: ReturnType<typeof makeEditor>,
  select: () => void
) {
  editor.update(select, { discrete: true });
  return editor.read(() => $getClipboardDataFromSelection($getSelection()));
}

function getClipboardDataForFirstListItem(
  editor: ReturnType<typeof makeEditor>
) {
  return getClipboardDataForSelection(editor, () => {
    const list = $getRoot().getFirstChild();
    if (!$isListNode(list)) {
      throw new Error('Expected a list');
    }
    const item = list.getFirstChild();
    if (!$isListItemNode(item)) {
      throw new Error('Expected a list item');
    }
    item.select(0, item.getChildrenSize());
  });
}

describe('markdown clipboard export', () => {
  it('exports fenced markdown in text/plain only', () => {
    const editor = makeEditor('```\nconst a = 1;\nconst b = 2;\n```');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('```');
    expect(data['text/plain']).toContain('const a = 1;');
    expect(data['text/plain']).toContain('const b = 2;');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('exports markdown markers in text/plain only', () => {
    const editor = makeEditor('> first quoted line\n\nplain paragraph');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('> first quoted line');
    expect(data['text/plain']).toContain('plain paragraph');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('exports list and heading markdown in text/plain only', () => {
    const editor = makeEditor('# Title\n\n- one\n- two');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('# Title');
    expect(data['text/plain']).toContain('- one');
    expect(data['text/plain']).toContain('- two');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('keeps vanilla Lexical text/html and prefixes application/x-lexical-editor', () => {
    const editor = makeEditor('# Title\n\n> quoted');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('# Title');
    expect(data['text/plain']).toContain('> quoted');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    expect(data['text/html']).toContain('<h1');
    expect(data['text/html']).toContain('<blockquote');
    expect(data['application/x-lexical-editor']).toMatch(
      new RegExp(`^${LEXICAL_CLIPBOARD_JSON_PREFIX}`)
    );

    const payload = JSON.parse(
      data['application/x-lexical-editor']!.slice(
        LEXICAL_CLIPBOARD_JSON_PREFIX.length
      )
    );
    expect(payload.namespace).toBe('SimplenoteMarkdownEditor');
    expect(payload.nodes.length).toBeGreaterThan(0);
    editor.dispose();
  });

  it('exports prefixed Lexical JSON for checklist lines', () => {
    const editor = makeEditor('- [ ] open task');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toBe('- [ ] open task\n');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    expect(data['text/html']).toContain('open task');
    expect(data['application/x-lexical-editor']).toMatch(
      new RegExp(`^${LEXICAL_CLIPBOARD_JSON_PREFIX}`)
    );

    const payload = JSON.parse(
      data['application/x-lexical-editor']!.slice(
        LEXICAL_CLIPBOARD_JSON_PREFIX.length
      )
    );
    expect(payload.namespace).toBe('SimplenoteMarkdownEditor');
    expect(payload.nodes.length).toBeGreaterThan(0);
    editor.dispose();
  });

  it('falls back to Lexical JSON when markdown import fails', () => {
    const source = makeEditor('- [ ] task one');
    const data = getClipboardDataForFirstListItem(source);
    source.dispose();

    const importSpy = jest
      .spyOn(paste, '$importMarkdownClipboard')
      .mockReturnValue(false);

    const target = makeEditor('');
    target.update(
      () => {
        $getRoot().selectStart();
      },
      { discrete: true }
    );

    target.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected a range selection');
        }

        const clipboardData = {
          getData: (type: string) => data[type] ?? '',
        } as DataTransfer;

        $insertDataTransferForRichText(clipboardData, selection);
      },
      { discrete: true }
    );

    const markdown = target.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(markdown).toContain('task one');
    importSpy.mockRestore();
    target.dispose();
  });

  it('imports prefixed Lexical JSON back into the editor', () => {
    const source = makeEditor('copied task');
    const data = getClipboardDataForAll(source);
    source.dispose();

    const target = makeEditor('');
    target.update(
      () => {
        $getRoot().selectStart();
      },
      { discrete: true }
    );

    target.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected a range selection');
        }

        const clipboardData = {
          getData: (type: string) => data[type] ?? '',
        } as DataTransfer;

        $insertDataTransferForRichText(clipboardData, selection);
      },
      { discrete: true }
    );

    const markdown = target.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(markdown).toContain('copied task');
    target.dispose();
  });

  it('does not prepend a blank line when copying a single list item', () => {
    const editor = makeEditor('- [ ] task one\n- two\n- [ ] task three');
    const data = getClipboardDataForFirstListItem(editor);

    expect(data['text/plain']).toBe('- [ ] task one\n');
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('does not prepend a blank line when copying one list item after a paragraph', () => {
    const editor = makeEditor('Intro\n\n- [ ] task one\n- two');
    const data = getClipboardDataForSelection(editor, () => {
      const list = $getRoot().getChildAtIndex(1);
      if (!$isListNode(list)) {
        throw new Error('Expected a list');
      }
      const item = list.getFirstChild();
      if (!$isListItemNode(item)) {
        throw new Error('Expected a list item');
      }
      item.select(0, item.getChildrenSize());
    });

    expect(data['text/plain']).toBe('- [ ] task one\n');
    expect(data['text/plain']).not.toMatch(/^\n/);
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('does not append a trailing linebreak when only part of a list item is copied', () => {
    const editor = makeEditor('- alpha\n- beta');
    const data = getClipboardDataForSelection(editor, () => {
      const textNode = findTextNode($getRoot(), 'alpha');
      if (!textNode) {
        throw new Error('Expected alpha text node');
      }
      textNode.select(0, 3);
    });

    expect(data['text/plain']).toBe('- alp');
    expect(data['text/plain']).not.toMatch(/\n$/);
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();
    editor.dispose();
  });

  it('copies only the selected line from a multiline code block across remaining mime types', () => {
    const editor = makeEditor('```\nconst a = 1;\nconst b = 2;\n```');
    const selectedLine = 'const a = 1;';
    const data = getClipboardDataForSelection(editor, () => {
      const code = $getRoot().getFirstChild();
      if (!$isCodeNode(code)) {
        throw new Error('Expected a code block');
      }
      const textNode = code.getFirstChild();
      if (!$isTextNode(textNode)) {
        throw new Error('Expected code text node');
      }
      textNode.select(0, selectedLine.length);
    });

    expect(data['text/plain']).toBe(selectedLine);
    expect(data[MARKDOWN_CLIPBOARD_MIME_TYPE]).toBeUndefined();

    expect(data['text/html']).toContain(selectedLine);
    expect(data['text/html']).not.toContain('const b = 2;');
    expect(data['text/html']).not.toContain('```');

    expect(data['application/x-lexical-editor']).toMatch(
      new RegExp(`^${LEXICAL_CLIPBOARD_JSON_PREFIX}`)
    );
    const payload = JSON.parse(
      data['application/x-lexical-editor']!.slice(
        LEXICAL_CLIPBOARD_JSON_PREFIX.length
      )
    );
    expect(payload.namespace).toBe('SimplenoteMarkdownEditor');
    expect(JSON.stringify(payload.nodes)).toContain(selectedLine);
    expect(JSON.stringify(payload.nodes)).not.toContain('const b = 2;');

    editor.dispose();
  });
});

describe('$shouldPreferMarkdownPasteOverLexicalJson', () => {
  it('prefers markdown paste for complete blockquote copies', () => {
    expect($shouldPreferMarkdownPasteOverLexicalJson('> hjhj')).toBe(true);
    expect($shouldPreferMarkdownPasteOverLexicalJson('> hjhj\n')).toBe(true);
    expect(
      $shouldPreferMarkdownPasteOverLexicalJson('> line one\n> line two\n')
    ).toBe(true);
    expect($shouldPreferMarkdownPasteOverLexicalJson('plain text')).toBe(false);
  });
});
