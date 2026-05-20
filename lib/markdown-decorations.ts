import { editor as Editor } from 'monaco-editor';

const urlPattern = /https?:\/\/\S+/g;
const boldPattern = /\*\*([^\s*][^*]*[^\s*]|[^\s*])\*\*/g;
const italicPattern = /\*([^\s*][^*]*[^\s*]|[^\s*])\*/g;

type Span = {
  start: number;
  end: number;
};

type InlineSpan = Span & {
  inlineClassName: string;
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

const isPartOfAsteriskRun = (line: string, start: number, end: number) =>
  line[start - 1] === '*' || line[end] === '*';

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
    const inlineSpans: InlineSpan[] = [];

    let match;
    boldPattern.lastIndex = 0;
    while ((match = boldPattern.exec(line))) {
      const start = match.index;
      const end = start + match[0].length;

      if (
        isEscaped(line, start) ||
        isEscaped(line, end - 2) ||
        overlapsSpan(start, end, urlSpans)
      ) {
        continue;
      }

      inlineSpans.push({ start, end, inlineClassName: 'md-bold' });
    }

    italicPattern.lastIndex = 0;
    while ((match = italicPattern.exec(line))) {
      const start = match.index;
      const end = start + match[0].length;

      if (
        isEscaped(line, start) ||
        isEscaped(line, end - 1) ||
        isPartOfAsteriskRun(line, start, end) ||
        overlapsSpan(start, end, urlSpans) ||
        overlapsSpan(start, end, inlineSpans)
      ) {
        continue;
      }

      inlineSpans.push({ start, end, inlineClassName: 'md-italic' });
    }

    inlineSpans
      .sort((a, b) => a.start - b.start)
      .forEach((span) => {
        decorations.push(
          decoration(
            lineNumber,
            span.start + 1,
            span.end + 1,
            span.inlineClassName
          )
        );
      });
  }

  return decorations;
};
