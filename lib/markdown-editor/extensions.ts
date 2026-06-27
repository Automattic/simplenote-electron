import { CodeExtension, CodeIndentExtension } from '@lexical/code-core';
import {
  HorizontalRuleExtension,
  InitialStateExtension,
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { LinkExtension } from '@lexical/link';
import { CheckListExtension, ListExtension } from '@lexical/list';
import { RichTextExtension } from '@lexical/rich-text';
import { TableExtension } from '@lexical/table';
import {
  $getRoot,
  configExtension,
  defineExtension,
  type AnyLexicalExtensionArgument,
} from 'lexical';

import { MarkdownCopyExtension } from './clipboard/copy';
import { MarkdownPasteExtension } from './clipboard/paste';
import { registerFormatEscape } from './format-escape';
import {
  $exportMarkdownString,
  $importMarkdownString,
  $markdownToNodes,
} from './import-export';
import { ImageNode } from './image-node';
import { registerTaskListItemShortcuts } from './list-transformers';
import { registerListDeletion } from './list-deletion';
import { registerTaskListShortcut } from './list-toggle';
import { withTableSafeBlockShortcuts } from './markdown-table-shortcuts';
import { REMOTE_CONTENT_TAG, registerMarkdownOnChange } from './on-change';
import { registerMarkdownShortcutsWithHistory } from './register-markdown-shortcuts';
import { registerMarkdownTabIndentation } from './tab-indentation';
import { TableControlsExtension } from './table-controls';
import { registerBlockCursorNavigation } from './block-cursor-navigation';
import { registerBlockquoteEnterSplit } from './blockquote-enter-split';
import { TransientParagraphNode } from './transient-paragraph-node';
import { markdownEditorTheme } from './theme';
import { MarkdownToolbarExtension } from './toolbar/extension';
import {
  $restoreSavedMarkdownSelection,
  createNoteViewMemoryExtension,
} from './note-view-memory';
import { MARKDOWN_TRANSFORMERS } from './transformers';

export type MarkdownEditorExtensionOptions = {
  getScrollTop?: () => number;
  noteId?: string;
};

export {
  $captureMarkdownViewSelection,
  $exportMarkdownString,
  $importMarkdownString,
  $importRemoteMarkdown,
  $markdownToNodes,
  $restoreMarkdownViewSelection,
} from './import-export';
export {
  $insertMarkdownPasteNodes,
  MarkdownPasteExtension,
  registerMarkdownPaste,
} from './clipboard/paste';
export {
  $getClipboardMarkdownFromDataTransfer,
  $shouldPreferMarkdownPasteOverLexicalJson,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
  type ClipboardMarkdownPayload,
  type ClipboardMarkdownSource,
} from './clipboard/shared';
export { MarkdownCopyExtension } from './clipboard/copy';
export { REMOTE_CONTENT_TAG, registerMarkdownOnChange } from './on-change';
export { MARKDOWN_TRANSFORMERS, TRANSFORMERS } from './transformers';
export { withMixedNestedListTransformers } from './list-transformers';

const ImageExtension = defineExtension({
  name: '@simplenote/image-node',
  nodes: [ImageNode],
});

const listExtension = configExtension(ListExtension, {
  hasStrictIndent: true,
});

// Inline code escapes on Enter and click since there is no other way out of
// it at the end of a line. Arrow-key escape is handled by
// FormatEscapeExtension instead: the built-in `arrow` trigger lets the caret
// move anyway, which discards the escaped format everywhere except the end
// of the document. Merges with the defaults (capitalize/lowercase/uppercase
// escape on enter/space/tab).
const richTextExtension = configExtension(RichTextExtension, {
  escapeFormatTriggers: {
    code: { onlyAtBoundary: true, enter: true, click: true },
  },
});

// Pressing ArrowLeft/ArrowRight at the edge of formatted text clears that
// format from the selection without moving the caret, so typing continues
// unformatted ("trailing edge escape").
const FormatEscapeExtension = defineExtension({
  name: '@simplenote/format-escape',
  register(editor) {
    return registerFormatEscape(editor);
  },
});

const TransientParagraphExtension = defineExtension({
  name: '@simplenote/transient-paragraph',
  nodes: [TransientParagraphNode],
});

const BlockCursorNavigationExtension = defineExtension({
  name: '@simplenote/block-cursor-navigation',
  register(editor) {
    return registerBlockCursorNavigation(editor);
  },
});

const BlockquoteEnterSplitExtension = defineExtension({
  name: '@simplenote/blockquote-enter-split',
  register(editor) {
    return registerBlockquoteEnterSplit(editor);
  },
});

const ListDeletionExtension = defineExtension({
  name: '@simplenote/list-deletion',
  register(editor) {
    return registerListDeletion(editor);
  },
});

// Re-import paragraphs on leave so block markdown (`---`, `# `, etc.) does not
// remain as literal text inside a line-native paragraph.
export const MarkdownShortcutExtension = defineExtension({
  name: '@simplenote/markdown-shortcuts',
  register(editor) {
    const unregisterMarkdownShortcuts = registerMarkdownShortcutsWithHistory(
      editor,
      withTableSafeBlockShortcuts(MARKDOWN_TRANSFORMERS)
    );
    const unregisterTaskListItemShortcuts =
      registerTaskListItemShortcuts(editor);
    const unregisterTaskListShortcut = registerTaskListShortcut(editor);
    const unregisterTabIndentation = registerMarkdownTabIndentation(editor);
    return () => {
      unregisterMarkdownShortcuts();
      unregisterTaskListItemShortcuts();
      unregisterTaskListShortcut();
      unregisterTabIndentation();
    };
  },
});

function createMarkdownOnChangeExtension(onChange: (markdown: string) => void) {
  return defineExtension({
    name: '@simplenote/markdown-on-change',
    register(editor) {
      return registerMarkdownOnChange(editor, onChange);
    },
  });
}

export function createMarkdownEditorExtension(
  markdown: string,
  onChange?: (nextMarkdown: string) => void,
  options?: MarkdownEditorExtensionOptions
) {
  const noteId = options?.noteId;
  const getScrollTop = options?.getScrollTop;
  const dependencies: AnyLexicalExtensionArgument[] = [
    configExtension(InitialStateExtension, {
      updateOptions: { tag: REMOTE_CONTENT_TAG },
    }),
    richTextExtension,
    FormatEscapeExtension,
    HistoryExtension,
    listExtension,
    ListDeletionExtension,
    CheckListExtension,
    LinkExtension,
    CodeExtension,
    configExtension(CodeIndentExtension, {
      disabled: true,
      tabSize: undefined,
    }),
    TableExtension,
    TableControlsExtension,
    HorizontalRuleExtension,
    TransientParagraphExtension,
    BlockCursorNavigationExtension,
    BlockquoteEnterSplitExtension,
    ImageExtension,
    MarkdownShortcutExtension,
    MarkdownPasteExtension,
    MarkdownCopyExtension,
    MarkdownToolbarExtension,
  ];

  if (onChange) {
    dependencies.push(createMarkdownOnChangeExtension(onChange));
  }

  if (noteId && getScrollTop) {
    dependencies.push(createNoteViewMemoryExtension(noteId, getScrollTop));
  }

  return defineExtension({
    $initialEditorState() {
      $importMarkdownString(markdown);
      if (noteId) {
        $restoreSavedMarkdownSelection(noteId, markdown);
      } else {
        // Without note id, leave the caret at the start: with no selection,
        // Lexical's focus handling falls back to selectEnd(), which scrolls
        // long notes to the bottom the first time the editor gains focus.
        $getRoot().selectStart();
      }
    },
    dependencies,
    name: '@simplenote/markdown-editor',
    namespace: 'SimplenoteMarkdownEditor',
    onError(error: Error) {
      console.error(error);
    },
    theme: markdownEditorTheme,
  });
}
