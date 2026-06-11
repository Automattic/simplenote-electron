import { GetClipboardDataExtension } from '@lexical/clipboard';
import { $isCodeNode, CodeExtension } from '@lexical/code-core';
import {
  HorizontalRuleExtension,
  InitialStateExtension,
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { LinkExtension } from '@lexical/link';
import { CheckListExtension, ListExtension } from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  CODE,
  HEADING,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  QUOTE,
  registerMarkdownShortcuts,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import { RichTextExtension } from '@lexical/rich-text';
import { TableExtension } from '@lexical/table';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  configExtension,
  defineExtension,
  PASTE_COMMAND,
  type AnyLexicalExtensionArgument,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import { registerFormatEscape } from './format-escape';
import { HR, IMAGE, TABLE, TILDE_CODE } from './gfm-transformers';
import { ImageNode } from './image-node';
import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  importMixedNestedListMarkdown,
  registerTaskListItemShortcuts,
} from './list-transformers';
import { registerMarkdownTabIndentation } from './tab-indentation';

const ImageExtension = defineExtension({
  name: '@simplenote/image-node',
  nodes: [ImageNode],
});

// CHECK_LIST must precede UNORDERED_LIST so `- [ ]` is parsed as a task item.
// HR before lists (`---` ambiguity). TABLE before CODE (multiline blocks).
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  QUOTE,
  HR,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  MIXED_NESTED_ORDERED_LIST,
  TABLE,
  CODE,
  TILDE_CODE,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  IMAGE,
  LINK,
];

export const TRANSFORMERS = MARKDOWN_TRANSFORMERS;

const INLINE_MARKDOWN_TRANSFORMERS = MARKDOWN_TRANSFORMERS.filter(
  (transformer): transformer is TextFormatTransformer | TextMatchTransformer =>
    transformer.type === 'text-format' || transformer.type === 'text-match'
);

// $convertFromMarkdownString clears its target node, so each chunk is
// imported into a temporary container first, then the resulting blocks
// are hoisted out. Leaving blocks nested inside the container paragraph
// breaks element-level markdown shortcuts (they require blocks to be
// direct children of the root) and corrupts markdown export.
function $importChunk(chunk: string, target: ElementNode): void {
  const container = $createParagraphNode();
  target.append(container);
  $convertFromMarkdownString(chunk, MARKDOWN_TRANSFORMERS, container);
  if (container.getParent() !== null) {
    for (const child of container.getChildren()) {
      container.insertBefore(child);
    }
    container.remove();
  }
}

export function $importMarkdownString(markdown: string): void {
  const root = $getRoot();
  root.clear();
  importMixedNestedListMarkdown(
    markdown,
    root,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
}

/**
 * Parses a markdown string into block nodes without touching the document,
 * e.g. for inserting pasted markdown at the current selection.
 */
export function $markdownToNodes(markdown: string): LexicalNode[] {
  // $convertFromMarkdownString moves the selection to the start of its
  // target node, so preserve the caller's selection across the conversion.
  const previousSelection = $getSelection()?.clone() ?? null;

  const holder = $createParagraphNode();
  importMixedNestedListMarkdown(
    markdown,
    holder,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
  const children = holder.getChildren();
  for (const child of children) {
    child.remove();
  }

  $setSelection(previousSelection);
  return children;
}

export { withMixedNestedListTransformers } from './list-transformers';

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

const markdownEditorTheme = {
  code: 'lexical-md-editor__code-block',
  hr: 'lexical-md-editor__hr',
  list: {
    listitemChecked: 'task-list-item',
    listitemUnchecked: 'task-list-item',
    nested: {
      listitem: 'lexical-nested-list-item',
    },
  },
  table: 'lexical-md-editor__table',
  tableCell: 'lexical-md-editor__table-cell',
  tableCellHeader: 'lexical-md-editor__table-cell-header',
  tableRow: 'lexical-md-editor__table-row',
  tableScrollableWrapper: 'lexical-md-editor__table-scrollable-wrapper',
  text: {
    strikethrough: 'md-strikethrough',
  },
};

export const MarkdownShortcutExtension = defineExtension({
  name: '@simplenote/markdown-shortcuts',
  register(editor) {
    const unregisterMarkdownShortcuts = registerMarkdownShortcuts(
      editor,
      MARKDOWN_TRANSFORMERS
    );
    const unregisterTaskListItemShortcuts =
      registerTaskListItemShortcuts(editor);
    const unregisterTabIndentation = registerMarkdownTabIndentation(editor);
    return () => {
      unregisterMarkdownShortcuts();
      unregisterTaskListItemShortcuts();
      unregisterTabIndentation();
    };
  },
});

// Block constructs at line starts (headings, quotes, fences, lists) or common
// inline syntax (bold, links, code, strikethrough). Plain prose without any of
// these falls through to Lexical's default paste.
const MARKDOWN_PASTE_HINT =
  /(^|\n)\s{0,3}(#{1,6}\s|>\s|```|~~~|[-*+]\s|\d+\.\s|---|\*\*\*|___|\|[^\n]+\|)|!\[[^\]\n]*\]\([^)\n]+\)|https?:\/\/[^\s<>\[\]()]+|(?:<[a-z]+:[^>\n]+>)|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)|`[^`\n]+`|~~[^~\n]+~~/;

export function $insertMarkdownPasteNodes(
  text: string,
  pasteAnchorBlock: ElementNode | null
): boolean {
  const nodes = $markdownToNodes(text);
  if (nodes.length === 0) {
    return false;
  }

  const insertionSelection = $getSelection();
  if (!$isRangeSelection(insertionSelection)) {
    return false;
  }

  if (nodes.length === 1 && $isParagraphNode(nodes[0])) {
    insertionSelection.insertNodes(nodes[0].getChildren());
    return true;
  }

  if (
    $isParagraphNode(pasteAnchorBlock) &&
    pasteAnchorBlock.isEmpty() &&
    nodes.some((node) => !$isParagraphNode(node))
  ) {
    const root = $getRoot();
    pasteAnchorBlock.remove();
    for (const node of nodes) {
      root.append(node);
    }
    nodes[nodes.length - 1].selectEnd();
    return true;
  }

  const anchor = insertionSelection.anchor;
  const anchorBlock =
    $getNodeByKey(pasteAnchorBlock?.getKey() ?? '') ??
    anchor.getNode().getTopLevelElement();

  if (
    $isParagraphNode(anchorBlock) &&
    anchorBlock.isEmpty() &&
    (nodes.length !== 1 || !$isParagraphNode(nodes[0]))
  ) {
    const root = $getRoot();
    anchorBlock.remove();
    for (const node of nodes) {
      root.append(node);
    }
    nodes[nodes.length - 1].selectEnd();
    return true;
  }

  const atBlockStart =
    insertionSelection.isCollapsed() &&
    anchor.offset === 0 &&
    $isElementNode(anchorBlock) &&
    (anchor.getNode().is(anchorBlock) ||
      anchor.getNode().is(anchorBlock.getFirstDescendant()));
  if (atBlockStart && !anchorBlock.isEmpty()) {
    for (const node of nodes) {
      anchorBlock.insertBefore(node);
    }
    nodes[nodes.length - 1].selectEnd();
    return true;
  }

  if (
    !$isParagraphNode(nodes[0]) &&
    $isElementNode(anchorBlock) &&
    !anchorBlock.isEmpty()
  ) {
    insertionSelection.insertParagraph();
    const splitSelection = $getSelection();
    const secondHalf = $isRangeSelection(splitSelection)
      ? splitSelection.anchor.getNode().getTopLevelElement()
      : null;
    if (secondHalf !== null) {
      for (const node of nodes) {
        secondHalf.insertBefore(node);
      }
      if ($isParagraphNode(secondHalf) && secondHalf.isEmpty()) {
        secondHalf.remove();
      }
      nodes[nodes.length - 1].selectEnd();
      return true;
    }
  }

  insertionSelection.insertNodes(nodes);
  return true;
}

export function registerMarkdownPaste(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    PASTE_COMMAND,
    (event) => {
      const clipboardData =
        'clipboardData' in event ? event.clipboardData : null;
      if (!clipboardData) {
        return false;
      }

      const text = clipboardData.getData('text/plain');
      if (!text || !MARKDOWN_PASTE_HINT.test(text)) {
        return false;
      }

      // Editor-internal copies carry lossless Lexical JSON; defer to the
      // default rich-text paste rather than re-parsing our markdown export.
      // Mirrors the namespace check of Lexical's own JSON importer so JSON
      // from unrelated Lexical editors doesn't suppress markdown parsing.
      const lexicalJson = clipboardData.getData('application/x-lexical-editor');
      if (lexicalJson) {
        try {
          const payload = JSON.parse(lexicalJson);
          if (payload && payload.namespace === editor._config.namespace) {
            return false;
          }
        } catch {
          // Not valid JSON; treat as absent.
        }
      }

      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const pasteAnchorBlock = selection.anchor.getNode().getTopLevelElement();

      // Inside code blocks paste stays raw.
      if ($isCodeNode(pasteAnchorBlock)) {
        return false;
      }

      if (!$insertMarkdownPasteNodes(text, pasteAnchorBlock)) {
        return false;
      }

      event.preventDefault();
      return true;
    },
    COMMAND_PRIORITY_HIGH
  );
}

export const MarkdownPasteExtension = defineExtension({
  name: '@simplenote/markdown-paste',
  register(editor) {
    return registerMarkdownPaste(editor);
  },
});

// Lexical's default copy writes the selection's plain text content into
// text/plain, which strips markdown structure (code fences, quote markers,
// list bullets, ...). Layer a serializer on the clipboard-export stack that
// emits the selection's markdown instead, matching what this note stores.
// The default text/html and application/x-lexical-editor payloads stay
// intact for rich-text targets and lossless editor-internal pastes, and the
// same config covers copy, cut, and drag out of the editor.
export const MarkdownCopyExtension = defineExtension({
  name: '@simplenote/markdown-copy',
  dependencies: [
    configExtension(GetClipboardDataExtension, {
      $exportMimeType: {
        'text/plain': [
          (selection, next) =>
            selection
              ? $convertSelectionToMarkdownString(
                  MARKDOWN_TRANSFORMERS,
                  selection
                )
              : next(),
        ],
      },
    }),
  ],
});

// Updates applied from remote/store content (as opposed to local typing) carry
// this tag so the on-change serializer doesn't echo them back as edits.
export const REMOTE_CONTENT_TAG = 'simplenote:remote-content';

// Serializing the whole tree to markdown is O(document), which is noticeable
// on very large notes. A debounced implementation exists but is shelved for
// now; see .cursor/debounced-markdown-serialization.md before reintroducing.
export function registerMarkdownOnChange(
  editor: LexicalEditor,
  onChange: (markdown: string) => void
): () => void {
  return editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState, tags }) => {
      if (tags.has(REMOTE_CONTENT_TAG)) {
        return;
      }
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }
      editorState.read(() => {
        onChange($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
      });
    }
  );
}

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
  onChange?: (markdown: string) => void
) {
  const dependencies: AnyLexicalExtensionArgument[] = [
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
    TableExtension,
    HorizontalRuleExtension,
    ImageExtension,
    MarkdownShortcutExtension,
    MarkdownPasteExtension,
    MarkdownCopyExtension,
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
