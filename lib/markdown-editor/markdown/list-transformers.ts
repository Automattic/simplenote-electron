import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListNode,
  type ListItemNode,
  type ListType,
} from '@lexical/list';
import {
  CHECK_LIST,
  ORDERED_LIST,
  UNORDERED_LIST,
  type ElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import {
  $createEmptyLineParagraphNode,
  countEmptyLinePlaceholderLines,
} from '../nodes/empty-line-paragraph-node';
import {
  $createParagraphNode,
  $findMatchingParent,
  $getSelection,
  $hasUpdateTag,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  TextNode,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import { $exportMarkdownString } from './import-export';
import { $importInlineMarkdown } from './lexical-io';
import { $tagShortcutHistoryFromMarkdown } from '../extensions/markdown-history-tags';
import { $isSelectionInTable } from '../extensions/table-controls';

// GFM commonly uses 2-space list indents; 4 spaces still parse as depth 2.
const LIST_INDENT_SIZE = 2;

const ORDERED_LIST_REGEX = /^(\s*)(\d{1,})\.\s+(.*)$/;
const UNORDERED_LIST_REGEX = /^(\s*)[-*+]\s+(.*)$/;
const CHECK_LIST_REGEX = /^(\s*)[-*+]\s?\[(\s|x|X)?\]\s+(.*)$/;
const TASK_LIST_ITEM_MARKER_REGEX = /^\[\s?\]\s$/;

function $getListItemLeadingTextNode(listItem: ListItemNode): TextNode | null {
  for (const child of listItem.getChildren()) {
    if ($isListNode(child)) {
      continue;
    }
    if ($isTextNode(child)) {
      return child;
    }
    if ($isParagraphNode(child)) {
      const firstChild = child.getFirstChild();
      if ($isTextNode(firstChild)) {
        return firstChild;
      }
    }
  }
  return null;
}

// The whole text node must be exactly the marker ("[] " or "[ ] ") and the
// caret must sit at its end, i.e. the user just typed the trailing space. This
// mirrors what a markdown shortcut feels like without depending on the typed
// character, so it works the same when run inside a node transform.
function $matchesTaskListItemMarkerAtCaret(node: TextNode): boolean {
  const textContent = node.getTextContent();
  if (!TASK_LIST_ITEM_MARKER_REGEX.test(textContent)) {
    return false;
  }

  const selection = $getSelection();
  return (
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    selection.anchor.key === node.getKey() &&
    selection.anchor.offset === textContent.length
  );
}

function $getTaskListConversionContext(
  anchorNode: TextNode
): { listItem: ListItemNode; listNode: ListNode } | null {
  const listItem = $findMatchingParent(anchorNode, $isListItemNode);
  if (!listItem) {
    return null;
  }

  const listNode = listItem.getParent();
  if (!$isListNode(listNode)) {
    return null;
  }

  const listType = listNode.getListType();
  if (listType !== 'bullet' && listType !== 'number') {
    return null;
  }

  const leadingTextNode = $getListItemLeadingTextNode(listItem);
  if (
    leadingTextNode === null ||
    leadingTextNode.getKey() !== anchorNode.getKey()
  ) {
    return null;
  }

  return { listItem, listNode };
}

function $tryConvertListItemToTaskList(node: TextNode): boolean {
  const context = $getTaskListConversionContext(node);
  if (!context || !$matchesTaskListItemMarkerAtCaret(node)) {
    return false;
  }

  const { listItem, listNode } = context;

  listNode.setListType('check');

  for (const item of listNode.getChildren()) {
    if ($isListItemNode(item)) {
      item.setChecked(false);
    }
  }

  node.setTextContent('');
  listItem.selectStart();
  return true;
}

function isCollaborationOrHistoricUpdate(): boolean {
  return $hasUpdateTag(COLLABORATION_TAG) || $hasUpdateTag(HISTORIC_TAG);
}

// Typing "[] " / "[ ] " at the start of a bullet/ordered list item turns the
// whole list into a checklist. `@lexical/markdown` has no transformer for this
// (it only matches markers at paragraph start), so we react to the marker text
// node directly.
export function registerTaskListItemShortcuts(
  editor: LexicalEditor
): () => void {
  return editor.registerNodeTransform(TextNode, (node) => {
    if (editor.isComposing() || isCollaborationOrHistoricUpdate()) {
      return;
    }

    if (!$matchesTaskListItemMarkerAtCaret(node)) {
      return;
    }

    if ($isSelectionInTable()) {
      return;
    }

    if ($tryConvertListItemToTaskList(node)) {
      const markdownBefore = $exportMarkdownString();
      $tagShortcutHistoryFromMarkdown(markdownBefore, editor);
    }
  });
}

function importListItemText(
  listItem: ReturnType<typeof $createListItemNode>,
  text: string,
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  if (text.length === 0) {
    return;
  }

  const container = $createParagraphNode();
  $importInlineMarkdown(text, container, inlineTransformers);

  for (const block of container.getChildren()) {
    if ($isParagraphNode(block)) {
      listItem.append(block);
    }
  }
}

type ParsedListLine = {
  checked?: boolean;
  indent: number;
  listType: ListType;
  text: string;
};

type ListTreeNode = {
  checked?: boolean;
  children: ListTreeNode[];
  listType: ListType;
  text: string;
};

function getIndent(whitespaces: string): number {
  const tabs = whitespaces.match(/\t/g);
  const spaces = whitespaces.match(/ /g);

  let indent = 0;

  if (tabs) {
    indent += tabs.length;
  }

  if (spaces) {
    indent += Math.floor(spaces.length / LIST_INDENT_SIZE);
  }

  return indent;
}

function parseListLine(line: string): ParsedListLine | null {
  const checkMatch = line.match(CHECK_LIST_REGEX);
  if (checkMatch) {
    return {
      checked: checkMatch[2]?.toLowerCase() === 'x',
      indent: getIndent(checkMatch[1]),
      listType: 'check',
      text: checkMatch[3],
    };
  }

  const orderedMatch = line.match(ORDERED_LIST_REGEX);
  if (orderedMatch) {
    return {
      indent: getIndent(orderedMatch[1]),
      listType: 'number',
      text: orderedMatch[3],
    };
  }

  const unorderedMatch = line.match(UNORDERED_LIST_REGEX);
  if (unorderedMatch) {
    return {
      indent: getIndent(unorderedMatch[1]),
      listType: 'bullet',
      text: unorderedMatch[2],
    };
  }

  return null;
}

function buildListTree(lines: ParsedListLine[]): ListTreeNode[] {
  const roots: ListTreeNode[] = [];
  const stack: Array<{ indent: number; node: ListTreeNode }> = [];

  for (const line of lines) {
    const node: ListTreeNode = {
      checked: line.checked,
      children: [],
      listType: line.listType,
      text: line.text,
    };

    while (stack.length > 0 && stack[stack.length - 1].indent >= line.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ indent: line.indent, node });
  }

  return roots;
}

function groupListBlocks(
  markdown: string
): Array<
  { kind: 'list'; lines: ParsedListLine[] } | { kind: 'markdown'; text: string }
> {
  const blocks: Array<
    | { kind: 'list'; lines: ParsedListLine[] }
    | { kind: 'markdown'; text: string }
  > = [];
  const markdownLines: string[] = [];
  let listLines: ParsedListLine[] | null = null;

  const flushMarkdown = () => {
    if (markdownLines.length > 0) {
      blocks.push({ kind: 'markdown', text: markdownLines.join('\n') });
      markdownLines.length = 0;
    }
  };

  const flushList = () => {
    if (listLines && listLines.length > 0) {
      blocks.push({ kind: 'list', lines: listLines });
      listLines = null;
    }
  };

  for (const line of markdown.split('\n')) {
    const parsed = parseListLine(line);
    if (parsed) {
      flushMarkdown();
      if (!listLines) {
        listLines = [];
      }
      listLines.push(parsed);
      continue;
    }

    flushList();
    markdownLines.push(line);
  }

  flushList();
  flushMarkdown();
  return blocks;
}

function appendNestedLevel(
  parentList: ListNode,
  nodes: ListTreeNode[],
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  if (nodes.length === 0) {
    return;
  }

  const nodesByType = new Map<ListType, ListTreeNode[]>();
  for (const node of nodes) {
    const bucket = nodesByType.get(node.listType) ?? [];
    bucket.push(node);
    nodesByType.set(node.listType, bucket);
  }

  for (const [listType, typedNodes] of nodesByType) {
    const wrapperItem = $createListItemNode();
    const nestedList = $createListNode(listType);
    appendTreeItems(nestedList, typedNodes, inlineTransformers);
    wrapperItem.append(nestedList);
    parentList.append(wrapperItem);
  }
}

function appendTreeItems(
  list: ListNode,
  nodes: ListTreeNode[],
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  for (const node of nodes) {
    const listItem = $createListItemNode(node.checked);
    if (node.text.length > 0) {
      importListItemText(listItem, node.text, inlineTransformers);
    }
    list.append(listItem);

    if (node.children.length > 0) {
      appendNestedLevel(list, node.children, inlineTransformers);
    }
  }
}

function appendTreeToList(
  list: ListNode,
  nodes: ListTreeNode[],
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  appendTreeItems(list, nodes, inlineTransformers);
}

function importListBlock(
  lines: ParsedListLine[],
  root: ElementNode,
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  const tree = buildListTree(lines);
  const rootTypes = new Set(tree.map((node) => node.listType));

  for (const listType of rootTypes) {
    const nodes = tree.filter((node) => node.listType === listType);
    const list = $createListNode(listType);
    appendTreeToList(list, nodes, inlineTransformers);
    root.append(list);
  }
}

export function importMixedNestedListMarkdown(
  markdown: string,
  root: ElementNode,
  importMarkdownChunk: (chunk: string, node: ElementNode) => void,
  inlineTransformers: Array<TextFormatTransformer | TextMatchTransformer>
): void {
  const blocks = groupListBlocks(markdown);
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.kind === 'list') {
      importListBlock(block.lines, root, inlineTransformers);
      continue;
    }

    if (block.text.length > 0) {
      const previousBlock = blocks[index - 1];
      const nextBlock = blocks[index + 1];
      if (previousBlock?.kind === 'list' && nextBlock?.kind === 'list') {
        const emptyLineCount = countEmptyLinePlaceholderLines(block.text);
        if (emptyLineCount > 0) {
          for (let j = 0; j < emptyLineCount; j++) {
            root.append($createEmptyLineParagraphNode());
          }
          continue;
        }

        if (/^\s*$/.test(block.text) && !/[\u00A0]|&nbsp;/i.test(block.text)) {
          const emptyCount = (block.text.match(/\n/g) || []).length;
          for (let j = 0; j < emptyCount; j++) {
            root.append($createParagraphNode());
          }
          continue;
        }
      }

      importMarkdownChunk(block.text, root);
      continue;
    }

    // A blank line between two list blocks must become an empty paragraph so
    // adjacent lists do not merge. Trailing newlines (e.g. "- item\n" from the
    // clipboard) also produce an empty markdown block but must stay skipped.
    const previousBlock = blocks[index - 1];
    const nextBlock = blocks[index + 1];
    if (previousBlock?.kind === 'list' && nextBlock?.kind === 'list') {
      continue;
    }
  }
}

function defaultListReplace(listType: ListType): ElementTransformer['replace'] {
  const transformer =
    listType === 'check'
      ? CHECK_LIST
      : listType === 'number'
        ? ORDERED_LIST
        : UNORDERED_LIST;
  return transformer.replace;
}

function withMixedListImport(
  base: ElementTransformer,
  listType: ListType
): ElementTransformer {
  return {
    ...base,
    replace: (parentNode, children, match, isImport) => {
      if (isImport) {
        return false;
      }

      return defaultListReplace(listType)(
        parentNode,
        children,
        match as RegExpMatchArray,
        isImport
      );
    },
  };
}

export const MIXED_NESTED_CHECK_LIST = withMixedListImport(CHECK_LIST, 'check');
export const MIXED_NESTED_UNORDERED_LIST = withMixedListImport(
  UNORDERED_LIST,
  'bullet'
);
export const MIXED_NESTED_ORDERED_LIST = withMixedListImport(
  ORDERED_LIST,
  'number'
);

export function withMixedNestedListTransformers(
  transformers: Array<Transformer>
): Array<Transformer> {
  return transformers.map((transformer) => {
    if (transformer === CHECK_LIST) {
      return MIXED_NESTED_CHECK_LIST;
    }
    if (transformer === UNORDERED_LIST) {
      return MIXED_NESTED_UNORDERED_LIST;
    }
    if (transformer === ORDERED_LIST) {
      return MIXED_NESTED_ORDERED_LIST;
    }
    return transformer;
  });
}

export function describeListTree(rootChildren: LexicalNode[]): string {
  const lines: string[] = [];

  function walk(node: LexicalNode, depth: number) {
    if ($isListNode(node)) {
      lines.push(`${'  '.repeat(depth)}${node.getListType()}`);
      for (const child of node.getChildren()) {
        walk(child, depth + 1);
      }
      return;
    }

    if ($isListItemNode(node)) {
      const directText = node
        .getChildren()
        .filter((child) => !$isListNode(child))
        .map((child) => child.getTextContent())
        .join('');
      lines.push(`${'  '.repeat(depth)}item: ${JSON.stringify(directText)}`);
      for (const child of node.getChildren()) {
        if ($isListNode(child)) {
          walk(child, depth + 1);
        }
      }
    }
  }

  for (const child of rootChildren) {
    walk(child, 0);
  }

  return lines.join('\n');
}
