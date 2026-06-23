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
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
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
import { registerSafeMarkdownShortcuts } from './register-safe-markdown-shortcuts';
import { registerMarkdownTabIndentation } from './tab-indentation';
import { TableControlsExtension } from './table-controls';
import { markdownEditorTheme } from './theme';
import { MarkdownToolbarExtension } from './toolbar/extension';
import { MARKDOWN_TRANSFORMERS } from './transformers';

export {
  $exportMarkdownString,
  $importMarkdownString,
  $markdownToNodes,
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

const ListDeletionExtension = defineExtension({
  name: '@simplenote/list-deletion',
  register(editor) {
    return registerListDeletion(editor);
  },
});

// Markdown shortcut formatting can leave the serialized note unchanged, so merge it out of undo history.
const MarkdownHistoryMergeExtension = defineExtension({
  name: '@simplenote/markdown-history-merge',
  register(editor) {
    return editor.registerUpdateListener(
      ({ editorState, prevEditorState, tags }) => {
        if (!tags.has(HISTORY_PUSH_TAG)) {
          return;
        }

        const previousMarkdown = prevEditorState.read(() =>
          $exportMarkdownString()
        );
        const nextMarkdown = editorState.read(() => $exportMarkdownString());

        if (previousMarkdown !== nextMarkdown) {
          return;
        }

        tags.delete(HISTORY_PUSH_TAG);
        tags.add(HISTORY_MERGE_TAG);
      }
    );
  },
});

export const MarkdownShortcutExtension = defineExtension({
  name: '@simplenote/markdown-shortcuts',
  register(editor) {
    const unregisterMarkdownShortcuts = registerSafeMarkdownShortcuts(
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
  onChange?: (nextMarkdown: string) => void
) {
  const dependencies: AnyLexicalExtensionArgument[] = [
    configExtension(InitialStateExtension, {
      updateOptions: { tag: REMOTE_CONTENT_TAG },
    }),
    richTextExtension,
    FormatEscapeExtension,
    MarkdownHistoryMergeExtension,
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
    ImageExtension,
    MarkdownShortcutExtension,
    MarkdownPasteExtension,
    MarkdownCopyExtension,
    MarkdownToolbarExtension,
  ];

  if (onChange) {
    dependencies.push(createMarkdownOnChangeExtension(onChange));
  }

  return defineExtension({
    $initialEditorState() {
      $importMarkdownString(markdown);
      // Leave the caret at the start: with no selection, Lexical's focus
      // handling falls back to selectEnd(), which scrolls long notes to the
      // bottom the first time the editor gains focus.
      $getRoot().selectStart();
    },
    dependencies,
    name: '@simplenote/markdown-editor',
    namespace: 'SimplenoteMarkdownEditor',
    onError(error: Error) {
      throw error;
    },
    theme: markdownEditorTheme,
  });
}
