import type { ElementTransformer } from '@lexical/markdown';
import {
  $addUpdateTag,
  $createParagraphNode,
  $findMatchingParent,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  type ElementNode,
  type LexicalEditor,
  type NodeKey,
} from 'lexical';

import { $expandDirtyRootBlockNeighbors } from '../markdown/block-export-cache';
import {
  $exportMarkdownStringFromEditorCache,
  $exportTopLevelBlockMarkdown,
} from '../markdown/import-export';

type EditorWithUpdateTags = LexicalEditor & { _updateTags: Set<string> };

export type PendingBlockShortcutHistory = {
  blockBefore: string;
  matchedText: string;
};

export const pendingBlockShortcutHistory = new WeakMap<
  LexicalEditor,
  PendingBlockShortcutHistory
>();

export function $getTopLevelBlockFromSelection(): ElementNode | null {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  return $findMatchingParent(selection.anchor.getNode(), (node) => {
    const parent = node.getParent();
    return parent !== null && parent.getType() === 'root';
  });
}

export function $exportTopLevelBlockMarkdownFromSelection(): string {
  const block = $getTopLevelBlockFromSelection();
  if (!block) {
    return '';
  }

  return $exportTopLevelBlockMarkdown(block);
}

/** Root blocks to re-export after a local shortcut mutation. */
export function $getReExportKeysForSelection(): Set<NodeKey> {
  const block = $getTopLevelBlockFromSelection();
  if (!block) {
    return new Set();
  }

  return $expandDirtyRootBlockNeighbors(new Set([block.getKey()]));
}

/** When tagging history directly from a node transform or command. */
export function $tagShortcutHistoryFromMarkdown(
  markdownBefore: string,
  editor: LexicalEditor
): void {
  const markdownAfter = $exportMarkdownStringFromEditorCache(
    editor,
    $getReExportKeysForSelection()
  );
  if ($shouldMergeShortcutHistory(markdownBefore, markdownAfter)) {
    $addUpdateTag(HISTORY_MERGE_TAG);
  } else {
    $addUpdateTag(HISTORY_PUSH_TAG);
  }
}

/** True when a block shortcut consumed only its trigger text (e.g. `## ` → empty h2). */
export function $shouldMergeShortcutHistory(
  markdownBefore: string,
  markdownAfter: string,
  matchedText?: string
): boolean {
  if (markdownAfter === markdownBefore) {
    return true;
  }

  return (
    matchedText !== undefined &&
    markdownAfter === '' &&
    markdownBefore === matchedText
  );
}

export function $isElementSyntaxTriggerOnly(
  text: string,
  elementTransformers: ReadonlyArray<Pick<ElementTransformer, 'regExp'>>
): boolean {
  if (text.length === 0) {
    return false;
  }

  return elementTransformers.some(({ regExp }) => {
    const match = text.match(regExp);
    return match !== null && match[0] === text;
  });
}

function $mergeShortcutHistoryPush(editor: LexicalEditor): void {
  const tags = (editor as EditorWithUpdateTags)._updateTags;
  if (!tags.has(HISTORY_PUSH_TAG)) {
    return;
  }

  // Lexical has no public API to remove a tag; merge only wins when push is absent.
  tags.delete(HISTORY_PUSH_TAG);
  tags.add(HISTORY_MERGE_TAG);
}

/** After a shortcut mutation that may have added HISTORY_PUSH_TAG. */
export function $reconcileShortcutHistoryPush(
  markdownBefore: string,
  markdownAfter: string,
  editor: LexicalEditor,
  matchedText?: string
): void {
  if (
    !$shouldMergeShortcutHistory(markdownBefore, markdownAfter, matchedText)
  ) {
    return;
  }

  $mergeShortcutHistoryPush(editor);
}

/**
 * Undo must not leave literal block markdown triggers in the document: they
 * would round-trip into structure on the next import.
 */
export function $sanitizeSyntaxTriggerOnlyRoot(
  elementTransformers: ReadonlyArray<Pick<ElementTransformer, 'regExp'>>
): boolean {
  const root = $getRoot();
  const children = root.getChildren();

  if (children.length !== 1 || !$isParagraphNode(children[0])) {
    return false;
  }

  const text = children[0].getTextContent();
  if (!$isElementSyntaxTriggerOnly(text, elementTransformers)) {
    return false;
  }

  root.clear();
  root.append($createParagraphNode());
  return true;
}

export function registerSyntaxTriggerUndoSanitizer(
  editor: LexicalEditor,
  elementTransformers: ReadonlyArray<Pick<ElementTransformer, 'regExp'>>
): () => void {
  return editor.registerUpdateListener(({ tags }) => {
    if (!tags.has(HISTORIC_TAG)) {
      return;
    }

    editor.update(() => {
      if (!$sanitizeSyntaxTriggerOnlyRoot(elementTransformers)) {
        return;
      }

      $addUpdateTag(HISTORY_MERGE_TAG);
    });
  });
}
