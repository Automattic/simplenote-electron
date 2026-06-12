import {
  $getClipboardDataFromSelection,
  $insertDataTransferForRichText,
} from '@lexical/clipboard';
import { buildEditorFromExtensions } from '@lexical/extension';
import { $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical';
import { $isListItemNode, $isListNode } from '@lexical/list';

import {
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';
import { LEXICAL_CLIPBOARD_JSON_PREFIX } from './clipboard-lexical-json';

function makeEditor(markdown: string) {
  return buildEditorFromExtensions(createMarkdownEditorExtension(markdown));
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
  it('serializes code blocks as fenced markdown in text/plain', () => {
    const editor = makeEditor('```\nconst a = 1;\nconst b = 2;\n```');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('```');
    expect(data['text/plain']).toContain('const a = 1;');
    expect(data['text/plain']).toContain('const b = 2;');
    editor.dispose();
  });

  it('serializes quotes with their markers', () => {
    const editor = makeEditor('> first quoted line\n\nplain paragraph');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('> first quoted line');
    expect(data['text/plain']).toContain('plain paragraph');
    editor.dispose();
  });

  it('serializes lists with bullets and headings with hashes', () => {
    const editor = makeEditor('# Title\n\n- one\n- two');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('# Title');
    expect(data['text/plain']).toContain('- one');
    expect(data['text/plain']).toContain('- two');
    editor.dispose();
  });

  it('keeps vanilla Lexical text/html and prefixes application/x-lexical-editor', () => {
    const editor = makeEditor('# Title\n\n> quoted');
    const data = getClipboardDataForAll(editor);

    expect(data['text/plain']).toContain('# Title');
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

    expect(data['text/plain']).toBe('- [ ] open task');
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

    expect(data['text/plain']).toBe('- [ ] task one');
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

    expect(data['text/plain']).toBe('- [ ] task one');
    expect(data['text/plain']).not.toMatch(/^\n/);
    editor.dispose();
  });
});
