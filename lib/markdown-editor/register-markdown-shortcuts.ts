import { registerMarkdownShortcuts, type Transformer } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

import { $exportMarkdownString } from './import-export';
import { $reconcileShortcutHistoryFromMarkdown } from './markdown-history-tags';

type UpdatingEditor = LexicalEditor & { _updating?: boolean };

/**
 * `@lexical/markdown` enqueues shortcut transforms in a nested `editor.update()`
 * and always tags successful transforms with `HISTORY_PUSH_TAG`. Many shortcuts
 * (`## `, `*italic*`, `> quote`, …) change the Lexical tree without changing
 * serialized markdown, which would otherwise add spurious undo steps. Intercept
 * nested updates so we can swap push → merge when export is unchanged.
 */
function installShortcutHistoryReconciliation(
  editor: LexicalEditor
): () => void {
  const update = editor.update.bind(editor);

  editor.update = (updateFn, options) => {
    if ((editor as UpdatingEditor)._updating) {
      return update(() => {
        const markdownBefore = $exportMarkdownString();
        updateFn();
        $reconcileShortcutHistoryFromMarkdown(markdownBefore, editor);
      }, options);
    }

    return update(updateFn, options);
  };

  return () => {
    editor.update = update;
  };
}

/** Simplenote entry point for `@lexical/markdown` block/inline shortcuts. */
export function registerMarkdownShortcutsWithHistory(
  editor: LexicalEditor,
  transformers: Array<Transformer>
): () => void {
  const unregisterHistoryReconciliation =
    installShortcutHistoryReconciliation(editor);
  const unregisterMarkdownShortcuts = registerMarkdownShortcuts(
    editor,
    transformers
  );

  return () => {
    unregisterMarkdownShortcuts();
    unregisterHistoryReconciliation();
  };
}
