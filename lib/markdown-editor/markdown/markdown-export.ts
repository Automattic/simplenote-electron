import { $convertSelectionToMarkdownString } from '@lexical/markdown';
import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isListNode, type ListNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode } from '@lexical/table';
import {
  $createRangeSelection,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

import { $exportTableNodeMarkdown } from './gfm-transformers';
import {
  $exportElementInlineMarkdown,
  type InlineMarkdownExportOptions,
} from './gfm-inline-export';
import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
} from './list-transformers';
import { $exportTableMarkdown } from './table-export-cache';
import { isEmptyRootParagraph, separatorBetweenRootBlocks } from './block-gaps';
import { MARKDOWN_TRANSFORMERS } from './transformers';
import type { MarkdownExportContext } from './block-export-cache';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

function exportListNodeContent(node: ElementNode): string {
  if ($isListNode(node)) {
    return exportListNode(node);
  }
  return $exportElementInlineMarkdown(node);
}

function exportListNode(node: ListNode): string {
  const listType = node.getListType();
  const transformer =
    listType === 'check'
      ? MIXED_NESTED_CHECK_LIST
      : listType === 'number'
        ? MIXED_NESTED_ORDERED_LIST
        : MIXED_NESTED_UNORDERED_LIST;

  if (!transformer.export) {
    return '';
  }

  return transformer.export(node, exportListNodeContent, undefined) ?? '';
}

export function getContentRootBlocks(): LexicalNode[] {
  return $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
}

export function getStoredContentRootBlocks(): LexicalNode[] {
  return getContentRootBlocks().filter((child) => !isEmptyRootParagraph(child));
}

/** Full stored markdown for the current document (no incremental cache). */
export function $assembleStoredMarkdown(): string {
  let output = '';
  let previousBlock: LexicalNode | null = null;

  for (const child of getStoredContentRootBlocks()) {
    const markdown = $exportStoredTopLevelBlockMarkdown(child);
    if (markdown.length === 0) {
      continue;
    }

    if (output.length > 0 && previousBlock !== null) {
      output += separatorBetweenRootBlocks(previousBlock, child);
    }

    previousBlock = child;
    output += markdown;
  }

  return output;
}

export type TopLevelMarkdownExportOptions = InlineMarkdownExportOptions & {
  markdownExportContext?: MarkdownExportContext;
};

export function exportStoredTopLevelNode(
  node: LexicalNode,
  options?: TopLevelMarkdownExportOptions
): string {
  if ($isHorizontalRuleNode(node)) {
    return '---';
  }

  if (!$isElementNode(node)) {
    return node.getTextContent();
  }

  if ($isListNode(node)) {
    return exportListNode(node).replace(/^\n+/, '');
  }

  if ($isTableNode(node)) {
    const markdown =
      options?.markdownExportContext === undefined
        ? $exportTableNodeMarkdown(node)
        : $exportTableMarkdown(node, options.markdownExportContext);
    return markdown.replace(/^\n+/, '');
  }

  if ($isParagraphNode(node)) {
    return $exportElementInlineMarkdown(node, {
      reimportLineBreaks: options?.reimportLineBreaks,
    });
  }

  if ($isQuoteNode(node)) {
    const selection = $createRangeSelection();
    const key = node.getKey();
    selection.anchor.set(key, 0, 'element');
    selection.focus.set(key, node.getChildrenSize(), 'element');

    return $convertSelectionToMarkdownString(
      MARKDOWN_TRANSFORMERS,
      selection
    ).replace(/^\n+/, '');
  }

  const selection = $createRangeSelection();
  const key = node.getKey();
  selection.anchor.set(key, 0, 'element');
  selection.focus.set(key, node.getChildrenSize(), 'element');

  return $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');
}

/** Stored markdown for one root-level block (save, selection coordinates). */
export function $exportStoredTopLevelBlockMarkdown(node: LexicalNode): string {
  return exportStoredTopLevelNode(node, { reimportLineBreaks: false });
}

/** Markdown for re-parsing, shortcut history, and block reimport. */
export function $exportTopLevelBlockMarkdown(node: LexicalNode): string {
  return exportStoredTopLevelNode(node, { reimportLineBreaks: true });
}
