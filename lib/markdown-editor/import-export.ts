import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $setSelection,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

import { importMixedNestedListMarkdown } from './list-transformers';
import {
  INLINE_MARKDOWN_TRANSFORMERS,
  MARKDOWN_TRANSFORMERS,
} from './transformers';

// Import with Lexical's default merge/strip behavior, then re-insert empty
// paragraphs that standard \n\n export cannot distinguish from block breaks.
function extraEmptyParagraphsInGap(gap: string): number {
  const newlineCount = (gap.match(/\n/g) || []).length;
  // \n\n is a standard block delimiter (0 empty paragraphs). Each additional
  // newline beyond that encodes one intentional empty paragraph in export.
  return newlineCount >= 3 ? newlineCount - 1 : 0;
}

type ImportChunkPart =
  | { kind: 'gap'; text: string }
  | { kind: 'markdown'; text: string };

function $tryFenceStart(
  chunk: string,
  index: number
): { headerLength: number; marker: '```' | '~~~' } | null {
  if (index > 0 && chunk[index - 1] !== '\n') {
    return null;
  }

  const match = chunk.slice(index).match(/^(```|~~~)([^\n]*)\n/);
  if (match === null) {
    return null;
  }

  return {
    headerLength: match[0].length,
    marker: match[1] as '```' | '~~~',
  };
}

function $findFencedCodeBlockEnd(
  chunk: string,
  contentStart: number,
  marker: '```' | '~~~'
): number | null {
  const endFenceRegex = new RegExp(`\\n${marker}\\s*(?:\\n|$)`);
  const match = endFenceRegex.exec(chunk.slice(contentStart));
  if (match === null) {
    return null;
  }

  return contentStart + match.index + match[0].length;
}

function $splitImportChunkParts(chunk: string): ImportChunkPart[] {
  const parts: ImportChunkPart[] = [];
  let index = 0;

  while (index < chunk.length) {
    const fenceStart = $tryFenceStart(chunk, index);
    if (fenceStart !== null) {
      const contentStart = index + fenceStart.headerLength;
      const blockEnd =
        $findFencedCodeBlockEnd(chunk, contentStart, fenceStart.marker) ??
        chunk.length;
      parts.push({ kind: 'markdown', text: chunk.slice(index, blockEnd) });
      index = blockEnd;
      continue;
    }

    const gapMatch = chunk.slice(index).match(/^\n{2,}/);
    if (gapMatch !== null) {
      parts.push({ kind: 'gap', text: gapMatch[0] });
      index += gapMatch[0].length;
      continue;
    }

    let nextIndex = chunk.length;
    const gapIndex = chunk.slice(index).search(/\n{2,}/);
    if (gapIndex > 0) {
      nextIndex = index + gapIndex;
    }

    const fenceMatch = chunk.slice(index).match(/\n(```|~~~)[^\n]*\n/);
    if (fenceMatch?.index !== undefined) {
      nextIndex = Math.min(nextIndex, index + fenceMatch.index + 1);
    }

    parts.push({ kind: 'markdown', text: chunk.slice(index, nextIndex) });
    index = nextIndex;
  }

  return parts;
}

function importMarkdownSegment(segment: string, target: ElementNode): void {
  const container = $createParagraphNode();
  target.append(container);
  $convertFromMarkdownString(segment, MARKDOWN_TRANSFORMERS, container);
  if (container.getParent() === null) {
    return;
  }
  if (container.getNextSibling() === null) {
    const children = container.getChildren();
    container.remove();
    target.append(...children);
  } else {
    for (const child of container.getChildren()) {
      container.insertBefore(child);
    }
    container.remove();
  }
}

export function $exportMarkdownString(): string {
  return $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
}

// $convertFromMarkdownString clears its target node, so each chunk is
// imported into a temporary container first, then the resulting blocks
// are hoisted out. Leaving blocks nested inside the container paragraph
// breaks element-level markdown shortcuts (they require blocks to be
// direct children of the root) and corrupts markdown export.
function $importChunk(chunk: string, target: ElementNode): void {
  if (/^\s*$/.test(chunk)) {
    const lineCount = chunk.length === 0 ? 1 : chunk.split('\n').length;
    for (let i = 0; i < lineCount; i++) {
      target.append($createParagraphNode());
    }
    return;
  }

  if (!chunk.includes('\n\n')) {
    importMarkdownSegment(chunk, target);
    return;
  }

  const parts = $splitImportChunkParts(chunk);
  for (const part of parts) {
    if (part.kind === 'markdown') {
      if (part.text.length > 0) {
        importMarkdownSegment(part.text, target);
      }
      continue;
    }

    for (let j = 0; j < extraEmptyParagraphsInGap(part.text); j++) {
      target.append($createParagraphNode());
    }
  }
}

export function $importMarkdownString(markdown: string): void {
  const root = $getRoot();
  root.clear();
  importMixedNestedListMarkdown(
    markdown,
    root,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
}

/**
 * Parses a markdown string into block nodes without touching the document,
 * e.g. for inserting pasted markdown at the current selection.
 */
export function $markdownToNodes(markdown: string): LexicalNode[] {
  // $convertFromMarkdownString moves the selection to the start of its
  // target node, so preserve the caller's selection across the conversion.
  const previousSelection = $getSelection()?.clone() ?? null;

  const holder = $createParagraphNode();
  importMixedNestedListMarkdown(
    markdown,
    holder,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
  const children = holder.getChildren();
  for (const child of children) {
    child.remove();
  }

  $setSelection(previousSelection);
  return children;
}
