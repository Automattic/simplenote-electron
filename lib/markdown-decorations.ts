import { editor as Editor } from 'monaco-editor';

const urlPattern = /https?:\/\/\S+/g;
const boldItalicPattern = /\*\*\*(\S[\s\S]*?)\*\*\*/g;
const boldPattern = /\*\*(\S[\s\S]*?)\*\*/g;
const italicPattern = /\*([^\s*][\s\S]*?)\*/g;
const underscoreBoldItalicPattern = /\b___(\S[\s\S]*?)___\b/g;
const underscoreBoldPattern = /\b__(\S[\s\S]*?)__\b/g;
const underscoreItalicPattern = /\b_(\S[\s\S]*?)_\b/g;
const strikethroughPattern = /~~([^\s~][^~]*[^\s~]|[^\s~])~~/g;
const codeFencePattern = /^ {0,3}(`{3,}|~{3,})/;

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

const codeSpansForLine = (line: string): Span[] => {
  const spans: Span[] = [];
  let index = 0;

  while (index < line.length) {
    const start = line.indexOf('`', index);
    if (start === -1) {
      break;
    }

    const delimiterLength = line.slice(start).match(/^`+/)?.[0].length ?? 0;
    const end = line.indexOf(
      '`'.repeat(delimiterLength),
      start + delimiterLength
    );
    if (end === -1) {
      break;
    }

    spans.push({ start, end: end + delimiterLength });
    index = end + delimiterLength;
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

const hasTextBeforeClosingMarker = (text: string) => /\S$/.test(text);

const addInlineSpansForPattern = (
  line: string,
  pattern: RegExp,
  markerLength: number,
  inlineClassName: string,
  skippedSpans: Span[],
  inlineSpans: InlineSpan[]
) => {
  let match;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(line))) {
    const start = match.index;
    const end = start + match[0].length;

    if (
      !hasTextBeforeClosingMarker(match[1]) ||
      isEscaped(line, start) ||
      isEscaped(line, end - markerLength) ||
      overlapsSpan(start, end, skippedSpans) ||
      overlapsSpan(start, end, inlineSpans)
    ) {
      continue;
    }

    inlineSpans.push({ start, end, inlineClassName });
  }
};

export const getMarkdownDecorations = (
  model?: Editor.ITextModel | null
): Editor.IModelDeltaDecoration[] => {
  if (!model) {
    return [];
  }

  const decorations: Editor.IModelDeltaDecoration[] = [];
  let codeFence: { character: string; length: number } | null = null;

  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber);
    const codeFenceMatch = codeFencePattern.exec(line);

    if (codeFence) {
      if (
        codeFenceMatch &&
        codeFenceMatch[1][0] === codeFence.character &&
        codeFenceMatch[1].length >= codeFence.length
      ) {
        codeFence = null;
      }
      continue;
    }

    if (codeFenceMatch) {
      codeFence = {
        character: codeFenceMatch[1][0],
        length: codeFenceMatch[1].length,
      };
      continue;
    }

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

    const listMatch = /^(\s*)([-*+])\s+/.exec(line);
    if (listMatch) {
      const markerColumn = listMatch[1].length + 1;
      decorations.push(
        decoration(lineNumber, markerColumn, markerColumn + 1, 'md-list-marker')
      );
    }

    const skippedSpans = [
      ...(listMatch
        ? [
            {
              start: listMatch[1].length,
              end: listMatch[1].length + listMatch[2].length,
            },
          ]
        : []),
      ...spansForPattern(line, urlPattern),
      ...codeSpansForLine(line),
    ];
    const inlineSpans: InlineSpan[] = [];

    addInlineSpansForPattern(
      line,
      boldItalicPattern,
      3,
      'md-bold md-italic',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      boldPattern,
      2,
      'md-bold',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      italicPattern,
      1,
      'md-italic',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      underscoreBoldItalicPattern,
      3,
      'md-bold md-italic',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      underscoreBoldPattern,
      2,
      'md-bold',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      underscoreItalicPattern,
      1,
      'md-italic',
      skippedSpans,
      inlineSpans
    );
    addInlineSpansForPattern(
      line,
      strikethroughPattern,
      2,
      'md-strikethrough',
      skippedSpans,
      inlineSpans
    );

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
