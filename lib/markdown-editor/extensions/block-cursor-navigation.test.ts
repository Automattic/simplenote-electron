import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from '@lexical/extension';
import { $isListNode } from '@lexical/list';
import {
  $createHeadingNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import { $isCodeNode } from '@lexical/code-core';
import { $isTableNode } from '@lexical/table';

import {
  $getCurrentTransientFromSelection,
  $isBlockCursorNode,
  $isGaplessBlock,
  $isTextFlowBlock,
} from './block-cursor-navigation';
import {
  $isBlockCursorTestNode,
  $createBlockCursorTestNode,
} from './block-cursor-test-node';
import {
  blockCursorTestNodeKeys,
  dispatchArrow,
  dispatchBackspace,
  expectTransientCaret,
  expectTextCaret,
  findTextNode,
  flushEditorUpdates,
  getFocusedTransient,
  importBlockCursorTestDocument,
  makeBlockCursorTestEditor,
  selectedNodeKeys,
  selectBlockCursorTestNode,
  selectTextNode,
} from './block-cursor-test-helpers';
import {
  importMarkdown,
  makeEditorWithAdjacentBlocks,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';

const ADJACENT_TABLE_A = ['| a | b |', '| --- | --- |', '| one | x |'].join(
  '\n'
);
const ADJACENT_TABLE_B = ['| c | d |', '| --- | --- |', '| y | last |'].join(
  '\n'
);
import { $exportMarkdownString } from './index';
import { $isImageNode } from '../nodes/image-node';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';
import { readToolbarState } from '../toolbar/state';

function focusedTransientAdjacentBlockKey(
  editor: ReturnType<typeof makeGfmTestEditor>,
  predicate: (node: LexicalNode) => boolean,
  direction: 'next' | 'previous'
): string | null {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }

    const anchorNode = selection.anchor.getNode();
    const transient = $isTransientParagraphNode(anchorNode)
      ? anchorNode
      : $isTransientParagraphNode(anchorNode.getParent())
        ? anchorNode.getParent()
        : null;
    if (!transient) {
      return null;
    }

    const sibling =
      direction === 'next'
        ? transient.getNextSibling()
        : transient.getPreviousSibling();
    return sibling && predicate(sibling) ? sibling.getKey() : null;
  });
}

function selectedHorizontalRuleKeys(
  editor: ReturnType<typeof makeGfmTestEditor>
): string[] {
  return selectedNodeKeys(editor, $isHorizontalRuleNode);
}

function selectHorizontalRule(
  editor: ReturnType<typeof makeGfmTestEditor>,
  index: number
): void {
  editor.update(() => {
    const hr = $getRoot().getChildren().filter($isHorizontalRuleNode)[index];
    if (!hr) {
      throw new Error(`Expected horizontal rule at index ${index}`);
    }
    const selection = $createNodeSelection();
    selection.add(hr.getKey());
    $setSelection(selection);
  });
}

function selectAfterImageInParagraph(
  editor: ReturnType<typeof makeGfmTestEditor>
): void {
  editor.update(
    () => {
      const paragraph = $getRoot().getFirstChild();
      if (!$isParagraphNode(paragraph)) {
        throw new Error('Expected image paragraph as first root child');
      }
      if (!paragraph.getChildren().some($isImageNode)) {
        throw new Error('Expected paragraph to contain an image');
      }

      const offset = paragraph.getChildrenSize();
      const selection = $createRangeSelection();
      selection.anchor.set(paragraph.getKey(), offset, 'element');
      selection.focus.set(paragraph.getKey(), offset, 'element');
      $setSelection(selection);
    },
    { discrete: true }
  );
}

function selectedBlockCursorTestNodeKeys(
  editor: ReturnType<typeof makeBlockCursorTestEditor>
): string[] {
  return selectedNodeKeys(editor, $isBlockCursorTestNode);
}

describe('$isBlockCursorNode', () => {
  it('returns true for a horizontal rule node', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---');
    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode) ?? null;
      expect($isBlockCursorNode(hr)).toBe(true);
    });
    editor.dispose();
  });

  it('returns true for a non-inline block decorator test node', () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 1 });
    editor.getEditorState().read(() => {
      const node =
        $getRoot().getChildren().find($isBlockCursorTestNode) ?? null;
      expect($isBlockCursorNode(node)).toBe(true);
    });
    editor.dispose();
  });

  it('returns false for a normal paragraph', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello');
    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      expect($isBlockCursorNode(paragraph)).toBe(false);
    });
    editor.dispose();
  });

  it('returns false for a heading', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '# Title');
    editor.getEditorState().read(() => {
      const heading = $getRoot().getFirstChild();
      expect($isBlockCursorNode(heading)).toBe(false);
    });
    editor.dispose();
  });

  it('matches nodes that need a block cursor', () => {
    const editor = makeBlockCursorTestEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createHeadingNode('h1'));
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('hello'));
        root.append(paragraph);
        root.append($createHorizontalRuleNode());
        root.append($createBlockCursorTestNode());
      },
      { discrete: true }
    );
    editor.getEditorState().read(() => {
      const [heading, paragraph, hr, block] = $getRoot().getChildren();
      expect($isBlockCursorNode(heading)).toBe(false);
      expect($isBlockCursorNode(paragraph)).toBe(false);
      expect($isBlockCursorNode(hr)).toBe(true);
      expect($isBlockCursorNode(block)).toBe(true);
    });
    editor.dispose();
  });
});

function countTransients(editor: ReturnType<typeof makeGfmTestEditor>): number {
  return editor
    .getEditorState()
    .read(
      () => $getRoot().getChildren().filter($isTransientParagraphNode).length
    );
}

function expectRangeSelection(
  selection: ReturnType<typeof $getSelection>
): asserts selection is RangeSelection {
  expect($isRangeSelection(selection)).toBe(true);
  if (!$isRangeSelection(selection)) {
    throw new Error('Expected range selection');
  }
}

describe('$isTextFlowBlock', () => {
  it('matches paragraphs, headings, quotes, and lists but not gapless blocks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      '# Title\n\npara\n\n> quote\n\n- one\n\n```\ncode\n```\n| a | b |\n| - | - |\n| 1 | 2 |\n\n---'
    );
    editor.getEditorState().read(() => {
      const textFlowBlocks: LexicalNode[] = [];
      const gaplessBlocks: LexicalNode[] = [];

      for (const node of $getRoot().getChildren()) {
        if ($isTransientParagraphNode(node)) {
          continue;
        }

        if (
          $isHeadingNode(node) ||
          ($isParagraphNode(node) && node.getTextContent() === 'para') ||
          $isQuoteNode(node) ||
          $isListNode(node)
        ) {
          textFlowBlocks.push(node);
          continue;
        }

        if (
          $isHorizontalRuleNode(node) ||
          $isCodeNode(node) ||
          $isTableNode(node)
        ) {
          gaplessBlocks.push(node);
        }
      }

      for (const node of textFlowBlocks) {
        expect($isTextFlowBlock(node)).toBe(true);
        expect($isGaplessBlock(node)).toBe(false);
      }
      for (const node of gaplessBlocks) {
        expect($isTextFlowBlock(node)).toBe(false);
        expect($isGaplessBlock(node)).toBe(true);
      }
    });
    editor.dispose();
  });
});

describe('$isGaplessBlock', () => {
  it('matches void blocks, code blocks, and tables but not text-flow blocks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      '# Title\n\npara\n\n```\ncode\n```\n| a | b |\n| - | - |\n| 1 | 2 |\n\n---'
    );
    editor.getEditorState().read(() => {
      const textFlowBlocks: LexicalNode[] = [];
      const gaplessBlocks: LexicalNode[] = [];

      for (const node of $getRoot().getChildren()) {
        if ($isTransientParagraphNode(node)) {
          continue;
        }

        if (
          $isHeadingNode(node) ||
          ($isParagraphNode(node) && node.getTextContent() === 'para')
        ) {
          textFlowBlocks.push(node);
          continue;
        }

        if (
          $isHorizontalRuleNode(node) ||
          $isCodeNode(node) ||
          $isTableNode(node)
        ) {
          gaplessBlocks.push(node);
        }
      }

      for (const node of textFlowBlocks) {
        expect($isGaplessBlock(node)).toBe(false);
      }
      for (const node of gaplessBlocks) {
        expect($isGaplessBlock(node)).toBe(true);
      }
    });
    editor.dispose();
  });
});

describe('transient paragraphs', () => {
  it('does not insert transients around plain paragraphs on import', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    await flushEditorUpdates(editor);
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('does not insert transients between gapless blocks until navigation', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');

    await flushEditorUpdates(editor);
    expect(countTransients(editor)).toBe(0);
  });

  it('creates a transient when arrowing into a gap between gapless blocks', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    expect(countTransients(editor)).toBe(1);
    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('removes an empty transient after arrowing out of the gap', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    await flushEditorUpdates(editor);
    expect(countTransients(editor)).toBe(0);
    editor.getEditorState().read(() => {
      const blocks = blockCursorTestNodeKeys(editor);
      expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toEqual([
        blocks[1],
      ]);
    });

    editor.dispose();
  });

  it('does not delete the previous gapless block when backspacing in a transient gap', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'second', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    const codeSnapshotBefore = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .filter($isCodeNode)
        .map((node) => ({
          key: node.getKey(),
          text: node.getTextContent(),
        }))
    );
    expect(codeSnapshotBefore).toEqual([
      { key: codeSnapshotBefore[0]?.key, text: 'first' },
      { key: codeSnapshotBefore[1]?.key, text: 'second' },
    ]);

    await dispatchBackspace(editor);

    editor.getEditorState().read(() => {
      const codes = $getRoot().getChildren().filter($isCodeNode);
      expect(codes.map((node) => node.getTextContent())).toEqual([
        'first',
        'second',
      ]);
      expect(codes.map((node) => node.getKey())).toEqual(
        codeSnapshotBefore.map(({ key }) => key)
      );
    });

    editor.dispose();
  });

  it('keeps focus on a trailing transient when arrowing down at the document end', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nonly\n```');
    selectTextNode(editor, 'only', 'only'.length);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    await flushEditorUpdates(editor);

    expect(countTransients(editor)).toBe(1);
    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('exits a trailing transient when arrowing up at the document end', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nonly\n```');
    selectTextNode(editor, 'only', 'only'.length);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await flushEditorUpdates(editor);

    expect(countTransients(editor)).toBe(0);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'only', 'only'.length);
    });

    editor.dispose();
  });

  it('keeps focus on a leading transient when arrowing up at the document start', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nonly\n```');
    selectTextNode(editor, 'only', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await flushEditorUpdates(editor);

    expect(countTransients(editor)).toBe(1);
    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('exits a leading transient when arrowing down at the document start', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nonly\n```');
    selectTextNode(editor, 'only', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    await flushEditorUpdates(editor);

    expect(countTransients(editor)).toBe(0);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'only', 0);
    });

    editor.dispose();
  });

  it('promotes a transient to a normal paragraph when text is entered', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    editor.update(() => {
      const transient = $getCurrentTransientFromSelection();
      if (!transient) {
        throw new Error('expected transient paragraph');
      }
      transient.append($createTextNode('gap'));
    });
    await flushEditorUpdates(editor);

    expect(countTransients(editor)).toBe(0);
    editor.getEditorState().read(() => {
      const paragraph = $getRoot()
        .getChildren()
        .find(
          (node) =>
            $isParagraphNode(node) &&
            !$isTransientParagraphNode(node) &&
            node.getTextContent() === 'gap'
        );
      expect(paragraph).toBeDefined();
    });

    editor.dispose();
  });
});

describe('block cursor test node keyboard navigation', () => {
  it('does not select a block cursor test node when arrowing up from text below', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toEqual([]);
      expect(findTextNode($getRoot(), 'below')).toBeDefined();
      expect($isNodeSelection($getSelection())).toBe(false);
    });

    editor.dispose();
  });

  it('opens a transient gap when arrowing up from a selected gapless block', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      const blocks = blockCursorTestNodeKeys(editor);
      expectTransientCaret($getSelection());
      expect(
        focusedTransientAdjacentBlockKey(editor, $isBlockCursorTestNode, 'next')
      ).toBe(blocks[1]);
    });

    editor.dispose();
  });

  it('moves through transients between adjacent block cursor test nodes', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);
    const blocks = blockCursorTestNodeKeys(editor);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(
      focusedTransientAdjacentBlockKey(editor, $isBlockCursorTestNode, 'next')
    ).toBe(blocks[1]);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toEqual([
      blocks[0],
    ]);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(
      focusedTransientAdjacentBlockKey(editor, $isBlockCursorTestNode, 'next')
    ).toBe(blocks[1]);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toEqual([
      blocks[1],
    ]);

    editor.dispose();
  });

  it('does not leave a root element selection between adjacent block cursor test nodes', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expectRangeSelection(selection);
      expect(selection.anchor.getNode().getType()).not.toBe('root');
      expectTransientCaret(selection);
    });

    editor.dispose();
  });

  it('does not move from a selected gapless block to text below on arrow down', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, { blockCount: 2, after: 'below' });
    selectBlockCursorTestNode(editor, 1);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toHaveLength(1);

    editor.dispose();
  });

  it('moves from a selected gapless block to text above on arrow up via Lexical', async () => {
    const editor = makeBlockCursorTestEditor();
    importBlockCursorTestDocument(editor, {
      before: 'above',
      blockCount: 2,
      after: 'below',
    });
    selectBlockCursorTestNode(editor, 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      expect(selectedNodeKeys(editor, $isBlockCursorTestNode)).toEqual([]);
      expect(findTextNode($getRoot(), 'above')).toBeDefined();
      expect($isNodeSelection($getSelection())).toBe(false);
    });

    editor.dispose();
  });
});

describe('horizontal rule keyboard navigation', () => {
  it('selects the nearest HR before opening a gap from text below', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hrs = $getRoot().getChildren().filter($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hrs[1]?.getKey()]);
      expect(countTransients(editor)).toBe(0);
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from a selected HR below another HR', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hrs = $getRoot().getChildren().filter($isHorizontalRuleNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isHorizontalRuleNode, 'next')
      ).toBe(hrs[1]?.getKey());
    });

    editor.dispose();
  });

  it('moves through transients between adjacent horizontal rules', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    const hrs = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .filter($isHorizontalRuleNode)
        .map((n) => n.getKey())
    );

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(
      focusedTransientAdjacentBlockKey(editor, $isHorizontalRuleNode, 'next')
    ).toBe(hrs[1]);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(selectedHorizontalRuleKeys(editor)).toEqual([hrs[0]]);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(
      focusedTransientAdjacentBlockKey(editor, $isHorizontalRuleNode, 'next')
    ).toBe(hrs[1]);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(selectedHorizontalRuleKeys(editor)).toEqual([hrs[1]]);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'below', 0);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('selects a single HR when arrowing down from text above it', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'above\n---');
    selectTextNode(editor, 'above', 'above'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      const selection = $getSelection();
      expect($isNodeSelection(selection)).toBe(true);
      expect(selection?.getNodes()[0].getKey()).toBe(hr?.getKey());
    });

    editor.dispose();
  });

  it('selects an HR when arrowing down after an image in the paragraph above it', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      '![Photo](https://example.com/photo.jpg)\n---\nbelow'
    );
    selectAfterImageInParagraph(editor);

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if (!$isRangeSelection(selection) || !$isParagraphNode(paragraph)) {
        return;
      }
      expect(selection.anchor.getNode().getKey()).toBe(paragraph.getKey());
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(paragraph.getChildrenSize());
    });

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      const selection = $getSelection();
      expect($isNodeSelection(selection)).toBe(true);
      expect(selection?.getNodes()[0].getKey()).toBe(hr?.getKey());
    });

    editor.dispose();
  });

  it('navigates down from text above through an HR gap to text below', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'above\n---\n---\nbelow');
    selectTextNode(editor, 'above', 'above'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'below', 0);
    });

    editor.dispose();
  });

  it('returns to text below after leaving an HR gap downward', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'below', 0);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('moves from the last HR to the start of a following list on arrow down', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\n- one\n- two');
    selectHorizontalRule(editor, 1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toEqual([]);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'one', 0);
    });

    editor.dispose();
  });

  it('moves from the first HR to the end of a preceding list on arrow up', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- one\n- two\n---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'two', 'two'.length);
    });
    expect(selectedHorizontalRuleKeys(editor)).toEqual([]);

    editor.dispose();
  });

  it('returns to text above after leaving a single HR upward', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'above\n---\n---\nbelow');
    selectTextNode(editor, 'above', 'above'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toEqual([]);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'above', 'above'.length);
    });

    editor.dispose();
  });

  it('lands in a transient rather than a root selection between adjacent HRs', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expectRangeSelection(selection);
      expect(selection.anchor.getNode().getType()).not.toBe('root');
      expectTransientCaret(selection);
    });

    editor.dispose();
  });

  it('steps through HR gaps when arrowing down from a list', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- from here\n---\n---\n---\nafter');

    selectTextNode(editor, 'from here', 'from here'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'after', 0);
    });

    editor.dispose();
  });

  it('steps through HR gaps when arrowing up from a list below HRs', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'before\n---\n---\n---\n- from here');

    selectTextNode(editor, 'from here', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'before', 'before'.length);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });
});

describe('vertical HR approach from any caret position', () => {
  it('selects the HR above when arrowing up from the middle of text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\nparagraph with text');
    selectTextNode(editor, 'paragraph with text', 'paragraph'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('selects the HR above when arrowing up from a later line in a list item', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n- line one\n- line two');
    selectTextNode(editor, 'line two', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('selects the HR below when arrowing down from the middle of a list item', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- from here\n---\n---\nafter');
    editor.update(() => {
      const textNode = findTextNode($getRoot(), 'from here');
      if (!textNode) {
        throw new Error('expected list item text');
      }
      textNode.select(4, 4);
    });

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hrs = $getRoot().getChildren().filter($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hrs[0]?.getKey()]);
    });

    editor.dispose();
  });

  it('selects the HR below when arrowing down from the start of a paragraph', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'para\n---');
    selectTextNode(editor, 'para', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('selects the HR below when arrowing down from the middle of a code block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nline\n```\n---');
    selectTextNode(editor, 'line', 1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('creates a transient when arrowing down from the end of a list item before HRs', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- from here\n---\n---\nafter');

    selectTextNode(editor, 'from here', 'from here'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    editor.dispose();
  });
});

describe('code block keyboard navigation', () => {
  it('does not force-select a code block when arrowing up from text below', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'below', 0);
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from a code block below another', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```\nbelow');
    selectTextNode(editor, 'second', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const codes = $getRoot().getChildren().filter($isCodeNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isCodeNode, 'next')
      ).toBe(codes[1]?.getKey());
    });

    editor.dispose();
  });

  it('moves through transients between adjacent code blocks', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```\nbelow');
    selectTextNode(editor, 'second', 0);
    const codes = editor.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .filter($isCodeNode)
        .map((node) => node.getKey())
    );

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(focusedTransientAdjacentBlockKey(editor, $isCodeNode, 'next')).toBe(
      codes[1]
    );

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'first', 'first'.length);
    });

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(focusedTransientAdjacentBlockKey(editor, $isCodeNode, 'next')).toBe(
      codes[1]
    );

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'second', 0);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('creates a transient when arrowing down from the end of a code block before another', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'first', 'first'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const codes = $getRoot().getChildren().filter($isCodeNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isCodeNode, 'next')
      ).toBe(codes[1]?.getKey());
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from the start of a code block after another', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'second', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const codes = $getRoot().getChildren().filter($isCodeNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isCodeNode, 'previous')
      ).toBe(codes[0]?.getKey());
    });

    editor.dispose();
  });

  it('enters the previous code block when exiting a transient upward between two codes', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- list item\n```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'second', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'first', 'first'.length);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('does not jump between code blocks when arrowing inside a code block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nline one\nline two\n```\n```\nsecond\n```');
    selectTextNode(editor, 'line one\nline two', 'line one'.length);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    expect(getFocusedTransient(editor)).toBeNull();
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expectRangeSelection(selection);
      expect(selection.anchor.getNode().getTextContent()).toBe(
        'line one\nline two'
      );
    });

    editor.dispose();
  });

  it('creates a transient when arrowing down from any position on the last code line', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'first', 2);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from any position on the first code line', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'second', 2);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('does not open a gap on horizontal arrow from the middle of the last code line', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'first', 2);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);
    expect(getFocusedTransient(editor)).toBeNull();

    editor.dispose();
  });

  it('creates a transient on horizontal arrow from the end of a code block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\nfirst\n```\n```\nsecond\n```');
    selectTextNode(editor, 'first', 'first'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });
});

describe('table and horizontal rule keyboard navigation', () => {
  it('selects the HR above when arrowing up inside a table', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['---', '| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'up', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('selects the HR below when arrowing down inside a table', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      [
        '| top | right |',
        '| --- | --- |',
        '| down | here |',
        '---',
        'after',
      ].join('\n')
    );

    selectTextNode(editor, 'down', 'down'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().filter($isHorizontalRuleNode)[0];
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('does not reset the caret to the first table cell when arrowing up', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'here', 2);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'here', 2);
    });

    editor.dispose();
  });

  it('does not reset the caret to the last table cell when arrowing down', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'top', 1);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'top', 1);
    });

    editor.dispose();
  });

  it('creates a transient between an HR and the table below it', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['---', '| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'top', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);
    expect(getFocusedTransient(editor)).not.toBeNull();

    editor.getEditorState().read(() => {
      const table = $getRoot().getChildren().find($isTableNode);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'next')
      ).toBe(table?.getKey());
    });

    editor.dispose();
  });

  it('enters a table from a transient below an HR', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['---', '| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'top', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'top', 0);
    });

    editor.dispose();
  });

  it('steps through a transient between an HR and a table below another gapless block', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      [
        '---',
        '| top | right |',
        '| --- | --- |',
        '| up | here |',
        '---',
        'after',
      ].join('\n')
    );

    selectTextNode(editor, 'top', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'top', 0);
    });

    editor.dispose();
  });

  it('selects the HR above when arrowing up from the second table row', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['---', '| top | right |', '| --- | --- |', '| up | here |'].join('\n')
    );

    selectTextNode(editor, 'up', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const hr = $getRoot().getChildren().find($isHorizontalRuleNode);
      expect(selectedHorizontalRuleKeys(editor)).toEqual([hr?.getKey()]);
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from any cell in the first table row', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'd', 1);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const tables = $getRoot().getChildren().filter($isTableNode);
      expectTransientCaret($getSelection());
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'next')
      ).toBe(tables[1]?.getKey());
    });

    editor.dispose();
  });

  it('creates a transient when arrowing down from the last table row before another table', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'one', 2);

    expect(await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const tables = $getRoot().getChildren().filter($isTableNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'next')
      ).toBe(tables[1]?.getKey());
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'previous')
      ).toBe(tables[0]?.getKey());
    });

    editor.dispose();
  });

  it('creates a transient when arrowing up from the first table cell after another table', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'c', 0);

    expect(await dispatchArrow(editor, KEY_ARROW_UP_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      const tables = $getRoot().getChildren().filter($isTableNode);
      expectTransientCaret($getSelection());
      expect(countTransients(editor)).toBe(1);
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'next')
      ).toBe(tables[1]?.getKey());
      expect(
        focusedTransientAdjacentBlockKey(editor, $isTableNode, 'previous')
      ).toBe(tables[0]?.getKey());
    });

    editor.dispose();
  });

  it('steps through a transient between adjacent tables', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'c', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'c', 0);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('enters the previous table when exiting a transient upward between two tables', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'c', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'x', 'x'.length);
    });
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('does not open a gap on horizontal arrow from the middle of the last table row', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'one', 2);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(false);
    expect(getFocusedTransient(editor)).toBeNull();

    editor.dispose();
  });

  it('creates a transient on horizontal arrow from the last table corner', async () => {
    const editor = makeEditorWithAdjacentBlocks(
      ADJACENT_TABLE_A,
      ADJACENT_TABLE_B
    );

    selectTextNode(editor, 'x', 'x'.length);

    expect(await dispatchArrow(editor, KEY_ARROW_RIGHT_COMMAND)).toBe(true);

    editor.getEditorState().read(() => {
      expectTransientCaret($getSelection());
    });

    editor.dispose();
  });

  it('selects an HR when leaving a transient gap downward before text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '```\ncode\n```\n---\nbelow');
    selectTextNode(editor, 'below', 0);

    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);

    expect(getFocusedTransient(editor)).toBeNull();
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);
    expect(countTransients(editor)).toBe(0);

    editor.dispose();
  });

  it('enters a table when leaving a transient gap downward below an HR', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['---', '| top | right |', '| --- | --- |', '| cell | here |'].join('\n')
    );

    selectTextNode(editor, 'top', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).not.toBeNull();

    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(getFocusedTransient(editor)).toBeNull();
    expect(selectedHorizontalRuleKeys(editor)).toEqual([]);
    editor.getEditorState().read(() => {
      expectTextCaret($getSelection(), 'top', 0);
    });

    editor.dispose();
  });

  it('approaches chained gapless blocks symmetrically from text above and below', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'above\n---\n```\ncode\n```\nbelow');

    selectTextNode(editor, 'above', 'above'.length);
    await dispatchArrow(editor, KEY_ARROW_DOWN_COMMAND);
    expect(selectedHorizontalRuleKeys(editor)).toHaveLength(1);

    selectTextNode(editor, 'below', 0);
    await dispatchArrow(editor, KEY_ARROW_UP_COMMAND);
    editor.getEditorState().read(() => {
      expect(getFocusedTransient(editor)).toBeNull();
      expectTextCaret($getSelection(), 'below', 0);
    });

    editor.dispose();
  });
});
