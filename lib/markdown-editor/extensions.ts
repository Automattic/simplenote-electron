import { CodeExtension } from '@lexical/code-core';
import { TabIndentationExtension } from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { LinkExtension } from '@lexical/link';
import {
  $isListItemNode,
  CheckListExtension,
  ListExtension,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
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
  type Transformer,
} from '@lexical/markdown';
import { RichTextExtension } from '@lexical/rich-text';
import {
  configExtension,
  defineExtension,
  type AnyLexicalExtensionArgument,
} from 'lexical';

import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  importMixedNestedListMarkdown,
} from './list-transformers';
import { $createParagraphNode, $getRoot } from 'lexical';

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

export function $importMarkdownString(markdown: string): void {
  const root = $getRoot();
  root.clear();
  importMixedNestedListMarkdown(markdown, root, (chunk, target) => {
    const container = $createParagraphNode();
    target.append(container);
    $convertFromMarkdownString(chunk, MARKDOWN_TRANSFORMERS, container);
    if (container.isAttached() && container.getChildrenSize() === 0) {
      container.remove();
    }
  });
}

export { withMixedNestedListTransformers } from './list-transformers';

const listTabIndentationExtension = configExtension(TabIndentationExtension, {
  $canIndent: (node) => $isListItemNode(node),
});

const listExtension = configExtension(ListExtension, {
  hasStrictIndent: true,
});

const markdownEditorTheme = {
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

function createMarkdownOnChangeExtension(onChange: (markdown: string) => void) {
  return defineExtension({
    name: '@simplenote/markdown-on-change',
    register(editor) {
      return editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          onChange($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
        });
      });
    },
  });
}

export function createMarkdownEditorExtension(
  markdown: string,
  onChange?: (markdown: string) => void
) {
  const dependencies: AnyLexicalExtensionArgument[] = [
    RichTextExtension,
    HistoryExtension,
    listExtension,
    CheckListExtension,
    listTabIndentationExtension,
    LinkExtension,
    CodeExtension,
    MarkdownShortcutExtension,
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
