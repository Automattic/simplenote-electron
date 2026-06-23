import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  PASTE_COMMAND,
} from 'lexical';
import { ListNode, ListItemNode, $isListNode } from '@lexical/list';
import {
  HeadingNode,
  QuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  $createQuoteNode,
} from '@lexical/rich-text';
import { CodeNode, $createCodeNode } from '@lexical/code-core';
import { LinkNode } from '@lexical/link';
import { $convertToMarkdownString } from '@lexical/markdown';

import { buildEditorFromExtensions } from '@lexical/extension';
import { $isTableNode } from '@lexical/table';
import { $isHorizontalRuleNode } from '@lexical/extension';
import {
  $getClipboardMarkdownFromDataTransfer,
  $importMarkdownString,
  $insertMarkdownPasteNodes,
  $markdownToNodes,
  createMarkdownEditorExtension,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
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

function makeMarkdownPasteEvent(
  markdown: string,
  extraData: Record<string, string> = {}
) {
  return makePasteEvent(markdown, {
    'text/markdown': markdown,
    ...extraData,
  });
}

const TERMINAL_LOG = `[info] Done packaging.
[info] Running (fork) com.tumblr.firehose.probe.FirehoseDevReadProbe 
[error] SLF4J: Failed to load class "org.slf4j.impl.StaticLoggerBinder".
[error] SLF4J: Defaulting to no-operation (NOP) logger implementation
[error] SLF4J: See http://www.slf4j.org/codes.html#StaticLoggerBinder for further details.
[error] Exception in thread "main" java.lang.IllegalStateException: failed connecting to host [jdbc:mysql://db1.platform.dca-tumblr.a8cblr.net:3306/firehose_staging?connectTimeout=5000&socketTimeout=10000&useSSL=false]
[error]         at com.tumblr.stargate.jdbc.HikariDataSourceImplicits$HikariBackedDatabaseContext$.toDatabaseContext(jdbc.scala:59)
[error]         at com.tumblr.firehose.probe.FirehoseDevReadProbe$.delayedEndpoint$com$tumblr$firehose$probe$FirehoseDevReadProbe$1(FirehoseDevReadProbe.scala:62)
[error]         at com.tumblr.firehose.probe.FirehoseDevReadProbe$delayedInit$body.apply(FirehoseDevReadProbe.scala:17)`;

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

describe('$getClipboardMarkdownFromDataTransfer', () => {
  it('follows text/markdown, text/html, then text/plain priority', () => {
    const getData = (type: string) =>
      ({
        'text/markdown': '# md',
        'text/html': '<h1>html</h1>',
        'text/plain': 'plain',
      })[type] ?? '';

    expect(
      $getClipboardMarkdownFromDataTransfer({ getData } as DataTransfer)
    ).toEqual({ markdown: '# md', source: 'text/markdown' });

    const htmlOnly = (type: string) =>
      ({
        'text/html': '<h1>html</h1>',
        'text/plain': 'plain',
      })[type] ?? '';

    expect(
      $getClipboardMarkdownFromDataTransfer({
        getData: htmlOnly,
      } as DataTransfer)
    ).toEqual({ markdown: '# html', source: 'text/html' });

    const plainOnly = (type: string) => (type === 'text/plain' ? 'plain' : '');

    expect(
      $getClipboardMarkdownFromDataTransfer({
        getData: plainOnly,
      } as DataTransfer)
    ).toEqual({ markdown: 'plain', source: 'text/plain' });
  });
});

describe('registerMarkdownPaste', () => {
  it('parses pasted markdown into formatted blocks', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makeMarkdownPasteEvent(
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

  it('inserts same-editor Lexical JSON losslessly instead of deferring', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent('copied text', {
      'application/x-lexical-editor': JSON.stringify({
        namespace: editor._config.namespace,
        nodes: [
          {
            type: 'paragraph',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [
              {
                type: 'text',
                version: 1,
                text: 'copied text',
                format: 0,
                style: '',
                mode: 'normal',
                detail: 0,
              },
            ],
          },
        ],
      }),
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    editor.read(() => {
      expect($getRoot().getTextContent()).toContain('copied text');
    });
  });

  it('still parses markdown when the Lexical JSON is from another editor', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event } = makeMarkdownPasteEvent('# markdown heading', {
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

  it('prefers text/markdown over plain text when both are present', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event } = makePasteEvent('plain only', {
      'text/markdown': '# markdown heading',
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toContain('# markdown heading');
    expect(roundtrip).not.toContain('plain only');
  });

  it('prefers text/html over plain text when both are present', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent(
      'Visit https://example.com for details',
      {
        'text/html': '<h2>Rich heading</h2><p>From HTML</p>',
      }
    );
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toContain('## Rich heading');
    expect(roundtrip).toContain('From HTML');
    expect(roundtrip).not.toContain('https://example.com');
  });

  it('inserts plain prose as plain text, split into paragraphs', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent(
      'just a plain sentence\nwith a second line'
    );
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    editor.read(() => {
      const text = $getRoot().getTextContent();
      expect(text).toContain('just a plain sentence');
      expect(text).toContain('with a second line');
    });
  });

  it('wraps selected text in a link when pasting a plain URL', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('visit site today');
        paragraph.append(text);
        $getRoot().append(paragraph);
        text.select(6, 10);
      },
      { discrete: true }
    );

    const { event, preventDefault } = makePasteEvent('https://example.com');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip).toBe('visit [site](https://example.com) today');
  });

  it('inserts plain-text markdown syntax verbatim, without parsing it', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent('## not a heading');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    editor.read(() => {
      expect($isHeadingNode($getRoot().getFirstChild())).toBe(false);
      expect($getRoot().getTextContent()).toContain('## not a heading');
    });
  });

  it('inserts multiline terminal logs as plain text without markdown parsing', () => {
    const editor = makeEditor();
    selectEmptyParagraph(editor);

    const { event, preventDefault } = makePasteEvent(TERMINAL_LOG);
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    editor.read(() => {
      const text = $getRoot().getTextContent();
      expect(text).toContain('[info] Done packaging.');
      expect(text).toContain('java.lang.IllegalStateException');
      // No code block / heading parsing of the log lines.
      expect(
        $getRoot()
          .getChildren()
          .every((n) => n.getType() !== 'code')
      ).toBe(true);
    });
  });

  it('pastes terminal logs into code blocks as raw plain text', () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const code = $createCodeNode();
        code.append($createTextNode(''));
        $getRoot().append(code);
        code.selectEnd();
      },
      { discrete: true }
    );

    const { event, preventDefault } = makePasteEvent(TERMINAL_LOG, {
      'text/html':
        '<meta charset="utf-8"><div>[info] Done packaging.</div><div>[error] SLF4J</div>',
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();

    editor.read(() => {
      const code = $getRoot().getFirstChild();
      expect(code?.getTextContent()).toBe(TERMINAL_LOG);
    });
  });

  const expectMultilineQuote = (editor: ReturnType<typeof makeEditor>) => {
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(1);
      const quote = children[0];
      expect($isQuoteNode(quote)).toBe(true);
      // Real line-break nodes (not a text node with an embedded "\n", which the
      // browser would collapse onto one line).
      const quoteChildren = (quote as QuoteNode).getChildren();
      expect(quoteChildren.map((n) => n.getType())).toEqual([
        'text',
        'linebreak',
        'text',
        'linebreak',
        'text',
      ]);
      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe(
        '> existing line1\n> line2\n> line3'
      );
    });
  };

  const makeQuoteEditor = () => {
    const editor = makeEditor();
    editor.update(
      () => {
        const quote = $createQuoteNode();
        quote.append($createTextNode('existing '));
        $getRoot().append(quote);
        quote.selectEnd();
      },
      { discrete: true }
    );
    return editor;
  };

  it('keeps multiline plain text inside a quote as line breaks', () => {
    const editor = makeQuoteEditor();

    const { event, preventDefault } = makePasteEvent('line1\nline2\nline3');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expectMultilineQuote(editor);
  });

  it('keeps multiline formatting-free HTML inside a quote as line breaks', () => {
    const editor = makeQuoteEditor();

    const { event, preventDefault } = makePasteEvent('line1\nline2\nline3', {
      'text/html':
        '<meta charset="utf-8"><div>line1</div><div>line2</div><div>line3</div>',
    });
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expectMultilineQuote(editor);
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

    const { event } = makeMarkdownPasteEvent('## pasted heading');
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

    const { event } = makeMarkdownPasteEvent('## middle');
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

    const { event } = makeMarkdownPasteEvent('[site](https://example.com)');
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

    const { event } = makeMarkdownPasteEvent('## above\n\nintro paragraph');
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

  it('inserts pasted list at the empty line, not at document end', () => {
    // Document:
    //   # Header
    //   <empty>
    //   ---
    // Pasting "- test" into <empty> should yield the list between the heading
    // and the rule, not appended after the rule at document end.
    const editor = makeProductionEditor();

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        for (const node of $markdownToNodes('# Header')) {
          root.append(node);
        }
        const emptyParagraph = $createParagraphNode();
        root.append(emptyParagraph);
        for (const node of $markdownToNodes('---')) {
          root.append(node);
        }
        emptyParagraph.select();
      },
      { discrete: true }
    );

    const { event } = makeMarkdownPasteEvent('- test');
    const handled = editor.dispatchCommand(PASTE_COMMAND, event);
    expect(handled).toBe(true);

    const roundtrip = editor.read(() =>
      $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
    );
    expect(roundtrip.indexOf('# Header')).toBeLessThan(
      roundtrip.indexOf('- test')
    );
    expect(roundtrip.indexOf('- test')).toBeLessThan(roundtrip.indexOf('---'));

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect($isHeadingNode(children[0])).toBe(true);
      expect($isListNode(children[1])).toBe(true);
      expect($isHorizontalRuleNode(children[2])).toBe(true);
      expect(children[1]?.getTextContent()).toBe('test');
    });

    editor.dispose();
  });
});
