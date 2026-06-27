import {
  registerMarkdownShortcuts,
  type ElementTransformer,
  type Transformer,
} from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

import {
  $exportMarkdownStringFromEditorCache,
  $exportTopLevelBlockMarkdown,
} from './import-export';
import {
  $exportTopLevelBlockMarkdownFromSelection,
  $getReExportKeysForSelection,
  $reconcileShortcutHistoryPush,
  pendingBlockShortcutHistory,
  registerSyntaxTriggerUndoSanitizer,
} from './markdown-history-tags';

type UpdatingEditor = LexicalEditor & { _updating?: boolean };

function getElementTransformers(
  transformers: Array<Transformer>
): Array<ElementTransformer> {
  return transformers.filter(
    (transformer): transformer is ElementTransformer =>
      transformer.type === 'element'
  );
}

function wrapTransformersForHistory(
  editor: LexicalEditor,
  transformers: Array<Transformer>
): Array<Transformer> {
  return transformers.map((transformer) => {
    if (transformer.type !== 'element') {
      return transformer;
    }

    const elementTransformer = transformer;

    return {
      ...elementTransformer,
      replace(parentNode, children, match, isImport) {
        if (!isImport) {
          pendingBlockShortcutHistory.set(editor, {
            blockBefore: $exportTopLevelBlockMarkdown(parentNode),
            matchedText: match[0],
          });
        }

        return elementTransformer.replace(
          parentNode,
          children,
          match,
          isImport
        );
      },
    };
  });
}

/**
 * `@lexical/markdown` enqueues shortcut transforms in a nested `editor.update()`
 * and tags successful transforms with `HISTORY_PUSH_TAG`. Merge that push when
 * export is unchanged, or when a block shortcut consumed only its trigger text.
 */
function installShortcutHistoryReconciliation(
  editor: LexicalEditor
): () => void {
  const update = editor.update.bind(editor);

  editor.update = (updateFn, options) => {
    if ((editor as UpdatingEditor)._updating) {
      return update(() => {
        const markdownBefore = $exportMarkdownStringFromEditorCache(editor);

        updateFn();

        const pending = pendingBlockShortcutHistory.get(editor);
        if (pending) {
          $reconcileShortcutHistoryPush(
            pending.blockBefore,
            $exportTopLevelBlockMarkdownFromSelection(),
            editor,
            pending.matchedText
          );
          pendingBlockShortcutHistory.delete(editor);
          return;
        }

        $reconcileShortcutHistoryPush(
          markdownBefore,
          $exportMarkdownStringFromEditorCache(
            editor,
            $getReExportKeysForSelection()
          ),
          editor
        );
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
  const elementTransformers = getElementTransformers(transformers);
  const wrappedTransformers = wrapTransformersForHistory(editor, transformers);
  const unregisterHistoryReconciliation =
    installShortcutHistoryReconciliation(editor);
  const unregisterUndoSanitizer = registerSyntaxTriggerUndoSanitizer(
    editor,
    elementTransformers
  );
  const unregisterMarkdownShortcuts = registerMarkdownShortcuts(
    editor,
    wrappedTransformers
  );

  return () => {
    unregisterMarkdownShortcuts();
    unregisterUndoSanitizer();
    unregisterHistoryReconciliation();
    pendingBlockShortcutHistory.delete(editor);
  };
}
