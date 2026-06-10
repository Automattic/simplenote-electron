import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListNode,
  type ListType,
} from '@lexical/list';
import {
  CHECK_LIST,
  ORDERED_LIST,
  UNORDERED_LIST,
  type ElementTransformer,
  type Transformer,
} from '@lexical/markdown';
import { $createTextNode, type ElementNode, type LexicalNode } from 'lexical';

// GFM commonly uses 2-space list indents; 4 spaces still parse as depth 2.
const LIST_INDENT_SIZE = 2;

const ORDERED_LIST_REGEX = /^(\s*)(\d{1,})\.\s+(.*)$/;
const UNORDERED_LIST_REGEX = /^(\s*)[-*+]\s+(.*)$/;
const CHECK_LIST_REGEX = /^(\s*)[-*+]\s?\[(\s|x|X)?\]\s+(.*)$/;

// Mirrors @lexical/markdown importTextTransformers escape handling so list
// item text round-trips with exportTextFormat (which escapes \ * _ ` ~).
const MARKDOWN_ESCAPE_IN_TEXT = /\\[!-/:-@[-`{-~]|&#\d+;/;

function unescapeMarkdownText(value: string): string {
  return value
    .replace(/\\([!-/:-@[-`{-~])/g, '$1')
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number(codePoint))
    );
}

function importListItemText(
  listItem: ReturnType<typeof $createListItemNode>,
  text: string
): void {
  const content = MARKDOWN_ESCAPE_IN_TEXT.test(text)
    ? unescapeMarkdownText(text)
    : text;
  if (content.length > 0) {
    listItem.append($createTextNode(content));
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

function appendNestedLevel(parentList: ListNode, nodes: ListTreeNode[]): void {
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
    appendTreeItems(nestedList, typedNodes);
    wrapperItem.append(nestedList);
    parentList.append(wrapperItem);
  }
}

function appendTreeItems(list: ListNode, nodes: ListTreeNode[]): void {
  for (const node of nodes) {
    const listItem = $createListItemNode(node.checked);
    if (node.text.length > 0) {
      importListItemText(listItem, node.text);
    }
    list.append(listItem);

    if (node.children.length > 0) {
      appendNestedLevel(list, node.children);
    }
  }
}

function appendTreeToList(list: ListNode, nodes: ListTreeNode[]): void {
  appendTreeItems(list, nodes);
}

function importListBlock(lines: ParsedListLine[], root: ElementNode): void {
  const tree = buildListTree(lines);
  const rootTypes = new Set(tree.map((node) => node.listType));

  for (const listType of rootTypes) {
    const nodes = tree.filter((node) => node.listType === listType);
    const list = $createListNode(listType);
    appendTreeToList(list, nodes);
    root.append(list);
  }
}

export function importMixedNestedListMarkdown(
  markdown: string,
  root: ElementNode,
  importMarkdownChunk: (chunk: string, node: ElementNode) => void
): void {
  for (const block of groupListBlocks(markdown)) {
    if (block.kind === 'list') {
      importListBlock(block.lines, root);
    } else if (block.text.trim().length > 0) {
      importMarkdownChunk(block.text, root);
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
