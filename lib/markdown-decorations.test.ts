import { editor as Editor } from 'monaco-editor';

import { getMarkdownDecorations } from './markdown-decorations';

const modelFromLines = (lines: string[]) =>
  ({
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1],
  }) as unknown as Editor.ITextModel;

describe('getMarkdownDecorations', () => {
  it('decorates heading text by level', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['# Title', '### Smaller'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 8,
        },
        options: { inlineClassName: 'md-heading-1' },
      },
      {
        range: {
          startLineNumber: 2,
          startColumn: 5,
          endLineNumber: 2,
          endColumn: 12,
        },
        options: { inlineClassName: 'md-heading-3' },
      },
    ]);
  });

  it('decorates only the asterisk marker for supported unordered lists', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['* list item', '- out of scope'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 2,
        },
        options: { inlineClassName: 'md-list-marker' },
      },
    ]);
  });

  it('decorates supported italic spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['A *simple span* here'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 16,
        },
        options: { inlineClassName: 'md-italic' },
      },
    ]);
  });

  it('decorates supported underscore italic spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['A _simple span_ here'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 16,
        },
        options: { inlineClassName: 'md-italic' },
      },
    ]);
  });

  it('decorates double-asterisk spans as bold instead of italic', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['A **bold span** here'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 16,
        },
        options: { inlineClassName: 'md-bold' },
      },
    ]);
  });

  it('decorates bold and italic spans independently', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Use **bold** and *italic* and _also italic_'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 5,
          endLineNumber: 1,
          endColumn: 13,
        },
        options: { inlineClassName: 'md-bold' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 18,
          endLineNumber: 1,
          endColumn: 26,
        },
        options: { inlineClassName: 'md-italic' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 31,
          endLineNumber: 1,
          endColumn: 44,
        },
        options: { inlineClassName: 'md-italic' },
      },
    ]);
  });

  it('does not decorate escaped markers or URL-like spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Skip \\*escaped\\* and https://example.com/*path*'])
    );

    expect(decorations).toEqual([]);
  });

  it('does not decorate whitespace-padded italic markers', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Skip * padded* and *padded * and _ padded_'])
    );

    expect(decorations).toEqual([]);
  });

  it('does not decorate underscores inside words', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Keep snake_case_text literal'])
    );

    expect(decorations).toEqual([]);
  });
});
