import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
import { $createTransientParagraphNode } from '../nodes/transient-paragraph-node';
import {
  $collectTextSegments,
  $getTextMatchRanges,
  scrollRangeIntoView,
} from './search-highlight';

describe('markdown editor search highlights', () => {
  it('collects visible text with paragraph breaks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Hello\n\nWorld');

    const { text } = editor.getEditorState().read(() => $collectTextSegments());

    expect(text).toBe('Hello\n\nWorld');
  });

  it('finds case-insensitive matches in visible text', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Hello **WORLD**');

    const matches = editor
      .getEditorState()
      .read(() => $getTextMatchRanges('world'));

    expect(matches).toEqual([{ start: 6, end: 11 }]);
  });

  it('finds matches across multiple paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'alpha\n\nbeta alpha');

    const matches = editor
      .getEditorState()
      .read(() => $getTextMatchRanges('alpha'));

    expect(matches).toEqual([
      { start: 0, end: 5 },
      { start: 12, end: 17 },
    ]);
  });

  it('returns no matches for whitespace-only queries', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Hello world');

    const matches = editor
      .getEditorState()
      .read(() => $getTextMatchRanges('   '));

    expect(matches).toEqual([]);
  });

  it('ignores transient gap paragraphs when collecting searchable text', () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();

        const first = $createParagraphNode();
        first.append($createTextNode('Hello'));
        root.append(first);
        root.append($createTransientParagraphNode());

        const second = $createParagraphNode();
        second.append($createTextNode('World'));
        root.append(second);
      },
      { discrete: true }
    );

    const { text } = editor.getEditorState().read(() => $collectTextSegments());

    expect(text).toBe('Hello\n\nWorld');
    editor.dispose();
  });
});

describe('scrollRangeIntoView', () => {
  it('does not change scrollTop for a zero-size range', () => {
    const scrollContainer = document.createElement('div');
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 200 });
    scrollContainer.scrollTop = 50;

    scrollRangeIntoView(scrollContainer, {
      getBoundingClientRect: () =>
        ({ top: 0, left: 0, width: 0, height: 0 }) as DOMRect,
    } as Range);

    expect(scrollContainer.scrollTop).toBe(50);
  });

  it('scrolls to center a visible range', () => {
    const scrollContainer = document.createElement('div');
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 200 });
    scrollContainer.getBoundingClientRect = () =>
      ({ top: 100, left: 0, width: 0, height: 0 }) as DOMRect;
    scrollContainer.scrollTop = 0;

    scrollRangeIntoView(scrollContainer, {
      getBoundingClientRect: () =>
        ({ top: 350, left: 0, width: 10, height: 20 }) as DOMRect,
    } as Range);

    expect(scrollContainer.scrollTop).toBe(160);
  });
});
