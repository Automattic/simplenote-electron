import {
  ClipboardImportExtension,
  GetClipboardDataExtension,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import { $convertSelectionToMarkdownString } from '@lexical/markdown';
import {
  $getEditor,
  $getSelection,
  $isRangeSelection,
  configExtension,
  defineExtension,
} from 'lexical';

import { wrapLexicalClipboardJsonPrefix } from '../clipboard-lexical-json';
import { $shouldAppendTrailingLinebreakToClipboardMarkdown } from '../list-deletion';
import { MARKDOWN_TRANSFORMERS } from '../transformers';
import {
  $getClipboardMarkdownFromDataTransfer,
  $parseSameEditorClipboardJson,
  $shouldPreferMarkdownPasteOverLexicalJson,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
} from './shared';

const $exportSelectionMarkdown = (
  selection: NonNullable<ReturnType<typeof $getSelection>>
) => {
  let markdown = $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');

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

export const MarkdownCopyExtension = defineExtension({
  name: '@simplenote/markdown-copy',
  dependencies: [
    configExtension(GetClipboardDataExtension, {
      $exportMimeType: {
        [MARKDOWN_CLIPBOARD_MIME_TYPE]: [
          (selection) =>
            selection ? $exportSelectionMarkdown(selection) : null,
        ],
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
      $importMimeType: {
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
              return false;
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
