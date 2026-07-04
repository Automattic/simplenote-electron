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

  it('returns no decorations when markdown is disabled', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['# Title', '**bold**']),
      false
    );

    expect(decorations).toEqual([]);
  });

  it('decorates supported unordered list markers', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['* list item', '- second item', '  + nested item'])
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
      {
        range: {
          startLineNumber: 2,
          startColumn: 1,
          endLineNumber: 2,
          endColumn: 2,
        },
        options: { inlineClassName: 'md-list-marker' },
      },
      {
        range: {
          startLineNumber: 3,
          startColumn: 3,
          endLineNumber: 3,
          endColumn: 4,
        },
        options: { inlineClassName: 'md-list-marker' },
      },
    ]);
  });

  it('decorates inline spans inside unordered list items', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines([
        '- **bold** and *italic* and ~~strike~~',
        '  * _also italic_ and __bold__',
        '+ ***both*** and ___also___',
      ])
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
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 11,
        },
        options: { inlineClassName: 'md-bold' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 16,
          endLineNumber: 1,
          endColumn: 24,
        },
        options: { inlineClassName: 'md-italic' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 29,
          endLineNumber: 1,
          endColumn: 39,
        },
        options: { inlineClassName: 'md-strikethrough' },
      },
      {
        range: {
          startLineNumber: 2,
          startColumn: 3,
          endLineNumber: 2,
          endColumn: 4,
        },
        options: { inlineClassName: 'md-list-marker' },
      },
      {
        range: {
          startLineNumber: 2,
          startColumn: 5,
          endLineNumber: 2,
          endColumn: 18,
        },
        options: { inlineClassName: 'md-italic' },
      },
      {
        range: {
          startLineNumber: 2,
          startColumn: 23,
          endLineNumber: 2,
          endColumn: 31,
        },
        options: { inlineClassName: 'md-bold' },
      },
      {
        range: {
          startLineNumber: 3,
          startColumn: 1,
          endLineNumber: 3,
          endColumn: 2,
        },
        options: { inlineClassName: 'md-list-marker' },
      },
      {
        range: {
          startLineNumber: 3,
          startColumn: 3,
          endLineNumber: 3,
          endColumn: 13,
        },
        options: { inlineClassName: 'md-bold md-italic' },
      },
      {
        range: {
          startLineNumber: 3,
          startColumn: 18,
          endLineNumber: 3,
          endColumn: 28,
        },
        options: { inlineClassName: 'md-bold md-italic' },
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

  it('decorates renderer-compatible underscore spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['Decorate _foo_bar_ and __bold__'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 10,
          endLineNumber: 1,
          endColumn: 19,
        },
        options: { inlineClassName: 'md-italic' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 24,
          endLineNumber: 1,
          endColumn: 32,
        },
        options: { inlineClassName: 'md-bold' },
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

  it('decorates combined bold and italic spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['***both*** and ___also___'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 11,
        },
        options: { inlineClassName: 'md-bold md-italic' },
      },
      {
        range: {
          startLineNumber: 1,
          startColumn: 16,
          endLineNumber: 1,
          endColumn: 26,
        },
        options: { inlineClassName: 'md-bold md-italic' },
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

  it('decorates supported strikethrough spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines(['A ~~struck span~~ here'])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 1,
          startColumn: 3,
          endLineNumber: 1,
          endColumn: 18,
        },
        options: { inlineClassName: 'md-strikethrough' },
      },
    ]);
  });

  it('does not decorate escaped markers or URL-like spans', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines([
        'Skip \\*escaped\\* and https://example.com/*path*',
        'Skip \\~~escaped~~ and https://example.com/~~path~~',
      ])
    );

    expect(decorations).toEqual([]);
  });

  it('does not decorate inline markers inside code spans or fenced code blocks', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines([
        'Inline `**literal**` and `*literal*`',
        '```',
        '# Literal heading',
        '**literal**',
        '```',
        'After **bold**',
      ])
    );

    expect(decorations).toEqual([
      {
        range: {
          startLineNumber: 6,
          startColumn: 7,
          endLineNumber: 6,
          endColumn: 15,
        },
        options: { inlineClassName: 'md-bold' },
      },
    ]);
  });

  it('does not decorate whitespace-padded italic markers', () => {
    const decorations = getMarkdownDecorations(
      modelFromLines([
        'Skip * padded* and *padded * and _ padded_ and ~~ nope~~',
      ])
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
