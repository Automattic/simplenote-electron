import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from '@lexical/markdown';
import { $createRangeSelection, type ElementNode } from 'lexical';

export function $importInlineMarkdown(
  markdown: string,
  node: ElementNode,
  transformers: Array<Transformer>
): void {
  $convertFromMarkdownString(markdown, transformers, node);
}

export function $exportInlineMarkdown(
  node: ElementNode,
  transformers: Array<Transformer>
): string {
  return $convertToMarkdownString(transformers, node);
}

export function $exportElementMarkdown(
  node: ElementNode,
  transformers: Array<Transformer>
): string {
  const selection = $createRangeSelection();
  selection.anchor.set(node.getKey(), 0, 'element');
  selection.focus.set(node.getKey(), node.getChildrenSize(), 'element');

  return $convertSelectionToMarkdownString(transformers, selection).replace(
    /^\n+/,
    ''
  );
}
