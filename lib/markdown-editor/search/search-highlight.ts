import { createDOMRange } from '@lexical/selection';
import {
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import {
  findTextMatchRanges,
  getSearchTerms,
  type TextMatchRange,
} from '../../search/in-note-search';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

const DOUBLE_LINE_BREAK = '\n\n';

export const SEARCH_MATCH_HIGHLIGHT = 'search-decoration';
export const SEARCH_SELECTED_HIGHLIGHT = 'selected-search';

type TextSegment = {
  end: number;
  node: TextNode;
  start: number;
};

type TextPoint = {
  node: TextNode;
  offset: number;
};

export function $collectTextSegments(): {
  segments: TextSegment[];
  text: string;
} {
  const segments: TextSegment[] = [];
  let text = '';

  const appendTextNode = (node: TextNode) => {
    const content = node.getTextContent();
    if (0 === content.length) {
      return;
    }

    segments.push({
      node,
      start: text.length,
      end: text.length + content.length,
    });
    text += content;
  };

  const walk = (node: LexicalNode) => {
    if ($isTextNode(node)) {
      appendTextNode(node);
      return;
    }

    if (!$isElementNode(node)) {
      return;
    }

    const children = node.getChildren();
    for (let index = 0; index < children.length; index++) {
      walk(children[index]);

      if (
        $isElementNode(children[index]) &&
        index !== children.length - 1 &&
        !children[index].isInline()
      ) {
        text += DOUBLE_LINE_BREAK;
      }
    }
  };

  const isEmptyRootParagraph = (node: LexicalNode) =>
    $isParagraphNode(node) &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === '';

  let needsBlockGap = false;
  for (const child of $getRoot().getChildren()) {
    if ($isTransientParagraphNode(child)) {
      continue;
    }

    if (isEmptyRootParagraph(child)) {
      text += DOUBLE_LINE_BREAK;
      needsBlockGap = false;
      continue;
    }

    if (needsBlockGap) {
      text += DOUBLE_LINE_BREAK;
    }

    walk(child);
    needsBlockGap = true;
  }

  return { segments, text };
}

function $getTextPointAtOffset(
  segments: TextSegment[],
  offset: number
): TextPoint | null {
  for (const segment of segments) {
    if (offset >= segment.start && offset <= segment.end) {
      return {
        node: segment.node,
        offset: offset - segment.start,
      };
    }
  }

  return null;
}

export function $getTextMatchRanges(searchQuery: string): TextMatchRange[] {
  const terms = getSearchTerms(searchQuery);
  if (0 === terms.length) {
    return [];
  }

  const { text } = $collectTextSegments();
  return findTextMatchRanges(text, terms);
}

export function $createDOMRangeForTextMatch(
  editor: LexicalEditor,
  segments: TextSegment[],
  match: TextMatchRange
): Range | null {
  if (0 === match.end - match.start) {
    return null;
  }

  const anchor = $getTextPointAtOffset(segments, match.start);
  const focus = $getTextPointAtOffset(segments, match.end);

  if (!anchor || !focus) {
    return null;
  }

  return createDOMRange(
    editor,
    anchor.node,
    anchor.offset,
    focus.node,
    focus.offset
  );
}

export function scrollRangeIntoView(
  scrollContainer: HTMLElement,
  range: Range
): void {
  const rangeRect = range.getBoundingClientRect();
  if (0 === rangeRect.height && 0 === rangeRect.width) {
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const targetTop =
    rangeRect.top -
    containerRect.top +
    scrollContainer.scrollTop -
    scrollContainer.clientHeight / 2 +
    rangeRect.height / 2;

  scrollContainer.scrollTop = Math.max(0, targetTop);
}

export function supportsCssHighlights(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  );
}

export function applySearchHighlights(
  matchRanges: Range[],
  selectedRange: Range | null
): void {
  if (!supportsCssHighlights()) {
    return;
  }

  if (0 === matchRanges.length && !selectedRange) {
    CSS.highlights.delete(SEARCH_MATCH_HIGHLIGHT);
    CSS.highlights.delete(SEARCH_SELECTED_HIGHLIGHT);
    return;
  }

  if (matchRanges.length > 0) {
    CSS.highlights.set(SEARCH_MATCH_HIGHLIGHT, new Highlight(...matchRanges));
  } else {
    CSS.highlights.delete(SEARCH_MATCH_HIGHLIGHT);
  }

  if (selectedRange) {
    CSS.highlights.set(SEARCH_SELECTED_HIGHLIGHT, new Highlight(selectedRange));
  } else {
    CSS.highlights.delete(SEARCH_SELECTED_HIGHLIGHT);
  }
}

export function clearSearchHighlights(): void {
  if (!supportsCssHighlights()) {
    return;
  }

  CSS.highlights.delete(SEARCH_MATCH_HIGHLIGHT);
  CSS.highlights.delete(SEARCH_SELECTED_HIGHLIGHT);
}
