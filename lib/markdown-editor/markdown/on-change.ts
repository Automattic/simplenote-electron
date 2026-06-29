import type { LexicalEditor } from 'lexical';

import { clearBlockExportCache } from './block-export-cache';
import { $exportMarkdownString } from './import-export';

// Updates applied from remote/store content (as opposed to local typing) carry
// this tag so the on-change serializer doesn't echo them back as edits.
export const REMOTE_CONTENT_TAG = 'simplenote:remote-content';

// Markdown import must not promote newline-gap empty paragraphs to nbsp nodes.
export const IMPORT_MARKDOWN_TAG = 'simplenote:import-markdown';

// Serializing the whole tree to markdown is O(document), which is noticeable
// on very large notes. A debounced implementation exists but is shelved for
// now; see .cursor/specs/markdown-export-performance.md.
export function registerMarkdownOnChange(
  editor: LexicalEditor,
  onChange: (markdown: string) => void
): () => void {
  return editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState, tags }) => {
      if (tags.has(REMOTE_CONTENT_TAG)) {
        clearBlockExportCache(editor);
        return;
      }
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }
      editorState.read(() => {
        const markdown = $exportMarkdownString({
          dirtyElements: new Set(dirtyElements.keys()),
          dirtyLeaves: new Set(dirtyLeaves.keys()),
          editor,
        });
        queueMicrotask(() => onChange(markdown));
      });
    }
  );
}
