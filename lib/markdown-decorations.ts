import { editor as Editor } from 'monaco-editor';

const urlPattern = /https?:\/\/\S+/g;
const italicPattern = /\*([^\s*][^*]*[^\s*]|[^\s*])\*/g;

type Span = {
  start: number;
  end: number;
};

const decoration = (
  lineNumber: number,
  startColumn: number,
  endColumn: number,
  inlineClassName: string
): Editor.IModelDeltaDecoration => ({
  range: {
    startLineNumber: lineNumber,
    startColumn,
    endLineNumber: lineNumber,
    endColumn,
  },
  options: { inlineClassName },
});

const spansForPattern = (line: string, pattern: RegExp): Span[] => {
  const spans: Span[] = [];
  let match;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(line))) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return spans;
};

const overlapsSpan = (start: number, end: number, spans: Span[]) =>
  spans.some((span) => start < span.end && end > span.start);

const isEscaped = (line: string, index: number) => {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && line[i] === '\\'; i--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
};

export const getMarkdownDecorations = (
  model?: Editor.ITextModel | null
): Editor.IModelDeltaDecoration[] => {
  if (!model) {
    return [];
  }

  const decorations: Editor.IModelDeltaDecoration[] = [];

  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const headingLevel = headingMatch[1].length;
      decorations.push(
        decoration(
          lineNumber,
          headingMatch[0].length - headingMatch[2].length + 1,
          line.length + 1,
          `md-heading-${headingLevel}`
        )
      );
      continue;
    }

    if (/^\*\s+/.test(line)) {
      decorations.push(decoration(lineNumber, 1, 2, 'md-list-marker'));
      continue;
    }

    const urlSpans = spansForPattern(line, urlPattern);
    italicPattern.lastIndex = 0;

    let match;
    while ((match = italicPattern.exec(line))) {
      const start = match.index;
      const end = start + match[0].length;

      if (
        isEscaped(line, start) ||
        isEscaped(line, end - 1) ||
        overlapsSpan(start, end, urlSpans)
      ) {
        continue;
      }

      decorations.push(decoration(lineNumber, start + 1, end + 1, 'md-italic'));
    }
  }

  return decorations;
};
