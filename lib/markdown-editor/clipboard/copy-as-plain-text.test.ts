import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import { $isCodeNode } from '@lexical/code-core';
import { $isListItemNode, $isListNode } from '@lexical/list';

import { copySelectionAsPlainText } from './copy-as-plain-text';
import { createMarkdownEditorExtension } from '../extensions/index';

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

function selectAll(editor: ReturnType<typeof makeEditor>) {
  editor.update(
    () => {
      const root = $getRoot();
      root.select(0, root.getChildrenSize());
    },
    { discrete: true }
  );
}

function selectFirstListItem(editor: ReturnType<typeof makeEditor>) {
  editor.update(
    () => {
      const list = $getRoot().getFirstChild();
      if (!$isListNode(list)) {
        throw new Error('Expected a list');
      }
      const item = list.getFirstChild();
      if (!$isListItemNode(item)) {
        throw new Error('Expected a list item');
      }
      item.select(0, item.getChildrenSize());
    },
    { discrete: true }
  );
}

describe('copy as plain text', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
  });

  it('writes stripped visible text for a fenced code block', () => {
    const editor = makeEditor('```\nconst a = 1;\nconst b = 2;\n```');
    selectAll(editor);

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('const a = 1;\nconst b = 2;');
    expect(writeText.mock.calls[0][0]).not.toContain('```');

    editor.dispose();
  });

  it('writes stripped visible text for quotes and paragraphs', () => {
    const editor = makeEditor('> first quoted line\n\nplain paragraph');
    selectAll(editor);

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(
      'first quoted line\nplain paragraph'
    );
    expect(writeText.mock.calls[0][0]).not.toContain('>');

    editor.dispose();
  });

  it('writes stripped visible text for headings and lists', () => {
    const editor = makeEditor('# Title\n\n- one\n- two');
    selectAll(editor);

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Title\none\ntwo');
    expect(writeText.mock.calls[0][0]).not.toContain('#');
    expect(writeText.mock.calls[0][0]).not.toContain('- ');

    editor.dispose();
  });

  it('writes stripped checklist item text without markdown markers', () => {
    const editor = makeEditor('- [ ] open task');
    selectAll(editor);

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('open task');
    expect(writeText.mock.calls[0][0]).not.toContain('- [ ]');

    editor.dispose();
  });

  it('writes stripped text for a single copied list item', () => {
    const editor = makeEditor('- [ ] task one\n- two\n- [ ] task three');
    selectFirstListItem(editor);

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('task one');

    editor.dispose();
  });

  it('writes partial list item text without markdown markers', () => {
    const editor = makeEditor('- alpha\n- beta');
    editor.update(
      () => {
        const textNode = findTextNode($getRoot(), 'alpha');
        if (!textNode) {
          throw new Error('Expected alpha text node');
        }
        textNode.select(0, 3);
      },
      { discrete: true }
    );

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('alp');

    editor.dispose();
  });

  it('writes only the selected code line as stripped text', () => {
    const editor = makeEditor('```\nconst a = 1;\nconst b = 2;\n```');
    const selectedLine = 'const a = 1;';
    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        if (!$isCodeNode(code)) {
          throw new Error('Expected a code block');
        }
        const textNode = code.getFirstChild();
        if (!$isTextNode(textNode)) {
          throw new Error('Expected code text node');
        }
        textNode.select(0, selectedLine.length);
      },
      { discrete: true }
    );

    expect(copySelectionAsPlainText(editor)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(selectedLine);
    expect(writeText.mock.calls[0][0]).not.toContain('```');

    editor.dispose();
  });

  it('does nothing for a collapsed selection', () => {
    const editor = makeEditor('hello');
    editor.update(
      () => {
        $getRoot().selectStart();
      },
      { discrete: true }
    );

    expect(copySelectionAsPlainText(editor)).toBe(false);
    expect(writeText).not.toHaveBeenCalled();

    editor.dispose();
  });
});
