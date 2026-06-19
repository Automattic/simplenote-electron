import { registerMarkdownShortcuts, type Transformer } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

type UpdatingEditor = LexicalEditor & { _updating?: boolean };

const MAX_NESTED_UPDATES_PER_ROOT = 3;

/**
 * `@lexical/markdown` shortcuts call `editor.update()` from inside
 * `registerUpdateListener`. That must run synchronously so node references from
 * the listener closure stay valid. Cap nested updates per root commit so
 * listeners cannot recurse without bound.
 */
function installNestedUpdateGuard(editor: LexicalEditor): () => void {
  const update = editor.update.bind(editor);
  let nestedUpdateCount = 0;

  editor.update = (updateFn, options) => {
    if ((editor as UpdatingEditor)._updating) {
      if (nestedUpdateCount >= MAX_NESTED_UPDATES_PER_ROOT) {
        return;
      }

      nestedUpdateCount++;
      return update(updateFn, options);
    }

    nestedUpdateCount = 0;
    return update(updateFn, options);
  };

  return () => {
    editor.update = update;
  };
}

export function registerSafeMarkdownShortcuts(
  editor: LexicalEditor,
  transformers: Array<Transformer>
): () => void {
  const unregisterNestedUpdateGuard = installNestedUpdateGuard(editor);
  const unregisterMarkdownShortcuts = registerMarkdownShortcuts(
    editor,
    transformers
  );

  return () => {
    unregisterMarkdownShortcuts();
    unregisterNestedUpdateGuard();
  };
}
