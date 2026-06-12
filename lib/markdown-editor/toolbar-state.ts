import type { LexicalEditor } from 'lexical';
import {
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { $isCodeNode } from '@lexical/code-core';
import { $isLinkNode } from '@lexical/link';
import { $isListNode } from '@lexical/list';
import {
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';

import type { ActiveListType } from './list-toggle';
import { $isSelectionInTable } from './table-controls';

export type ToolbarState = {
  inTitle: boolean;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  h2: boolean;
  h3: boolean;
  h4: boolean;
  activeList: ActiveListType | null;
  blockquote: boolean;
  codeBlock: boolean;
  inTable: boolean;
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

const listTypeToActive = (listType: string): ActiveListType | null => {
  switch (listType) {
    case 'bullet':
      return 'bulletList';
    case 'number':
      return 'orderedList';
    case 'check':
      return 'taskList';
    default:
      return null;
  }
};

const isHeadingTagActive = (
  tag: HeadingTagType,
  block: ReturnType<typeof $getTopLevelBlock>
) => !!block && $isHeadingNode(block) && block.getTag() === tag;

/** Reads toolbar active states in a single editor pass. */
export const readToolbarState = (editor: LexicalEditor): ToolbarState => {
  let state: ToolbarState = {
    inTitle: false,
    bold: false,
    italic: false,
    strike: false,
    code: false,
    link: false,
    h2: false,
    h3: false,
    h4: false,
    activeList: null,
    blockquote: false,
    codeBlock: false,
    inTable: false,
  };

  editor.read(() => {
    const selection = $getSelection();
    const root = $getRoot();
    const firstChild = root.getFirstChild();
    const block = $getTopLevelBlock();

    if ($isRangeSelection(selection)) {
      state = {
        ...state,
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        strike: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
        link: !!$findMatchingParent(selection.anchor.getNode(), $isLinkNode),
      };

      const listNode = $findMatchingParent(
        selection.anchor.getNode(),
        $isListNode
      );

      if (listNode) {
        state.activeList = listTypeToActive(listNode.getListType());
      }

      if (firstChild) {
        let titleBlock = selection.anchor.getNode();

        while (
          titleBlock.getParent() &&
          titleBlock.getParent()?.getKey() !== root.getKey()
        ) {
          titleBlock = titleBlock.getParent()!;
        }

        state.inTitle = titleBlock.getKey() === firstChild.getKey();
      }
    }

    state.h2 = isHeadingTagActive('h2', block);
    state.h3 = isHeadingTagActive('h3', block);
    state.h4 = isHeadingTagActive('h4', block);
    state.blockquote = !!block && $isQuoteNode(block);
    state.codeBlock = !!block && $isCodeNode(block);
    state.inTable = $isSelectionInTable();

    if (state.inTable) {
      // Block-level toggles do not apply inside table cells.
      state.h2 = false;
      state.h3 = false;
      state.h4 = false;
      state.activeList = null;
      state.blockquote = false;
      state.codeBlock = false;
    }
  });

  return state;
};

export const toolbarStateEqual = (a: ToolbarState, b: ToolbarState) =>
  a.inTitle === b.inTitle &&
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.strike === b.strike &&
  a.code === b.code &&
  a.link === b.link &&
  a.h2 === b.h2 &&
  a.h3 === b.h3 &&
  a.h4 === b.h4 &&
  a.activeList === b.activeList &&
  a.blockquote === b.blockquote &&
  a.codeBlock === b.codeBlock &&
  a.inTable === b.inTable;
