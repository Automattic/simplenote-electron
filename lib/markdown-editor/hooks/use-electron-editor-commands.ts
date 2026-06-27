import { useEffect, type RefObject } from 'react';
import type { LexicalEditor } from 'lexical';

import { copySelectionAsPlainText } from '../clipboard/copy-as-plain-text';
import { redo, selectAll, undo } from '../toolbar/commands';

type Options = {
  editorRef: RefObject<LexicalEditor | null>;
  matchCount: number;
  onFindAgain: () => void;
};

export function useElectronEditorCommands({
  editorRef,
  matchCount,
  onFindAgain,
}: Options): void {
  useEffect(() => {
    const handleEditorCommand = (command: { action: string }) => {
      const editor = editorRef.current;

      switch (command.action) {
        case 'copyAsPlainText':
          if (editor) {
            editor.focus();
            copySelectionAsPlainText(editor);
          }
          return;
        case 'findAgain':
          if (matchCount > 0) {
            onFindAgain();
          }
          return;
        case 'redo':
          if (editor) {
            editor.focus();
            redo(editor);
          }
          return;
        case 'selectAll':
          if (editor) {
            editor.focus();
            selectAll(editor);
          }
          return;
        case 'undo':
          if (editor) {
            editor.focus();
            undo(editor);
          }
          return;
      }
    };

    window.electron?.receive('editorCommand', handleEditorCommand);

    return () => {
      window.electron?.removeListener('editorCommand');
    };
  }, [editorRef, matchCount, onFindAgain]);
}
