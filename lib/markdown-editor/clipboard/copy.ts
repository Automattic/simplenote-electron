import {
  ClipboardImportExtension,
  GetClipboardDataExtension,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import { $exportSelectionToMarkdown } from '../markdown/import-export';
import {
  $getEditor,
  $getSelection,
  $isRangeSelection,
  configExtension,
  defineExtension,
  type BaseSelection,
} from 'lexical';

import { wrapLexicalClipboardJsonPrefix } from './clipboard-lexical-json';
import { $shouldAppendTrailingLinebreakToClipboardMarkdown } from './list-clipboard';
import { MARKDOWN_TRANSFORMERS } from '../markdown/transformers';
import { $importMarkdownClipboard } from './paste';
import {
  $getClipboardMarkdownFromDataTransfer,
  $parseSameEditorClipboardJson,
  $shouldPreferMarkdownPasteOverLexicalJson,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
} from './shared';

export const $exportSelectionMarkdown = (
  selection: NonNullable<ReturnType<typeof $getSelection>>
) => {
  let markdown = $exportSelectionToMarkdown(selection, MARKDOWN_TRANSFORMERS);

  // A trailing linebreak keeps pasted list lines as separate items instead of
  // merging with the following line when cut/copy markdown is reused.
  if (
    $isRangeSelection(selection) &&
    $shouldAppendTrailingLinebreakToClipboardMarkdown(selection) &&
    markdown.length > 0 &&
    !markdown.endsWith('\n')
  ) {
    markdown += '\n';
  }

  return markdown;
};

export const $exportSelectionPlainText = (selection: BaseSelection) =>
  selection.getTextContent();

export const MarkdownCopyExtension = defineExtension({
  name: '@simplenote/markdown-copy',
  dependencies: [
    configExtension(GetClipboardDataExtension, {
      $exportMimeType: {
        'text/plain': [
          (selection) =>
            selection ? $exportSelectionMarkdown(selection) : null,
        ],
        // Omit text/markdown on copy: it would duplicate text/plain, and most
        // destinations do not support text/markdown.
        // Prefix Lexical JSON so Cursor IDE ignores it; stripped on import below.
        'application/x-lexical-editor': [
          (selection, next) => {
            if (!selection) {
              return next();
            }
            const json = next();
            return json ? wrapLexicalClipboardJsonPrefix(json) : null;
          },
        ],
      },
    }),
    configExtension(ClipboardImportExtension, {
      priority: {
        [MARKDOWN_CLIPBOARD_MIME_TYPE]: 5,
      },
      $importMimeType: {
        [MARKDOWN_CLIPBOARD_MIME_TYPE]: [
          (markdown, selection, $next) => {
            if ($importMarkdownClipboard(markdown, selection)) {
              return true;
            }
            return $next();
          },
        ],
        'text/html': [
          (_html, selection, $next, dataTransfer) => {
            const clipboardMarkdown =
              $getClipboardMarkdownFromDataTransfer(dataTransfer);
            if (
              !clipboardMarkdown ||
              clipboardMarkdown.source !== 'text/html'
            ) {
              return $next();
            }
            if (
              $importMarkdownClipboard(clipboardMarkdown.markdown, selection)
            ) {
              return true;
            }
            return $next();
          },
        ],
        'application/x-lexical-editor': [
          (_data, selection, $next, dataTransfer) => {
            const clipboardMarkdown =
              $getClipboardMarkdownFromDataTransfer(dataTransfer);
            if (
              clipboardMarkdown &&
              $shouldPreferMarkdownPasteOverLexicalJson(
                clipboardMarkdown.markdown
              )
            ) {
              // Copy puts markdown in text/plain (not text/markdown); import it
              // here when Lexical JSON would lose block structure.
              if (
                $importMarkdownClipboard(clipboardMarkdown.markdown, selection)
              ) {
                return true;
              }
            }

            const nodes = $parseSameEditorClipboardJson(
              $getEditor(),
              dataTransfer
            );
            if (!nodes) {
              return $next();
            }

            $insertGeneratedNodes($getEditor(), nodes, selection);
            return true;
          },
        ],
      },
    }),
  ],
});

export { MARKDOWN_CLIPBOARD_MIME_TYPE } from './shared';
