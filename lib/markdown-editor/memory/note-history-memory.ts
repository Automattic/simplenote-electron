// Undo/redo history per note for the current app session.
//
// Lexical HistoryState holds { editor, editorState } entries. On note switch the
// editor disposes but the Map retains stacks. Remount must:
//   1. rebind entry.editor in register() BEFORE InitialStateExtension imports
//      markdown (so bootstrap sees isSameEditor === true).
//   2. import markdown with HISTORY_MERGE_TAG (see InitialStateExtension config)
//      so bootstrap replaces current without pushing a spurious undo step.
//   3. reconcile stacks in afterRegistration once the document is loaded.
//
// markdownAtLeave invalidates stacks when content diverges (remote sync while
// away). Remote apply while open clears via pipeline.ts.

import { createEmptyHistoryState, type HistoryState } from '@lexical/history';
import {
  CLEAR_HISTORY_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  defineExtension,
  type LexicalEditor,
} from 'lexical';

import { withCheckboxSyntax } from '../../utils/task-transform';
import { $exportMarkdownString } from '../markdown/import-export';

type NoteHistoryBundle = {
  historyState: HistoryState;
  markdownAtLeave: string | null;
};

const noteHistoryById = new Map<string, NoteHistoryBundle>();

function normalizeMarkdown(markdown: string): string {
  return withCheckboxSyntax(markdown);
}

function getOrCreateBundle(noteId: string): NoteHistoryBundle {
  let bundle = noteHistoryById.get(noteId);
  if (!bundle) {
    bundle = {
      historyState: createEmptyHistoryState(),
      markdownAtLeave: null,
    };
    noteHistoryById.set(noteId, bundle);
  }
  return bundle;
}

export function getOrCreateNoteHistoryState(noteId: string): HistoryState {
  return getOrCreateBundle(noteId).historyState;
}

export function rebindHistoryState(
  historyState: HistoryState,
  editor: LexicalEditor
): void {
  if (historyState.current) {
    historyState.current.editor = editor;
  }
  for (const entry of historyState.undoStack) {
    entry.editor = editor;
  }
  for (const entry of historyState.redoStack) {
    entry.editor = editor;
  }
}

export function clearHistoryState(historyState: HistoryState): void {
  historyState.undoStack = [];
  historyState.redoStack = [];
  historyState.current = null;
}

export function clearNoteHistory(noteId: string): void {
  noteHistoryById.delete(noteId);
}

export function saveNoteHistoryOnDispose(
  editor: LexicalEditor,
  noteId: string
): void {
  const bundle = getOrCreateBundle(noteId);
  try {
    bundle.markdownAtLeave = normalizeMarkdown(
      editor.read(() => $exportMarkdownString())
    );
  } catch {
    // Export can fail during teardown; do not keep a stale snapshot or the next
    // open may treat a normal store update as external divergence.
    bundle.markdownAtLeave = null;
  }
}

export function syncHistoryCommandState(
  editor: LexicalEditor,
  historyState: HistoryState
): void {
  editor.dispatchCommand(CAN_UNDO_COMMAND, historyState.undoStack.length > 0);
  editor.dispatchCommand(CAN_REDO_COMMAND, historyState.redoStack.length > 0);
}

export function prepareNoteHistoryAfterBootstrap(
  editor: LexicalEditor,
  noteId: string,
  incomingMarkdown: string
): void {
  const bundle = getOrCreateBundle(noteId);
  const normalizedIncoming = normalizeMarkdown(incomingMarkdown);

  rebindHistoryState(bundle.historyState, editor);

  if (
    bundle.markdownAtLeave !== null &&
    bundle.markdownAtLeave !== normalizedIncoming
  ) {
    clearHistoryState(bundle.historyState);
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    bundle.markdownAtLeave = null;
    return;
  }

  bundle.historyState.current = {
    editor,
    editorState: editor.getEditorState(),
  };

  syncHistoryCommandState(editor, bundle.historyState);
}

export function createNoteHistoryMemoryExtension({
  initialMarkdown,
  noteId,
}: {
  initialMarkdown: string;
  noteId: string;
}) {
  return defineExtension({
    name: '@simplenote/note-history-memory',
    register(editor) {
      rebindHistoryState(getOrCreateNoteHistoryState(noteId), editor);

      return () => {
        saveNoteHistoryOnDispose(editor, noteId);
      };
    },
    afterRegistration(editor) {
      prepareNoteHistoryAfterBootstrap(editor, noteId, initialMarkdown);
      return () => {};
    },
  });
}

export function resetNoteHistoryRegistryForTesting(): void {
  noteHistoryById.clear();
}

export function getNoteHistoryStateForTesting(
  noteId: string
): HistoryState | undefined {
  return noteHistoryById.get(noteId)?.historyState;
}
