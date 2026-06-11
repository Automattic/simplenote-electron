import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  PASTE_COMMAND,
} from 'lexical';
import { ListNode, ListItemNode, $isListNode } from '@lexical/list';
import { HeadingNode, QuoteNode, $isHeadingNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code-core';
import { LinkNode } from '@lexical/link';
import { $convertToMarkdownString } from '@lexical/markdown';

import { buildEditorFromExtensions } from '@lexical/extension';
import { $isTableNode } from '@lexical/table';
import { $isHorizontalRuleNode } from '@lexical/extension';
import {
  $importMarkdownString,
  $insertMarkdownPasteNodes,
  $markdownToNodes,
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
  registerMarkdownPaste,
} from './extensions';

function makeEditor() {
  const editor = createEditor({
    nodes: [ListNode, ListItemNode, HeadingNode, QuoteNode, CodeNode, LinkNode],
    onError: (error) => {
      throw error;
    },
  });
  registerMarkdownPaste(editor);
  return editor;
}

function makePasteEvent(
  text: string,
  extraData: Record<string, string> = {}
): {
  event: ClipboardEvent;
  preventDefault: jest.Mock;
} {
  const data: Record<string, string> = { 'text/plain': text, ...extraData };
  const preventDefault = jest.fn();
  const event = {
    clipboardData: {
      getData: (type: string) => data[type] ?? '',
    },
    preventDefault,
  } as unknown as ClipboardEvent;
  return { event, preventDefault };
}

function selectEmptyParagraph(editor: ReturnType<typeof createEditor>) {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.select();
    },
    { discrete: true }
  );
}

describe('$markdownToNodes', () => {
  it('parses markdown into detached block nodes', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const nodes = $markdownToNodes('# title\n\n- one\n- two');
        expect(nodes).toHaveLength(2);
        expect($isHeadingNode(nodes[0])).toBe(true);
        expect($isListNode(nodes[1])).toBe(true);
        expect(nodes[0].getParent()).toBeNull();
      },
      { discrete: true }
    );
  });
});

describe('registerMarkdownPaste', () => {
  it('parses pasted markdown into formatted blocks', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent(
      '# GFM Test\n\n> a quote\n\n- [ ] task'
    );
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();

    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toContain('# GFM Test');
    expect(roundtrip).toContain('> a quote');
    expect(roundtrip).toContain('- [ ] task');
  });

  it('defers to the default paste when same-editor Lexical JSON is present', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent('# markdown heading', {
      'application/x-lexical-editor': JSON.stringify({
        namespace: editor._config.namespace,
        nodes: [],
      }),
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('still parses markdown when the Lexical JSON is from another editor', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event } = makePasteEvent('# markdown heading', {
      'application/x-lexical-editor': JSON.stringify({
        namespace: 'SomeOtherEditor',
        nodes: [],
      }),
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toContain('# markdown heading');
  });

  it('leaves plain prose to the default paste handling', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent(
      'just a plain sentence\nwith a second line'
    );
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('inserts pasted markdown at the selection, after existing content', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('existing'));
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      { discrete: true }
    );

    const { event } = makePasteEvent('## pasted heading');
    editor.dispatchCommand(PASTE_COMMAND, event);

    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toContain('existing');
    expect(roundtrip).toContain('## pasted heading');
    expect(roundtrip.indexOf('existing')).toBeLessThan(
      roundtrip.indexOf('## pasted heading')
    );
  });

  it('pastes at the cursor position, not at the start of the line', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('before after');
        paragraph.append(text);
        $getRoot().append(paragraph);
        // Place the caret between "before" and " after".
        text.select(6, 6);
      },
      { discrete: true }
    );

    const { event } = makePasteEvent('## middle');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);
    expect(handled).toBe(true);

    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip.indexOf('before')).toBeLessThan(
      roundtrip.indexOf('## middle')
    );
    expect(roundtrip.indexOf('## middle')).toBeLessThan(
      roundtrip.indexOf('after')
    );
  });

  it('merges a pasted link inline at the start of a heading without crashing', () => {
    // Regression: insertNodes + HeadingNode.insertNewAfter detaches the
    // heading when the caret is at its start, then throws
    // "Expected node N to have a parent".
    const editor = makeEditor();
    editor.update(() => $importMarkdownString('# Title\n\nsome text'), {
      discrete: true,
    });
    editor.update(
      () => {
        const first = $getRoot().getFirstDescendant();
        if (first && '__text' in first) {
          (first as ReturnType<typeof $createTextNode>).select(0, 0);
        }
      },
      { discrete: true }
    );

    const { event } = makePasteEvent('[site](https://example.com)');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);
    expect(handled).toBe(true);

    editor.read(() => {
      const firstBlock = $getRoot().getFirstChild();
      expect($isHeadingNode(firstBlock)).toBe(true);
      expect(firstBlock!.getTextContent()).toBe('siteTitle');
    });
  });

  it('inserts multi-block pastes above the line when at the start of a heading', () => {
    const editor = makeEditor();
    editor.update(() => $importMarkdownString('# Title'), { discrete: true });
    editor.update(
      () => {
        const first = $getRoot().getFirstDescendant();
        if (first && '__text' in first) {
          (first as ReturnType<typeof $createTextNode>).select(0, 0);
        }
      },
      { discrete: true }
    );

    const { event } = makePasteEvent('## above\n\nintro paragraph');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);
    expect(handled).toBe(true);

    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip.indexOf('## above')).toBeLessThan(
      roundtrip.indexOf('intro paragraph')
    );
    expect(roundtrip.indexOf('intro paragraph')).toBeLessThan(
      roundtrip.indexOf('# Title')
    );
  });

  function makeProductionEditor() {
    const editor = buildEditorFromExtensions(createMarkdownEditorExtension(''));
    registerMarkdownPaste(editor);
    return editor;
  }

  it('$markdownToNodes parses a table with production extensions', () => {
    const editor = makeProductionEditor();
    editor.update(
      () => {
        const nodes = $markdownToNodes(
          ['| City | Days |', '| --- | --- |', '| Kyoto | 3 |'].join('\n')
        );
        expect(nodes).toHaveLength(1);
        expect($isTableNode(nodes[0])).toBe(true);
      },
      { discrete: true }
    );
    editor.dispose();
  });

  it('parses pasted pipe-table markdown into a TableNode', () => {
    const editor = makeProductionEditor();
    const tableMarkdown = [
      '| City | Days |',
      '| --- | --- |',
      '| Kyoto | 3 |',
    ].join('\n');

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
        expect($insertMarkdownPasteNodes(tableMarkdown, paragraph)).toBe(true);
      },
      { discrete: true }
    );

    editor.getEditorState().read(() => {
      expect($isTableNode($getRoot().getFirstChild())).toBe(true);
    });
    editor.dispose();
  });

  it('parses pasted horizontal rule markdown into a HorizontalRuleNode', () => {
    const editor = makeProductionEditor();

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.select();
        expect(
          $insertMarkdownPasteNodes('---\n\nnext paragraph', paragraph)
        ).toBe(true);
      },
      { discrete: true }
    );

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect($isHorizontalRuleNode(children[0])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('next paragraph');
    });
    editor.dispose();
  });
});
