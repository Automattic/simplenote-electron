import type { LexicalEditor } from 'lexical';
import {
  $createParagraphNode,
  $createTextNode,
  $findMatchingParent,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { $createCodeNode, $isCodeNode } from '@lexical/code-core';
import { $createLinkNode, $isLinkNode, $toggleLink } from '@lexical/link';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';

import { INSERT_TABLE_COMMAND } from '@lexical/table';

import { normalizeLinkHref, urlFromText } from './link-validator';
import {
  DEFAULT_INSERT_TABLE_PAYLOAD,
  DELETE_TABLE_COLUMN_COMMAND,
  DELETE_TABLE_ROW_COMMAND,
  INSERT_TABLE_COLUMN_AFTER_COMMAND,
  INSERT_TABLE_COLUMN_BEFORE_COMMAND,
  INSERT_TABLE_ROW_ABOVE_COMMAND,
  INSERT_TABLE_ROW_BELOW_COMMAND,
} from './table-controls';

export const dispatchFormatText = (
  editor: LexicalEditor,
  format: 'bold' | 'italic' | 'strikethrough' | 'code'
) => {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
};

const $getTopLevelBlock = () => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  return $findMatchingParent(selection.anchor.getNode(), (node) => {
    const parent = node.getParent();
    return parent !== null && parent.getType() === 'root';
  });
};

export const toggleHeading = (
  editor: LexicalEditor,
  level: 1 | 2 | 3 | 4
): void => {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const tag = `h${level}` as HeadingTagType;
    const block = $getTopLevelBlock();

    if (block && $isHeadingNode(block) && block.getTag() === tag) {
      const paragraph = $createParagraphNode();
      block.getChildren().forEach((child) => paragraph.append(child));
      block.replace(paragraph);
      paragraph.selectEnd();
      return;
    }

    const heading = $createHeadingNode(tag);

    if (block && $isElementNode(block)) {
      block.getChildren().forEach((child) => heading.append(child));
      block.replace(heading);
    } else {
      selection.insertNodes([heading]);
    }

    heading.selectEnd();
  });
};

export const toggleBlockquote = (editor: LexicalEditor): void => {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const block = $getTopLevelBlock();

    if (block && $isQuoteNode(block)) {
      const paragraph = $createParagraphNode();
      block.getChildren().forEach((child) => paragraph.append(child));
      block.replace(paragraph);
      paragraph.selectEnd();
      return;
    }

    const quote = $createQuoteNode();

    if (block && $isElementNode(block)) {
      block.getChildren().forEach((child) => quote.append(child));
      block.replace(quote);
    } else {
      selection.insertNodes([quote]);
    }

    quote.selectEnd();
  });
};

export const toggleCodeBlock = (editor: LexicalEditor): void => {
  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const block = $getTopLevelBlock();

    if (block && $isCodeNode(block)) {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(block.getTextContent()));
      block.replace(paragraph);
      paragraph.selectEnd();
      return;
    }

    const code = $createCodeNode();
    const textContent =
      block && $isElementNode(block)
        ? block.getTextContent()
        : selection.getTextContent();
    code.append($createTextNode(textContent));

    if (block && $isElementNode(block)) {
      block.replace(code);
    } else {
      selection.insertNodes([code]);
    }

    code.selectEnd();
  });
};

export const insertHorizontalRule = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
};

export const insertTable = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_TABLE_COMMAND, DEFAULT_INSERT_TABLE_PAYLOAD);
};

export const insertTableRowAbove = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_TABLE_ROW_ABOVE_COMMAND, undefined);
};

export const insertTableRowBelow = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_TABLE_ROW_BELOW_COMMAND, undefined);
};

export const deleteTableRow = (editor: LexicalEditor): void => {
  editor.dispatchCommand(DELETE_TABLE_ROW_COMMAND, undefined);
};

export const insertTableColumnBefore = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_TABLE_COLUMN_BEFORE_COMMAND, undefined);
};

export const insertTableColumnAfter = (editor: LexicalEditor): void => {
  editor.dispatchCommand(INSERT_TABLE_COLUMN_AFTER_COMMAND, undefined);
};

export const deleteTableColumn = (editor: LexicalEditor): void => {
  editor.dispatchCommand(DELETE_TABLE_COLUMN_COMMAND, undefined);
};

export const setLink = (editor: LexicalEditor, url: string): void => {
  editor.update(() => {
    if (url === '') {
      $toggleLink(null);
      return;
    }

    const href = normalizeLinkHref(url);

    if (!href) {
      return;
    }

    // With nothing selected $toggleLink has no nodes to wrap and does
    // nothing, so insert a link with the URL as its text instead (unless the
    // caret is in an existing link, where $toggleLink updates the URL in
    // place).
    const selection = $getSelection();
    if (
      $isRangeSelection(selection) &&
      selection.isCollapsed() &&
      !$findMatchingParent(selection.anchor.getNode(), $isLinkNode)
    ) {
      const linkNode = $createLinkNode(href);
      linkNode.append($createTextNode(href));
      selection.insertNodes([linkNode]);
      return;
    }

    $toggleLink(href);
  });
};

export const undo = (editor: LexicalEditor) => {
  editor.dispatchCommand(UNDO_COMMAND, undefined);
};

export const redo = (editor: LexicalEditor) => {
  editor.dispatchCommand(REDO_COMMAND, undefined);
};

export const getLinkHrefFromSelection = (editor: LexicalEditor) => {
  let href: string | undefined;

  editor.read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const link = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
    if (link) {
      href = link.getURL();
      return;
    }

    // When the selected text itself is a URL, offer it as the default.
    href = urlFromText(selection.getTextContent()) ?? undefined;
  });

  return href;
};
