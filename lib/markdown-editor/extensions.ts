import { GetClipboardDataExtension } from '@lexical/clipboard';
import { $isCodeNode, CodeExtension } from '@lexical/code-core';
import {
  InitialStateExtension,
  TabIndentationExtension,
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { LinkExtension } from '@lexical/link';
import {
  $isListItemNode,
  CheckListExtension,
  ListExtension,
} from '@lexical/list';
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
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  configExtension,
  defineExtension,
  PASTE_COMMAND,
  type AnyLexicalExtensionArgument,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  importMixedNestedListMarkdown,
} from './list-transformers';

// CHECK_LIST must precede UNORDERED_LIST so `- [ ]` is parsed as a task item.
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  QUOTE,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  MIXED_NESTED_ORDERED_LIST,
  CODE,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
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

const listTabIndentationExtension = configExtension(TabIndentationExtension, {
  $canIndent: (node) => $isListItemNode(node),
});

const listExtension = configExtension(ListExtension, {
  hasStrictIndent: true,
});

const markdownEditorTheme = {
  code: 'lexical-md-editor__code-block',
  list: {
    listitemChecked: 'task-list-item',
    listitemUnchecked: 'task-list-item',
    nested: {
      listitem: 'lexical-nested-list-item',
    },
  },
};

export const MarkdownShortcutExtension = defineExtension({
  name: '@simplenote/markdown-shortcuts',
  register(editor) {
    return registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
  },
});

// Block constructs at line starts (headings, quotes, fences, lists) or common
// inline syntax (bold, links, code, strikethrough). Plain prose without any of
// these falls through to Lexical's default paste.
const MARKDOWN_PASTE_HINT =
  /(^|\n)\s{0,3}(#{1,6} |> |```|[-*+] |\d+\. )|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)|`[^`\n]+`|~~[^~\n]+~~/;

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

      // Inside code blocks paste stays raw.
      if ($isCodeNode(selection.anchor.getNode().getTopLevelElement())) {
        return false;
      }

      const nodes = $markdownToNodes(text);
      if (nodes.length === 0) {
        return false;
      }

      // The conversion replaced the active selection object; re-read the
      // restored one so the nodes land at the cursor position.
      const insertionSelection = $getSelection();
      if (!$isRangeSelection(insertionSelection)) {
        return false;
      }

      event.preventDefault();

      // A single pasted paragraph (e.g. a link) merges inline at the caret,
      // like a plain-text paste would.
      if (nodes.length === 1 && $isParagraphNode(nodes[0])) {
        insertionSelection.insertNodes(nodes[0].getChildren());
        return true;
      }

      const anchor = insertionSelection.anchor;
      const anchorBlock = anchor.getNode().getTopLevelElement();

      // At the start of a non-empty block, insert the pasted blocks above the
      // current line. Besides being the expected result, this avoids a Lexical
      // bug: insertNodes calls insertParagraph, and HeadingNode.insertNewAfter
      // replaces the heading when the caret sits at its start, leaving
      // insertNodes holding a detached block reference (it then throws
      // "Expected node N to have a parent").
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

      // insertNodes merges the first pasted block into the current block,
      // which would strip the formatting of a leading heading/list/quote.
      // When the paste starts with such a block and the current block has
      // content, split at the caret and insert the blocks between the halves.
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
    },
    COMMAND_PRIORITY_LOW
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
    RichTextExtension,
    HistoryExtension,
    listExtension,
    CheckListExtension,
    listTabIndentationExtension,
    LinkExtension,
    CodeExtension,
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
