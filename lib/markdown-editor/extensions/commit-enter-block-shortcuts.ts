import {
  $addUpdateTag,
  $getNodeByKey,
  $isParagraphNode,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  type ElementNode,
  type LexicalEditor,
  type NodeKey,
} from 'lexical';

import {
  $exportTopLevelBlockMarkdown,
  $reimportRootParagraphIfNeeded,
} from '../markdown/import-export';
import { $getTopLevelBlockFromSelection } from './markdown-history-tags';
import { REMOTE_CONTENT_TAG } from '../markdown/on-change';

export const COMMIT_ENTER_BLOCK_SHORTCUT_TAG =
  'simplenote:commit-enter-block-shortcut';

function $getTopLevelBlockKeyFromSelection(): NodeKey | null {
  const block = $getTopLevelBlockFromSelection();
  return block?.getKey() ?? null;
}

/**
 * Re-import a root paragraph so block markdown on any line (e.g. `---`) becomes
 * structure. Uses the same export/import path as paste and remote sync.
 */
export function $commitTriggerOnEnterBlockShortcut(
  block: ElementNode
): string | null {
  const markdownBefore = $exportTopLevelBlockMarkdown(block);
  if (!$reimportRootParagraphIfNeeded(block)) {
    return null;
  }

  return markdownBefore;
}

export function registerCommitEnterBlockShortcutsOnLeave(
  editor: LexicalEditor
): () => void {
  return editor.registerUpdateListener(
    ({ editorState, prevEditorState, tags }) => {
      if (
        tags.has(COLLABORATION_TAG) ||
        tags.has(HISTORIC_TAG) ||
        tags.has(REMOTE_CONTENT_TAG) ||
        tags.has(COMMIT_ENTER_BLOCK_SHORTCUT_TAG)
      ) {
        return;
      }

      if (editor.isComposing()) {
        return;
      }

      const previousBlockKey = prevEditorState.read(
        $getTopLevelBlockKeyFromSelection
      );
      const nextBlockKey = editorState.read($getTopLevelBlockKeyFromSelection);

      if (previousBlockKey === null || previousBlockKey === nextBlockKey) {
        return;
      }

      editor.update(
        () => {
          const block = $getNodeByKey(previousBlockKey);
          if (block === null || !$isParagraphNode(block)) {
            return;
          }

          const matchedText = $commitTriggerOnEnterBlockShortcut(block);
          if (matchedText === null) {
            return;
          }

          $addUpdateTag(HISTORY_MERGE_TAG);
        },
        { tag: COMMIT_ENTER_BLOCK_SHORTCUT_TAG }
      );
    }
  );
}
