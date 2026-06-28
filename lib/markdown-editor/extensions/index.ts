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

import { MarkdownCopyExtension } from '../clipboard/copy';
import { MarkdownPasteExtension } from '../clipboard/paste';
import { $importMarkdownString } from '../markdown/import-export';
import {
  REMOTE_CONTENT_TAG,
  registerMarkdownOnChange,
} from '../markdown/on-change';
import { MARKDOWN_TRANSFORMERS } from '../markdown/transformers';
import { createNoteViewMemoryExtension } from '../memory/note-view-memory';
import { ImageNode } from '../nodes/image-node';
import { TransientParagraphNode } from '../nodes/transient-paragraph-node';
import { markdownEditorTheme } from '../theme';
import { MarkdownToolbarExtension } from '../toolbar/extension';
import { registerBlockCursorNavigation } from './block-cursor-navigation';
import { registerBlockquoteEnterSplit } from './blockquote-enter-split';
import { registerFormatEscape } from './format-escape';
import { registerTaskListItemShortcuts } from '../markdown/list-transformers';
import { registerTaskListShortcut } from './list-toggle';
import { withTableSafeBlockShortcuts } from './markdown-table-shortcuts';
import { registerMarkdownShortcutsWithHistory } from './register-markdown-shortcuts';
import { registerMarkdownTabIndentation } from './tab-indentation';
import { TableControlsExtension } from './table-controls';

export type MarkdownEditorExtensionOptions = {
  getScrollContainer?: () => HTMLElement | null;
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
} from '../markdown/import-export';
export {
  $insertMarkdownPasteNodes,
  MarkdownPasteExtension,
  registerMarkdownPaste,
} from '../clipboard/paste';
export {
  $getClipboardMarkdownFromDataTransfer,
  $shouldPreferMarkdownPasteOverLexicalJson,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
  type ClipboardMarkdownPayload,
  type ClipboardMarkdownSource,
} from '../clipboard/shared';
export { MarkdownCopyExtension } from '../clipboard/copy';
export {
  REMOTE_CONTENT_TAG,
  registerMarkdownOnChange,
} from '../markdown/on-change';
export { MARKDOWN_TRANSFORMERS } from '../markdown/transformers';
export { withMixedNestedListTransformers } from '../markdown/list-transformers';

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
  const getScrollContainer = options?.getScrollContainer;

  const coreEditing: AnyLexicalExtensionArgument[] = [
    configExtension(InitialStateExtension, {
      updateOptions: { tag: REMOTE_CONTENT_TAG },
    }),
    richTextExtension,
    FormatEscapeExtension,
    HistoryExtension,
    listExtension,
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
  ];

  const markdownIo: AnyLexicalExtensionArgument[] = [
    MarkdownShortcutExtension,
    MarkdownPasteExtension,
    MarkdownCopyExtension,
    MarkdownToolbarExtension,
  ];

  const dependencies: AnyLexicalExtensionArgument[] = [
    ...coreEditing,
    ...markdownIo,
  ];

  if (onChange) {
    dependencies.push(createMarkdownOnChangeExtension(onChange));
  }

  if (noteId && getScrollTop && getScrollContainer) {
    dependencies.push(
      createNoteViewMemoryExtension({
        getScrollContainer,
        getScrollTop,
        noteId,
      })
    );
  }

  return defineExtension({
    $initialEditorState() {
      $importMarkdownString(markdown);
      // Saved caret is restored by noteViewMemoryExtension after scroll is applied.
      // selectStart prevents Lexical's focus fallback to selectEnd().
      $getRoot().selectStart();
    },
    dependencies,
    name: '@simplenote/markdown-editor',
    namespace: 'SimplenoteMarkdownEditor',
    onError(error: Error) {
      // eslint-disable-next-line no-console -- Lexical error sink; note view must stay alive
      console.error(error);
    },
    theme: markdownEditorTheme,
  });
}
