import { $getSelection, $isRangeSelection, type LexicalEditor } from 'lexical';

import { $exportSelectionPlainText } from './copy';

export function copySelectionAsPlainText(editor: LexicalEditor): boolean {
  let plainText: string | null = null;

  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      return;
    }

    plainText = $exportSelectionPlainText(selection);
  });

  if (null === plainText || '' === plainText) {
    return false;
  }

  void navigator.clipboard.writeText(plainText);
  return true;
}
