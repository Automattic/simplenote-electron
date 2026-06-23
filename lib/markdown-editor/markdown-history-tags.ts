import {
  $addUpdateTag,
  $hasUpdateTag,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
} from 'lexical';

import { $exportMarkdownString } from './import-export';

type EditorWithUpdateTags = LexicalEditor & { _updateTags: Set<string> };

/** After a shortcut mutation that may have added HISTORY_PUSH_TAG. */
export function $reconcileShortcutHistoryFromMarkdown(
  markdownBefore: string,
  editor: LexicalEditor
): void {
  if (!$hasUpdateTag(HISTORY_PUSH_TAG)) {
    return;
  }
  if ($exportMarkdownString() !== markdownBefore) {
    return;
  }

  // Lexical has no public API to remove a tag; merge only wins when push is absent.
  (editor as EditorWithUpdateTags)._updateTags.delete(HISTORY_PUSH_TAG);
  $addUpdateTag(HISTORY_MERGE_TAG);
}

/** When tagging history directly from a node transform or command. */
export function $tagShortcutHistoryFromMarkdown(markdownBefore: string): void {
  if ($exportMarkdownString() === markdownBefore) {
    $addUpdateTag(HISTORY_MERGE_TAG);
  } else {
    $addUpdateTag(HISTORY_PUSH_TAG);
  }
}
