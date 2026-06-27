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

const defaultUndoRedoSnapshot = (): UndoRedoSnapshot => ({
  canRedo: false,
  canUndo: false,
});

const undoRedoSnapshots = new WeakMap<LexicalEditor, UndoRedoSnapshot>();
const undoRedoListeners = new WeakMap<
  LexicalEditor,
  Set<(snapshot: UndoRedoSnapshot) => void>
>();

function getUndoRedoSnapshot(editor: LexicalEditor): UndoRedoSnapshot {
  let snapshot = undoRedoSnapshots.get(editor);
  if (!snapshot) {
    snapshot = defaultUndoRedoSnapshot();
    undoRedoSnapshots.set(editor, snapshot);
  }
  return snapshot;
}

function notifyUndoRedoListeners(
  editor: LexicalEditor,
  snapshot: UndoRedoSnapshot
): void {
  undoRedoListeners.get(editor)?.forEach((listener) => listener(snapshot));
}

export function subscribeToolbarUndoRedo(
  editor: LexicalEditor,
  listener: (snapshot: UndoRedoSnapshot) => void
): () => void {
  listener(getUndoRedoSnapshot(editor));

  let listeners = undoRedoListeners.get(editor);
  if (!listeners) {
    listeners = new Set();
    undoRedoListeners.set(editor, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      undoRedoListeners.delete(editor);
    }
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
        const snapshot = { ...getUndoRedoSnapshot(editor), canUndo: payload };
        undoRedoSnapshots.set(editor, snapshot);
        notifyUndoRedoListeners(editor, snapshot);
        return false;
      },
      1
    ),
    editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        const snapshot = { ...getUndoRedoSnapshot(editor), canRedo: payload };
        undoRedoSnapshots.set(editor, snapshot);
        notifyUndoRedoListeners(editor, snapshot);
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
