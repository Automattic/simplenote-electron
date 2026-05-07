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

  it('does not decorate escaped markers or URL-like spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Skip \\*escaped\\* and https://example.com/*path*'])
    );

    expect(decorations).toEqual([]);
  });

  it('does not decorate whitespace-padded italic markers', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Skip * padded* and *padded *'])
    );

    expect(decorations).toEqual([]);
  });
});
