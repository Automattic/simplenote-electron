import { $getClipboardDataFromSelection } from '@lexical/clipboard';
import { buildEditorFromExtensions } from '@lexical/extension';
import { $getRoot, $getSelection } from 'lexical';

import { createMarkdownEditorExtension } from './extensions';

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

  it('keeps the default text/html and Lexical JSON payloads', () => {
    const editor = makeEditor('# Title\n\n> quoted');
    const data = getClipboardDataForAll(editor);

    expect(data['text/html']).toContain('<h1');
    expect(data['text/html']).toContain('<blockquote');

    const payload = JSON.parse(data['application/x-lexical-editor']!);
    expect(payload.namespace).toBe('SimplenoteMarkdownEditor');
    expect(payload.nodes.length).toBeGreaterThan(0);
    editor.dispose();
  });
});
