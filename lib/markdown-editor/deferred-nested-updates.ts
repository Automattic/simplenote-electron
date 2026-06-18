import type { LexicalEditor } from 'lexical';

type UpdatingEditor = LexicalEditor & { _updating?: boolean };

/**
 * `@lexical/markdown` shortcuts call `editor.update()` from inside
 * `registerUpdateListener`. That re-fires listeners in the same cascade and
 * can hit Lexical's 99-update guard. Defer nested updates until the current
 * commit finishes.
 */
export function installDeferredNestedUpdates(
  editor: LexicalEditor
): () => void {
  const update = editor.update.bind(editor);

  editor.update = (updateFn, options) => {
    if ((editor as UpdatingEditor)._updating) {
      queueMicrotask(() => update(updateFn, options));
      return;
    }

    return update(updateFn, options);
  };

  return () => {
    editor.update = update;
  };
}
