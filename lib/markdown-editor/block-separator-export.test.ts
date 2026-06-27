import { $getRoot } from 'lexical';

import { $exportMarkdownString } from './extensions';
import {
  blockSeparatorForExport,
  blocksNeedBlankLineBetween,
} from './block-separator-export';
import {
  makeEditorWithAdjacentBlocks,
  markdownWithGap,
} from './gfm-test-helpers';

const TABLE_A = ['| A |', '| --- |', '| 1 |'].join('\n');
const TABLE_B = ['| B |', '| --- |', '| 2 |'].join('\n');
const QUOTE_A = '> first';
const QUOTE_B = '> second';

describe('blockSeparatorForExport', () => {
  it('inserts a blank line between adjacent tables on export', () => {
    const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    editor.dispose();

    expect(exported).toBe(markdownWithGap(TABLE_A, 1, TABLE_B));
  });

  it('detects merge-sensitive table neighbors', () => {
    const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);
    const [first, second] = editor
      .getEditorState()
      .read(() => $getRoot().getChildren());
    expect(blocksNeedBlankLineBetween(first, second)).toBe(true);
    expect(blockSeparatorForExport(first, second, 0)).toBe('\n\n');
    editor.dispose();
  });

  it('inserts a blank line between adjacent blockquotes on export', () => {
    const editor = makeEditorWithAdjacentBlocks(QUOTE_A, QUOTE_B);
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    editor.dispose();

    expect(exported).toBe(markdownWithGap(QUOTE_A, 1, QUOTE_B));
  });

  it('detects merge-sensitive blockquote neighbors', () => {
    const editor = makeEditorWithAdjacentBlocks(QUOTE_A, QUOTE_B);
    const [first, second] = editor
      .getEditorState()
      .read(() => $getRoot().getChildren());
    expect(blocksNeedBlankLineBetween(first, second)).toBe(true);
    expect(blockSeparatorForExport(first, second, 0)).toBe('\n\n');
    editor.dispose();
  });
});
