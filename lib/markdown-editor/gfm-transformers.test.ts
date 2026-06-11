import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  KEY_ENTER_COMMAND,
  type LexicalNode,
} from 'lexical';
import { $isAutoLinkNode, $isLinkNode, LinkNode } from '@lexical/link';
import { $isCodeNode } from '@lexical/code-core';
import { $isHorizontalRuleNode } from '@lexical/extension';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableNode,
} from '@lexical/table';
import { $convertToMarkdownString } from '@lexical/markdown';
import { $isImageNode, ImageNode } from './image-node';
import { MARKDOWN_TRANSFORMERS } from './extensions';
import {
  importMarkdown,
  makeGfmTestEditor,
  rootChildren,
  roundtrip,
} from './gfm-test-helpers';

async function typeAtLineStart(
  editor: ReturnType<typeof makeGfmTestEditor>,
  shortcut: string
) {
  editor.update(
    () => {
      $getRoot().clear();
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectStart();
    },
    { discrete: true }
  );

  for (const char of shortcut) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }

  await Promise.resolve();
}

function findDescendant(
  node: LexicalNode,
  predicate: (node: LexicalNode) => boolean
): LexicalNode | undefined {
  if (predicate(node)) {
    return node;
  }
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      const found = findDescendant(child, predicate);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function tableFromRoot(editor: ReturnType<typeof makeGfmTestEditor>) {
  const children = rootChildren(editor);
  expect(children).toHaveLength(1);
  expect($isTableNode(children[0])).toBe(true);
  return children[0] as TableNode;
}

function cellParagraphFormat(cell: LexicalNode): string {
  if (!$isTableCellNode(cell)) {
    return '';
  }
  const paragraph = cell.getFirstChild();
  return $isParagraphNode(paragraph) ? paragraph.getFormatType() : '';
}

function expectRowColumnFormats(
  row: LexicalNode,
  formats: Array<'left' | 'center' | 'right' | ''>
) {
  expect($isTableRowNode(row)).toBe(true);
  const cells = row!.getChildren();
  expect(cells).toHaveLength(formats.length);
  formats.forEach((format, index) => {
    expect(cellParagraphFormat(cells[index])).toBe(format);
  });
}

describe('tables', () => {
  const simpleTable = [
    '| City | Days |',
    '| --- | --- |',
    '| Kyoto | 3 |',
  ].join('\n');

  it('imports a GFM pipe table as a TableNode at root', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);

    editor.getEditorState().read(() => {
      const table = tableFromRoot(editor);
      const rows = table.getChildren();
      expect(rows).toHaveLength(2);
      expect($isTableRowNode(rows[0])).toBe(true);
      expect($isTableRowNode(rows[1])).toBe(true);

      const headerCells = rows[0].getChildren();
      expect(headerCells).toHaveLength(2);
      expect(headerCells[0].getTextContent()).toBe('City');
      expect(headerCells[1].getTextContent()).toBe('Days');

      const dataCells = rows[1].getChildren();
      expect(dataCells[0].getTextContent()).toBe('Kyoto');
      expect(dataCells[1].getTextContent()).toBe('3');
    });
    editor.dispose();
  });

  it('round-trips a simple table exactly', () => {
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, simpleTable)).toBe(simpleTable);
    editor.dispose();
  });

  it('preserves column alignment markers on export', () => {
    const aligned = [
      '| L | C | R |',
      '| :--- | :---: | ---: |',
      '| a | b | c |',
    ].join('\n');
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, aligned)).toBe(aligned);
    editor.dispose();
  });

  it('applies column alignment to paragraph format in every row on import', () => {
    const aligned = [
      '| L | C | R |',
      '| :--- | :---: | ---: |',
      '| a | b | c |',
    ].join('\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, aligned);

    editor.getEditorState().read(() => {
      const table = tableFromRoot(editor);
      const rows = table.getChildren();
      expect(rows).toHaveLength(2);

      expectRowColumnFormats(rows[0], ['left', 'center', 'right']);
      expectRowColumnFormats(rows[1], ['left', 'center', 'right']);
    });
    editor.dispose();
  });

  it('leaves default-alignment tables with unformatted cell paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, simpleTable);

    editor.getEditorState().read(() => {
      const table = tableFromRoot(editor);
      for (const row of table.getChildren()) {
        expectRowColumnFormats(row, ['', '']);
      }
    });
    editor.dispose();
  });

  it('parses inline markdown inside cells', () => {
    const markdown = [
      '| **Bold** | `code` |',
      '| --- | --- |',
      '| [x](https://example.com) | y |',
    ].join('\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      const table = tableFromRoot(editor);
      const dataRow = table.getLastChild();
      expect($isTableRowNode(dataRow)).toBe(true);

      const cells = dataRow!.getChildren();
      const linkCell = cells[0];
      expect($isTableCellNode(linkCell)).toBe(true);
      expect(linkCell.getTextContent()).toBe('x');
      expect(findDescendant(linkCell, $isLinkNode)).toBeDefined();
    });
    editor.dispose();
  });

  it('leaves inline pipe text as a paragraph', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'see | one pipe inline');

    editor.getEditorState().read(() => {
      const children = rootChildren(editor);
      expect(children).toHaveLength(1);
      expect($isParagraphNode(children[0])).toBe(true);
      expect($isTableNode(children[0])).toBe(false);
    });
    editor.dispose();
  });
});

describe('horizontal rules', () => {
  it('imports --- as a HorizontalRuleNode at root', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---');

    editor.getEditorState().read(() => {
      const children = rootChildren(editor);
      expect(children).toHaveLength(1);
      expect($isHorizontalRuleNode(children[0])).toBe(true);
    });
    editor.dispose();
  });

  it('imports *** and ___ variants', () => {
    for (const marker of ['***', '___']) {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, marker);

      editor.getEditorState().read(() => {
        expect($isHorizontalRuleNode(rootChildren(editor)[0])).toBe(true);
      });
      editor.dispose();
    }
  });

  it('exports HR as --- (canonical, matching Turndown)', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---');
    const exported = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
    expect(exported).toBe('---');
    editor.dispose();
  });

  it('creates HR via --- + Enter shortcut', async () => {
    const editor = makeGfmTestEditor();
    await typeAtLineStart(editor, '---');
    editor.dispatchCommand(KEY_ENTER_COMMAND, null);
    await Promise.resolve();

    editor.getEditorState().read(() => {
      expect(
        rootChildren(editor).some((child) => $isHorizontalRuleNode(child))
      ).toBe(true);
    });
    editor.dispose();
  });
});

describe('images', () => {
  const safeImage = '![Photo](https://example.com/photo.jpg)';

  it('imports ![alt](https://example.com/x.jpg) as an ImageNode', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, safeImage);

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect($isParagraphNode(paragraph)).toBe(true);
      const image = paragraph.getChildren().find($isImageNode);
      expect(image).toBeDefined();
      expect(image!.getAltText()).toBe('Photo');
      expect(image!.getSrc()).toBe('https://example.com/photo.jpg');
    });
    editor.dispose();
  });

  it('round-trips safe HTTPS image markdown exactly', () => {
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, safeImage)).toBe(safeImage);
    editor.dispose();
  });

  it('exports unsafe image src preserving original markdown syntax', () => {
    const unsafe = '![Local](http://127.0.0.1/photo.jpg)';
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, unsafe)).toBe(unsafe);
    editor.dispose();
  });

  it('does not treat ![malformed as an image', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '![malformed');

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect(paragraph.getChildren().some($isImageNode)).toBe(false);
      expect(paragraph.getTextContent()).toBe('![malformed');
    });
    editor.dispose();
  });

  it('decorate renders img element for safe sources', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, safeImage);

    editor.getEditorState().read(() => {
      const image = rootChildren(editor)[0]
        .getChildren()
        .find($isImageNode) as ImageNode;
      const element = image.decorate();
      expect(element.type).toBe('img');
      expect(element.props.src).toBe('https://example.com/photo.jpg');
      expect(element.props.alt).toBe('Photo');
    });
    editor.dispose();
  });
});

describe('autolinks', () => {
  it('imports bare https URL as AutoLinkNode', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Visit https://example.com today');

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      const autoLink = paragraph
        .getChildren()
        .find((child) => $isAutoLinkNode(child));
      expect(autoLink).toBeDefined();
      expect(autoLink!.getURL()).toBe('https://example.com');
    });
    editor.dispose();
  });

  it('imports <https://example.com> autolink syntax', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'See <https://example.org> here');

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      const autoLink = paragraph
        .getChildren()
        .find((child) => $isAutoLinkNode(child));
      expect(autoLink).toBeDefined();
      expect(autoLink!.getURL()).toBe('https://example.org');
    });
    editor.dispose();
  });

  it('exports autolink as bare URL text', () => {
    const markdown = 'Visit https://example.com today';
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });

  it('does not autolink URL inside inline code', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Use `https://example.com` literally');

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect(paragraph.getChildren().some($isAutoLinkNode)).toBe(false);
      expect(paragraph.getTextContent()).toContain('https://example.com');
    });
    editor.dispose();
  });

  it('does not double-linkify [text](https://example.com)', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '[text](https://example.com)');

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect(paragraph.getChildren().filter($isLinkNode)).toHaveLength(1);
      expect(paragraph.getChildren().filter($isAutoLinkNode)).toHaveLength(0);
    });
    editor.dispose();
  });
});

describe('tilde code fences', () => {
  const tildeBlock = ['~~~js', 'const x = 1;', '~~~'].join('\n');

  it('imports ~~~js\\ncode\\n~~~ as CodeNode with language js', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, tildeBlock);

    editor.getEditorState().read(() => {
      const code = rootChildren(editor)[0];
      expect($isCodeNode(code)).toBe(true);
      expect(code.getLanguage()).toBe('js');
      expect(code.getTextContent()).toBe('const x = 1;');
    });
    editor.dispose();
  });

  it('round-trips tilde fence exactly', () => {
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, tildeBlock)).toBe(tildeBlock);
    editor.dispose();
  });

  it('exports back using ~~~ when imported with tildes', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, tildeBlock);
    const exported = editor
      .getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
    expect(exported.startsWith('~~~js')).toBe(true);
    expect(exported.endsWith('~~~')).toBe(true);
    editor.dispose();
  });
});

describe('hard line breaks', () => {
  it('imports foo\\\\\\nbar with LineBreakNode between parts', () => {
    const markdown = 'foo\\\nbar';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect($isParagraphNode(paragraph)).toBe(true);
      expect(paragraph.getChildren().some($isLineBreakNode)).toBe(true);
      expect(paragraph.getTextContent()).toBe('foo\nbar');
    });
    editor.dispose();
  });

  it('imports foo  \\nbar (two trailing spaces) with LineBreakNode', () => {
    const markdown = 'foo  \nbar';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      const paragraph = rootChildren(editor)[0];
      expect(paragraph.getChildren().some($isLineBreakNode)).toBe(true);
      expect(paragraph.getTextContent()).toBe('foo\nbar');
    });
    editor.dispose();
  });

  it('round-trips hard line break markers', () => {
    for (const markdown of ['foo\\\nbar', 'foo  \nbar']) {
      const editor = makeGfmTestEditor();
      expect(roundtrip(editor, markdown)).toBe(markdown);
      editor.dispose();
    }
  });
});

describe('gfm fixture parity', () => {
  it.each([
    [
      'simple table from Turndown',
      ['| City | Days |', '| --- | --- |', '| Kyoto | 3 |'].join('\n'),
    ],
    ['horizontal rule from Turndown', '---'],
    ['safe image from Turndown', '![Photo](https://example.com/photo.jpg)'],
    [
      'browser article clip excerpt',
      [
        '# Browser Article Clip',
        '',
        '**Bold lead** and *quiet emphasis* with [safe route](https://example.com/route?q=1).',
        '',
        '- First browser bullet',
        '- Second browser bullet',
        '',
        '| City | Days |',
        '| --- | --- |',
        '| Porto | 2 |',
      ].join('\n'),
    ],
    ['bare autolink URL', 'Visit https://example.com today'],
    [
      'inline code with URL not linkified',
      'Use `https://example.com` literally',
    ],
    ['tilde code fence', ['~~~js', 'const x = 1;', '~~~'].join('\n')],
    ['hard line break', 'foo\\\nbar'],
    ['task list item', '- [ ] open task'],
  ])('round-trips %s', (_label, markdown) => {
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });
});
