import { $exportMarkdownString } from './extensions';
import {
  describeRootBlocksFromEditor,
  idempotentRoundtripMarkdown,
  makeEditorWithAdjacentBlocks,
  makeEditorWithAdjacentLists,
  makeGfmTestEditorFromMarkdown,
  markdownWithGap,
  simulateSaveReopenFromEditor,
  stableNoteSwitchMarkdown,
} from './gfm-test-helpers';

const TABLE_A = ['| A |', '| --- |', '| 1 |'].join('\n');
const TABLE_B = ['| B |', '| --- |', '| 2 |'].join('\n');

describe('merge-sensitive block separation', () => {
  describe('separated by a blank line', () => {
    it.each([
      {
        label: 'tables',
        before: TABLE_A,
        after: TABLE_B,
        expected: ['table:1x2', 'empty', 'table:1x2'],
      },
      {
        label: 'bullet lists',
        before: '- one',
        after: '- two',
        expected: ['list:bullet:1', 'empty', 'list:bullet:1'],
      },
      {
        label: 'ordered lists',
        before: '1. one',
        after: '1. two',
        expected: ['list:number:1', 'empty', 'list:number:1'],
      },
      {
        label: 'checklists',
        before: '- [ ] one',
        after: '- [ ] two',
        expected: ['list:check:1', 'empty', 'list:check:1'],
      },
      {
        label: 'blockquotes',
        before: '> first',
        after: '> second',
        expected: ['quote:"first"', 'empty', 'quote:"second"'],
      },
    ])(
      'preserves two $label through repeated note switches',
      ({ before, after, expected }) => {
        const markdown = markdownWithGap(before, 1, after);
        const { finalMarkdown, rootBlocksPerCycle } = stableNoteSwitchMarkdown(
          markdown,
          2
        );

        expect(rootBlocksPerCycle[0]).toEqual(expected);
        expect(rootBlocksPerCycle[1]).toEqual(expected);
        expect(finalMarkdown).toBe(markdown);

        const { once, twice } = idempotentRoundtripMarkdown(markdown);
        expect(twice).toBe(once);
      }
    );
  });

  describe('adjacent without a blank line', () => {
    it('preserves two adjacent tables in the live editor', () => {
      const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);

      expect(describeRootBlocksFromEditor(editor)).toEqual([
        'table:1x2',
        'table:1x2',
      ]);
      editor.dispose();
    });

    it('preserves two adjacent tables through save and reopen', () => {
      const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);
      const expected = ['table:1x2', 'table:1x2'];

      const { rootBlocksAfterReopen } = simulateSaveReopenFromEditor(editor);
      expect(rootBlocksAfterReopen).toEqual(expected);
    });

    it('exports a blank line between adjacent tables so reopen stays split', () => {
      const editor = makeEditorWithAdjacentBlocks(TABLE_A, TABLE_B);
      const { storeContent, rootBlocksAfterReopen } =
        simulateSaveReopenFromEditor(editor);

      expect(storeContent).toBe(markdownWithGap(TABLE_A, 1, TABLE_B));
      expect(rootBlocksAfterReopen).toEqual([
        'table:1x2',
        'empty',
        'table:1x2',
      ]);
    });

    it('merges adjacent bullet lists in the live editor model', () => {
      const editor = makeEditorWithAdjacentLists('bullet', ['one', 'two']);

      expect(describeRootBlocksFromEditor(editor)).toEqual(['list:bullet:2']);
      editor.dispose();
    });
  });
});

describe('markdown roundtrip idempotence', () => {
  it('does not change markdown that already separates merge-sensitive blocks', () => {
    const markdown = markdownWithGap(TABLE_A, 1, TABLE_B);
    const editor = makeGfmTestEditorFromMarkdown(markdown);
    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    editor.dispose();

    expect(exported).toBe(markdown);
    expect(idempotentRoundtripMarkdown(markdown)).toEqual({
      once: markdown,
      twice: markdown,
    });
  });
});
