import {
  $getRoot,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
  $createNodeSelection,
  $createRangeSelection,
  $setSelection,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import { $createListItemNode, $createListNode } from '@lexical/list';
import { $isHorizontalRuleNode } from '@lexical/extension';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';

import { importMarkdown, makeGfmTestEditor } from '../gfm-test-helpers';
import { $isImageNode } from '../image-node';
import {
  readToolbarState,
  toolbarStateEqual,
  type ToolbarState,
} from './state';

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
  offset = 0
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      const selection = textNode.select(offset, offset);
      selection.format = textNode.getFormat();
    },
    { discrete: true }
  );
}

function selectTableCell(
  editor: LexicalEditorWithDispose,
  rowIndex: number,
  columnIndex: number
): void {
  editor.update(
    () => {
      const table = $getRoot().getFirstChild();
      if (!table || table.getType() !== 'table') {
        throw new Error('Expected table at root');
      }
      const row = table.getChildAtIndex(rowIndex);
      if (!row) {
        throw new Error('Expected table row');
      }
      const cell = row.getChildAtIndex(columnIndex);
      if (!cell) {
        throw new Error('Expected table cell');
      }
      cell.selectStart();
    },
    { discrete: true }
  );
}

const emptyToolbarState = (): ToolbarState => ({
  inTitle: false,
  bold: false,
  italic: false,
  strike: false,
  code: false,
  link: false,
  inImage: false,
  inHorizontalRule: false,
  h1: false,
  h2: false,
  h3: false,
  h4: false,
  activeList: null,
  blockquote: false,
  codeBlock: false,
  inTable: false,
});

describe('readToolbarState', () => {
  it('reflects inline formats and link state', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '**bold** *italic* ~~strike~~ `code`');
    selectTextNode(editor, 'bold', 1);

    expect(readToolbarState(editor)).toMatchObject({
      bold: true,
      italic: false,
      strike: false,
      code: false,
      link: false,
    });

    selectTextNode(editor, 'italic', 1);
    expect(readToolbarState(editor)).toMatchObject({
      bold: false,
      italic: true,
    });

    selectTextNode(editor, 'strike', 1);
    expect(readToolbarState(editor).strike).toBe(true);

    selectTextNode(editor, 'code', 1);
    expect(readToolbarState(editor).code).toBe(true);

    importMarkdown(editor, '[site](https://example.com)');
    selectTextNode(editor, 'site', 1);
    expect(readToolbarState(editor).link).toBe(true);

    importMarkdown(editor, 'before [site](https://example.com)');
    editor.update(
      () => {
        const beforeNode = findTextNode($getRoot(), 'before ');
        const siteNode = findTextNode($getRoot(), 'site');
        if (!beforeNode || !siteNode) {
          throw new Error('Expected before and site text nodes');
        }
        const selection = $createRangeSelection();
        selection.anchor.set(
          beforeNode.getKey(),
          beforeNode.getTextContentSize(),
          'text'
        );
        selection.focus.set(siteNode.getKey(), 0, 'text');
        $setSelection(selection);
      },
      { discrete: true }
    );
    expect(readToolbarState(editor).link).toBe(true);

    importMarkdown(editor, '[site](https://example.com) after');
    editor.update(
      () => {
        const siteNode = findTextNode($getRoot(), 'site');
        const afterNode = findTextNode($getRoot(), ' after');
        if (!siteNode || !afterNode) {
          throw new Error('Expected site and after text nodes');
        }
        const selection = $createRangeSelection();
        selection.anchor.set(
          siteNode.getKey(),
          siteNode.getTextContentSize(),
          'text'
        );
        selection.focus.set(afterNode.getKey(), 0, 'text');
        $setSelection(selection);
      },
      { discrete: true }
    );
    expect(readToolbarState(editor).link).toBe(true);

    editor.dispose();
  });

  it('reflects heading, list, blockquote, and code block states', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '## Section');
    selectTextNode(editor, 'Section', 1);
    expect(readToolbarState(editor)).toMatchObject({
      h1: false,
      h2: true,
      h3: false,
      h4: false,
      blockquote: false,
      codeBlock: false,
    });

    importMarkdown(editor, '- one\n- two');
    selectTextNode(editor, 'two', 1);
    expect(readToolbarState(editor).activeList).toBe('bulletList');

    importMarkdown(editor, '1. first');
    selectTextNode(editor, 'first', 1);
    expect(readToolbarState(editor).activeList).toBe('orderedList');

    importMarkdown(editor, '- [ ] task');
    selectTextNode(editor, 'task', 1);
    expect(readToolbarState(editor).activeList).toBe('taskList');

    importMarkdown(editor, '> quoted');
    selectTextNode(editor, 'quoted', 1);
    expect(readToolbarState(editor)).toMatchObject({
      blockquote: true,
      codeBlock: false,
    });

    importMarkdown(editor, '```\nline\n```');
    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        code?.selectStart();
      },
      { discrete: true }
    );
    expect(readToolbarState(editor).codeBlock).toBe(true);

    editor.dispose();
  });

  it('marks inTitle when the caret is in the first root block', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '# Title\n\nBody text');
    selectTextNode(editor, 'Title', 1);
    expect(readToolbarState(editor).inTitle).toBe(true);

    selectTextNode(editor, 'Body text', 1);
    expect(readToolbarState(editor).inTitle).toBe(false);

    editor.dispose();
  });

  it('clears block toggles when the selection is inside a table', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['| City | Days |', '| --- | --- |', '| Kyoto | 3 |'].join('\n')
    );
    selectTableCell(editor, 1, 0);

    expect(readToolbarState(editor)).toMatchObject({
      inTable: true,
      h1: false,
      h2: false,
      h3: false,
      h4: false,
      activeList: null,
      blockquote: false,
      codeBlock: false,
    });

    editor.dispose();
  });

  it('suppresses block toggles inside table cells that contain block nodes', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| Cell |', '| --- |', '| text |'].join('\n'));

    editor.update(
      () => {
        const table = $getRoot().getFirstChild();
        if (!table || !$isTableNode(table)) {
          throw new Error('Expected table at root');
        }
        const row = table.getChildAtIndex(1);
        if (!$isTableRowNode(row)) {
          throw new Error('Expected table row');
        }
        const cell = row.getChildAtIndex(0);
        if (!$isTableCellNode(cell)) {
          throw new Error('Expected table cell');
        }

        cell.clear();
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        item.append($createTextNode('item'));
        list.append(item);
        cell.append(list);
        item.selectStart();
      },
      { discrete: true }
    );

    expect(readToolbarState(editor)).toMatchObject({
      inTable: true,
      activeList: null,
    });

    editor.dispose();
  });

  it('marks inImage when an image node is selected', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '![Photo](https://example.com/photo.jpg)');

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

    expect(readToolbarState(editor).inImage).toBe(true);
    editor.dispose();
  });

  it('marks inHorizontalRule when a horizontal rule node is selected', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---');

    editor.update(
      () => {
        const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
        if (!hr) {
          throw new Error('Expected horizontal rule node');
        }
        const selection = $createNodeSelection();
        selection.add(hr.getKey());
        $setSelection(selection);
      },
      { discrete: true }
    );

    expect(readToolbarState(editor).inHorizontalRule).toBe(true);
    editor.dispose();
  });
});

describe('toolbarStateEqual', () => {
  it('returns true for identical states', () => {
    const state = emptyToolbarState();
    expect(toolbarStateEqual(state, { ...state })).toBe(true);
  });

  it('returns false when any field differs', () => {
    const base = emptyToolbarState();
    expect(toolbarStateEqual(base, { ...base, bold: true })).toBe(false);
    expect(toolbarStateEqual(base, { ...base, activeList: 'bulletList' })).toBe(
      false
    );
    expect(toolbarStateEqual(base, { ...base, inTable: true })).toBe(false);
  });
});
