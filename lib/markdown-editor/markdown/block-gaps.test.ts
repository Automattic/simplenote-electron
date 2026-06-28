import { $getRoot } from 'lexical';

import { $exportMarkdownString } from '../extensions/index';
import {
  blockSeparatorForExport,
  blocksNeedBlankLineBetween,
  GFM_PARAGRAPH_GAP,
  MIN_BLOCK_GAP,
  separatorBetweenRootBlocks,
} from './block-gaps';
import {
  importMarkdown,
  makeEditorWithAdjacentBlocks,
  makeGfmTestEditor,
  markdownWithGap,
} from './gfm-test-helpers';

const TABLE_A = ['| A |', '| --- |', '| 1 |'].join('\n');
const TABLE_B = ['| B |', '| --- |', '| 2 |'].join('\n');
const QUOTE_A = '> first';
const QUOTE_B = '> second';

describe('blockSeparatorForExport', () => {
  it('uses a single newline between a horizontal rule and a heading', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '---\n# Title');

    editor.getEditorState().read(() => {
      const [hr, heading] = $getRoot().getChildren();
      expect(blockSeparatorForExport(hr, heading)).toBe(MIN_BLOCK_GAP);
    });
    editor.dispose();
  });

  it('uses a blank line between adjacent content paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      expect(blockSeparatorForExport(first, second)).toBe(GFM_PARAGRAPH_GAP);
    });
    editor.dispose();
  });
});

describe('recordImportedGapBefore', () => {
  it('stores extra newlines beyond the default pair gap', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\n\nworld');

    editor.getEditorState().read(() => {
      const [, second] = $getRoot().getChildren();
      expect(
        separatorBetweenRootBlocks($getRoot().getFirstChild()!, second)
      ).toBe('\n\n\n');
    });
    editor.dispose();
  });

  it('does not store gaps that match the default separator width', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      expect(separatorBetweenRootBlocks(first, second)).toBe(GFM_PARAGRAPH_GAP);
    });
    editor.dispose();
  });
});

describe('blocksNeedBlankLineBetween', () => {
  it('requires a blank line between adjacent tables', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdownWithGap(TABLE_A, 0, TABLE_B));

    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      expect(blocksNeedBlankLineBetween(first, second)).toBe(true);
    });
    editor.dispose();
  });

  it('requires a blank line between adjacent blockquotes', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdownWithGap(QUOTE_A, 0, QUOTE_B));

    editor.getEditorState().read(() => {
      const [first, second] = $getRoot().getChildren();
      expect(blocksNeedBlankLineBetween(first, second)).toBe(true);
    });
    editor.dispose();
  });
});

describe('root block separators on export', () => {
  it('inserts a blank line between adjacent tables on export', () => {
    const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    editor.dispose();

    expect(exported).toBe(markdownWithGap(TABLE_A, 0, TABLE_B));
  });

  it('inserts a blank line between adjacent blockquotes on export', () => {
    const editor = makeEditorWithAdjacentBlocks(QUOTE_A, QUOTE_B);
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    editor.dispose();

    expect(exported).toBe(markdownWithGap(QUOTE_A, 0, QUOTE_B));
  });

  it('uses a blank line between a list and a following table', () => {
    const table = ['| A |', '| --- |', '| 1 |'].join('\n');
    const editor = makeGfmTestEditor();
    importMarkdown(
      editor,
      ['- First browser bullet', '- Second browser bullet', '', table].join(
        '\n'
      )
    );

    editor.getEditorState().read(() => {
      const [list, tableNode] = $getRoot().getChildren();
      expect(blockSeparatorForExport(list, tableNode)).toBe(GFM_PARAGRAPH_GAP);
    });
    editor.dispose();
  });

  it('uses a blank line between a horizontal rule and a following list', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- test\n\n---\n\n- test');

    editor.getEditorState().read(() => {
      const [, hr, list] = $getRoot().getChildren();
      expect(blockSeparatorForExport(hr, list)).toBe(GFM_PARAGRAPH_GAP);
    });
    editor.dispose();
  });
});
