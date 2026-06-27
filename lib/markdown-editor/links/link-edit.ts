import {
  $createTextNode,
  $findMatchingParent,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import { $isLinkNode, $toggleLink, type LinkNode } from '@lexical/link';

import { normalizeLinkHref } from './link-validator';

export function normalizeEditableLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('#') && trimmed.length > 1 && !/\s/.test(trimmed)) {
    return trimmed;
  }

  return normalizeLinkHref(trimmed);
}

export function $getLinkAtSelection(): LinkNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorLink = $findMatchingParent(
    selection.anchor.getNode(),
    $isLinkNode
  );
  const focusLink = $findMatchingParent(selection.focus.getNode(), $isLinkNode);

  if (!anchorLink || anchorLink !== focusLink) {
    return null;
  }

  return anchorLink;
}

export function $selectLinkNode(link: LinkNode): void {
  const firstChild = link.getFirstChild();
  const lastChild = link.getLastChild();

  if ($isTextNode(firstChild) && $isTextNode(lastChild)) {
    firstChild.select(0, lastChild.getTextContentSize());
    return;
  }

  link.selectStart();
}

export function $getLinkText(link: LinkNode): string {
  return link.getTextContent();
}

export function $updateLink(
  link: LinkNode,
  { text, url }: { text: string; url: string }
): boolean {
  const href = normalizeEditableLinkUrl(url);
  if (!href) {
    return false;
  }

  link.setURL(href);

  const children = link.getChildren();
  if (children.length === 1 && $isTextNode(children[0])) {
    const textNode = children[0];
    if (textNode.getTextContent() !== text) {
      textNode.setTextContent(text);
    }
  } else {
    link.clear();
    link.append($createTextNode(text));
  }

  return true;
}

export function $removeLink(link: LinkNode): void {
  $selectLinkNode(link);
  $toggleLink(null);
}
