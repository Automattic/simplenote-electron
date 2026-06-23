import { mergeRegister } from '@lexical/utils';
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  type LexicalEditor,
} from 'lexical';

import {
  selectionChangedSinceSnapshot,
  type UrlPanelSelectionSnapshot,
} from './url-panel-selection';

type UndoRedoSnapshot = { canRedo: boolean; canUndo: boolean };

let undoRedoSnapshot: UndoRedoSnapshot = { canRedo: false, canUndo: false };
const undoRedoListeners = new Set<(snapshot: UndoRedoSnapshot) => void>();

export function subscribeToolbarUndoRedo(
  listener: (snapshot: UndoRedoSnapshot) => void
): () => void {
  listener(undoRedoSnapshot);
  undoRedoListeners.add(listener);
  return () => {
    undoRedoListeners.delete(listener);
  };
}

type UrlPanelBinding = {
  getSnapshot: () => UrlPanelSelectionSnapshot | null;
  onSelectionChanged: () => void;
};

const urlPanelBindings = new WeakMap<LexicalEditor, UrlPanelBinding>();

export function bindToolbarUrlPanel(
  editor: LexicalEditor,
  binding: UrlPanelBinding
): () => void {
  urlPanelBindings.set(editor, binding);
  return () => {
    urlPanelBindings.delete(editor);
  };
}

export function registerToolbarEditorListeners(
  editor: LexicalEditor
): () => void {
  return mergeRegister(
    editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        undoRedoSnapshot = { ...undoRedoSnapshot, canUndo: payload };
        undoRedoListeners.forEach((listener) => listener(undoRedoSnapshot));
        return false;
      },
      1
    ),
    editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        undoRedoSnapshot = { ...undoRedoSnapshot, canRedo: payload };
        undoRedoListeners.forEach((listener) => listener(undoRedoSnapshot));
        return false;
      },
      1
    ),
    editor.registerUpdateListener(({ editorState }) => {
      const binding = urlPanelBindings.get(editor);
      if (!binding) {
        return;
      }

      const snapshot = binding.getSnapshot();
      if (!snapshot) {
        return;
      }

      if (selectionChangedSinceSnapshot(editorState, snapshot)) {
        binding.onSelectionChanged();
      }
    })
  );
}
