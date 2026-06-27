import type { LexicalEditor } from 'lexical';
import { useEffect, useState } from 'react';
import {
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
} from 'lexical';
import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isCodeNode } from '@lexical/code-core';
import { $isLinkNode } from '@lexical/link';
import { $isListNode } from '@lexical/list';
import {
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType,
} from '@lexical/rich-text';

import type { ActiveListType } from '../list-toggle';
import { $isImageNode } from '../image-node';
import { $isSelectionInTable } from '../table-controls';
import { subscribeToolbarUndoRedo } from './register';

export type ToolbarState = {
  inTitle: boolean;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  inImage: boolean;
  inHorizontalRule: boolean;
  h1: boolean;
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
    inImage: false,
    inHorizontalRule: false,
    h1: false,
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
      const anchorInLink = $findMatchingParent(
        selection.anchor.getNode(),
        $isLinkNode
      );
      const focusInLink = $findMatchingParent(
        selection.focus.getNode(),
        $isLinkNode
      );

      state = {
        ...state,
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        strike: selection.hasFormat('strikethrough'),
        code: selection.hasFormat('code'),
        link: !!(anchorInLink || focusInLink),
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
    } else if ($isNodeSelection(selection)) {
      state.inImage = selection.getNodes().some($isImageNode);
      state.inHorizontalRule = selection.getNodes().some($isHorizontalRuleNode);
    }

    state.h1 = isHeadingTagActive('h1', block);
    state.h2 = isHeadingTagActive('h2', block);
    state.h3 = isHeadingTagActive('h3', block);
    state.h4 = isHeadingTagActive('h4', block);
    state.blockquote = !!block && $isQuoteNode(block);
    state.codeBlock = !!block && $isCodeNode(block);
    state.inTable = $isSelectionInTable();

    if (state.inTable) {
      // Block-level toggles do not apply inside table cells.
      state.h1 = false;
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
  a.inImage === b.inImage &&
  a.inHorizontalRule === b.inHorizontalRule &&
  a.h1 === b.h1 &&
  a.h2 === b.h2 &&
  a.h3 === b.h3 &&
  a.h4 === b.h4 &&
  a.activeList === b.activeList &&
  a.blockquote === b.blockquote &&
  a.codeBlock === b.codeBlock &&
  a.inTable === b.inTable;

export const useToolbarState = (editor: LexicalEditor) => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [state, setState] = useState(() => readToolbarState(editor));

  useEffect(() => {
    let rafId: number | null = null;

    const updateToolbar = () => {
      const nextState = readToolbarState(editor);

      setState((current) =>
        toolbarStateEqual(current, nextState) ? current : nextState
      );
    };

    const scheduleToolbarUpdate = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateToolbar();
      });
    };

    const unregisterUpdate = editor.registerUpdateListener(() => {
      scheduleToolbarUpdate();
    });

    const unregisterUndoRedo = subscribeToolbarUndoRedo(
      ({ canRedo: nextCanRedo, canUndo: nextCanUndo }) => {
        setCanUndo(nextCanUndo);
        setCanRedo(nextCanRedo);
      }
    );

    updateToolbar();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      unregisterUpdate();
      unregisterUndoRedo();
    };
  }, [editor]);

  return { canRedo, canUndo, state };
};
