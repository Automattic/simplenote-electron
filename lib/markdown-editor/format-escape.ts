import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type RangeSelection,
  type TextFormatType,
  type TextNode,
} from 'lexical';
import { $isLinkNode } from '@lexical/link';
import { mergeRegister } from '@lexical/utils';

const ESCAPABLE_FORMATS: TextFormatType[] = [
  'bold',
  'italic',
  'strikethrough',
  'highlight',
  'code',
];

type Direction = 'start' | 'end';

/**
 * Returns the containing link when the caret sits at the trailing edge of
 * the link's last text node.
 */
function $linkAtTrailingEdge(
  node: TextNode,
  offset: number
): ElementNode | null {
  if (offset !== node.getTextContentSize() || node.getNextSibling() !== null) {
    return null;
  }

  const parent = node.getParent();
  return $isLinkNode(parent) ? parent : null;
}

/**
 * Whether the collapsed selection sits at the link's trailing edge or
 * immediately after the link. Both positions render the caret at the same
 * spot: the browser and Lexical's selection normalization move freely
 * between them, so an escape has to remain valid across both.
 */
function $isAtLinkBoundary(
  selection: RangeSelection,
  link: ElementNode
): boolean {
  if (!selection.isCollapsed()) {
    return false;
  }

  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();

  if (anchor.type === 'text' && $isTextNode(anchorNode)) {
    if ($linkAtTrailingEdge(anchorNode, anchor.offset) === link) {
      return true;
    }
    // Start of the text node directly after the link.
    return anchor.offset === 0 && anchorNode.getPreviousSibling() === link;
  }

  return (
    anchorNode === link.getParent() &&
    anchor.offset === link.getIndexWithinParent() + 1
  );
}

/**
 * Moves the caret just outside the link, after it. This is what updates the
 * toolbar state; actually keeping typed text out of the link is handled by
 * the escaped-link marker, because the caret can be normalized back into the
 * link's text node before the next keystroke.
 */
function $escapeLink(link: ElementNode): void {
  const next = link.getNextSibling();

  const selection = $isTextNode(next)
    ? next.select(0, 0)
    : (() => {
        const index = link.getIndexWithinParent() + 1;
        return link.getParentOrThrow().select(index, index);
      })();

  selection.format = 0;
  selection.style = '';
}

/**
 * Trailing edge escape for text formats and links.
 *
 * Formats: pressing ArrowLeft/ArrowRight at the edge of formatted text clears
 * that format from the selection without moving the caret, so typing
 * continues unformatted. A second press finds nothing left to escape and
 * moves the caret normally.
 *
 * The rich-text `escapeFormatTriggers` arrow option is not enough: it toggles
 * the selection format but lets the native caret movement proceed, and the
 * resulting selection change recomputes the format from the new position —
 * so it only has a visible effect where the caret cannot move (end of the
 * document). Consuming the event at the boundary is what actually keeps the
 * caret in place.
 *
 * Links: Lexical's default is the opposite of formats — typing at a link's
 * trailing edge lands *outside* the link (LinkNode.canInsertTextAfter returns
 * false, which routes typing through the controlled insertion path and pushes
 * it past the link). We invert that so typing continues the link text, and
 * ArrowRight at the edge escapes the link: the caret moves just outside it
 * and an escape marker keeps typed text out of the link even when selection
 * normalization pulls the caret back into the link's text node.
 */
export function registerFormatEscape(editor: LexicalEditor): () => void {
  // Key of the link the user escaped from while the caret is still at its
  // boundary. Cleared as soon as the selection moves anywhere else.
  let escapedLinkKey: string | null = null;

  const escapeAtBoundary = (direction: Direction) => (event: KeyboardEvent) => {
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
      return false;
    }

    const selection = $getSelection();
    if (
      !$isRangeSelection(selection) ||
      !selection.isCollapsed() ||
      selection.anchor.type !== 'text'
    ) {
      return false;
    }

    const node = selection.anchor.getNode();
    if (!$isTextNode(node)) {
      return false;
    }

    const offset = selection.anchor.offset;

    if (direction === 'end') {
      const link = $linkAtTrailingEdge(node, offset);
      if (link) {
        if (escapedLinkKey === link.getKey()) {
          // Already escaped; let the caret move on.
          return false;
        }
        escapedLinkKey = link.getKey();
        $escapeLink(link);
        event.preventDefault();
        return true;
      }
    }

    const atBoundary =
      direction === 'end'
        ? offset === node.getTextContentSize() && node.getNextSibling() === null
        : offset === 0 && node.getPreviousSibling() === null;
    if (!atBoundary) {
      return false;
    }

    let escaped = false;
    for (const format of ESCAPABLE_FORMATS) {
      if (node.hasFormat(format) && selection.hasFormat(format)) {
        selection.toggleFormat(format);
        escaped = true;
      }
    }

    if (!escaped) {
      return false;
    }

    selection.setStyle('');
    event.preventDefault();
    return true;
  };

  const extendLinkOnType = (payload: InputEvent | string) => {
    if (typeof payload !== 'string') {
      return false;
    }

    const selection = $getSelection();
    if (
      !$isRangeSelection(selection) ||
      !selection.isCollapsed() ||
      selection.anchor.type !== 'text'
    ) {
      return false;
    }

    const node = selection.anchor.getNode();
    if (!$isTextNode(node)) {
      return false;
    }

    const offset = selection.anchor.offset;
    const link = $linkAtTrailingEdge(node, offset);
    if (!link || escapedLinkKey === link.getKey()) {
      // Escaped: the default insertion path keeps the text outside the link.
      return false;
    }

    node.spliceText(offset, 0, payload, true);
    return true;
  };

  const clearStaleEscape = editor.registerUpdateListener(({ editorState }) => {
    if (escapedLinkKey === null) {
      return;
    }
    const key = escapedLinkKey;
    const stillAtBoundary = editorState.read(() => {
      const link = $getNodeByKey(key);
      const selection = $getSelection();
      return (
        $isLinkNode(link) &&
        $isRangeSelection(selection) &&
        $isAtLinkBoundary(selection, link)
      );
    });
    if (!stillAtBoundary) {
      escapedLinkKey = null;
    }
  });

  return mergeRegister(
    clearStaleEscape,
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      escapeAtBoundary('end'),
      COMMAND_PRIORITY_LOW
    ),
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      escapeAtBoundary('start'),
      COMMAND_PRIORITY_LOW
    ),
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      extendLinkOnType,
      COMMAND_PRIORITY_LOW
    )
  );
}
