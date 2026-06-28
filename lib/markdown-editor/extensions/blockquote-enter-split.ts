import { $findMatchingParent } from '@lexical/utils';
import {
  $createQuoteNode,
  $isQuoteNode,
  type QuoteNode,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  INSERT_PARAGRAPH_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';

function $isAtEndOfTextSegment(selection: RangeSelection): boolean {
  const anchor = selection.anchor.getNode();
  return (
    $isTextNode(anchor) &&
    selection.anchor.offset === anchor.getTextContentSize()
  );
}

function $hasQuoteContentAfterAnchor(
  quote: QuoteNode,
  anchorNode: LexicalNode
): boolean {
  if (!$isTextNode(anchorNode) || anchorNode.getParent() !== quote) {
    return false;
  }

  for (
    let sibling = anchorNode.getNextSibling();
    sibling !== null;
    sibling = sibling.getNextSibling()
  ) {
    if ($isLineBreakNode(sibling)) {
      continue;
    }
    if (sibling.getTextContent().length > 0) {
      return true;
    }
  }

  return false;
}

function $splitQuoteAtLineEnd(selection: RangeSelection): boolean {
  if (!selection.isCollapsed() || !$isAtEndOfTextSegment(selection)) {
    return false;
  }

  const anchorNode = selection.anchor.getNode();
  const quote = $findMatchingParent(anchorNode, $isQuoteNode);
  if (quote === null || !$hasQuoteContentAfterAnchor(quote, anchorNode)) {
    return false;
  }

  const trailingNodes: LexicalNode[] = [];
  for (
    let sibling = anchorNode.getNextSibling();
    sibling !== null;
    sibling = sibling.getNextSibling()
  ) {
    trailingNodes.push(sibling);
  }

  for (const node of trailingNodes) {
    node.remove();
  }

  while (trailingNodes.length > 0 && $isLineBreakNode(trailingNodes[0]!)) {
    trailingNodes.shift();
  }

  if (trailingNodes.length === 0) {
    return false;
  }

  const emptyParagraph = $createParagraphNode();
  const trailingQuote = $createQuoteNode();
  trailingQuote.append(...trailingNodes);

  quote.insertAfter(emptyParagraph);
  emptyParagraph.insertAfter(trailingQuote);
  emptyParagraph.selectStart();

  return true;
}

export function registerBlockquoteEnterSplit(
  editor: LexicalEditor
): () => void {
  return editor.registerCommand(
    INSERT_PARAGRAPH_COMMAND,
    () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }
      return $splitQuoteAtLineEnd(selection);
    },
    COMMAND_PRIORITY_HIGH
  );
}
