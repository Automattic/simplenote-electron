import { registerMarkdownShortcuts, type Transformer } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

type UpdatingEditor = LexicalEditor & { _updating?: boolean };

const MAX_NESTED_UPDATE_DEPTH = 3;

/**
 * `@lexical/markdown` shortcuts call `editor.update()` from inside
 * `registerUpdateListener`. That must run synchronously so node references from
 * the listener closure stay valid. Limit nested update *depth* so listeners
 * cannot recurse without bound.
 */
function installNestedUpdateGuard(editor: LexicalEditor): () => void {
  const update = editor.update.bind(editor);
  let nestedUpdateDepth = 0;

  editor.update = (updateFn, options) => {
    if ((editor as UpdatingEditor)._updating) {
      if (nestedUpdateDepth >= MAX_NESTED_UPDATE_DEPTH) {
        return;
      }

      nestedUpdateDepth++;
      try {
        return update(updateFn, options);
      } finally {
        nestedUpdateDepth--;
      }
    }

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
