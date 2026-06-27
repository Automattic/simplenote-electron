import { useLayoutEffect, useRef, type RefObject } from 'react';
import { $getRoot, defineExtension, type LexicalEditor } from 'lexical';

import {
  clearNotePositions,
  getNotePosition,
  getNoteViewState,
  setNoteViewState,
  type NoteViewState,
} from '../utils/note-scroll-position';
import {
  $captureMarkdownViewSelection,
  $restoreMarkdownViewSelection,
  type MarkdownViewSelectionSnapshot,
} from './import-export';
import { restoreScrollPosition } from './scroll-memory';

export function getRestoreScrollTop(saved: NoteViewState | null): number {
  if (!saved) {
    return 0;
  }

  return saved.scrollTop;
}

function savedViewSelection(
  saved: NoteViewState | null
): MarkdownViewSelectionSnapshot | null {
  if (!saved?.structuredSelection) {
    return null;
  }

  return {
    structuredSelection: saved.structuredSelection,
    localMarkdown: saved.localMarkdown ?? '',
    localTexts: saved.localTexts ?? { anchor: null, focus: null },
  };
}

/** Phase A: restore caret in the same update as markdown import. */
export function $restoreSavedMarkdownSelection(
  noteId: string,
  markdown: string
): void {
  const snapshot = savedViewSelection(getNoteViewState(noteId));

  if (snapshot && $restoreMarkdownViewSelection(markdown, snapshot)) {
    return;
  }

  $getRoot().selectStart();
}

export function saveNoteViewStateForEditor(
  editor: LexicalEditor,
  noteId: string,
  scrollTop: number
): void {
  if (!noteId) {
    return;
  }

  try {
    editor.read(() => {
      const selection = $captureMarkdownViewSelection();
      setNoteViewState(noteId, {
        scrollTop,
        structuredSelection: selection?.structuredSelection,
        localMarkdown: selection?.localMarkdown,
        localTexts: selection?.localTexts,
      });
    });
  } catch {
    setNoteViewState(noteId, { scrollTop });
  }
}

/** Updates scroll only, preserving any saved selection snapshot. */
export function saveNoteScrollTop(noteId: string, scrollTop: number): void {
  if (!noteId) {
    return;
  }

  const existing = getNoteViewState(noteId);
  if (existing?.structuredSelection) {
    setNoteViewState(noteId, { ...existing, scrollTop });
    return;
  }

  setNoteViewState(noteId, { scrollTop });
}

/**
 * Saves scroll + caret when Lexical disposes the editor on note switch.
 */
export function createNoteViewMemoryExtension(
  noteId: string,
  getScrollTop: () => number
) {
  return defineExtension({
    name: '@simplenote/note-view-memory',
    register(editor) {
      return () => {
        saveNoteViewStateForEditor(editor, noteId, getScrollTop());
      };
    },
  });
}

/** Keeps scrollTopRef in sync; writes scrollTop to sessionStorage on scroll. */
export function useNoteViewScrollTracking({
  noteId,
  scrollContainerRef,
}: {
  noteId: string;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}): RefObject<number> {
  const scrollTopRef = useRef(0);

  useLayoutEffect(() => {
    const shell = scrollContainerRef?.current;
    if (!shell) {
      return;
    }

    scrollTopRef.current = shell.scrollTop;

    let frame = 0;
    const onScroll = () => {
      scrollTopRef.current = shell.scrollTop;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        saveNoteScrollTop(noteId, scrollTopRef.current);
      });
    };

    shell.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      shell.removeEventListener('scroll', onScroll);
    };
  }, [noteId, scrollContainerRef]);

  return scrollTopRef;
}

/** Restores scroll after import + caret init. */
export function NoteViewMemoryRestorePlugin({
  noteId,
  scrollContainerRef,
}: {
  noteId: string;
  scrollContainerRef: RefObject<HTMLElement | null>;
}): null {
  useLayoutEffect(() => {
    const shell = scrollContainerRef.current;
    if (!shell) {
      return;
    }

    const saved = getNoteViewState(noteId);
    const scrollTop =
      getRestoreScrollTop(saved) || getNotePosition(noteId) || 0;

    return restoreScrollPosition(shell, scrollTop);
  }, [noteId, scrollContainerRef]);

  return null;
}

export function useNoteViewMemory({
  shellRef,
  noteId,
}: {
  shellRef: RefObject<HTMLElement | null>;
  noteId: string;
}): void {
  useLayoutEffect(() => {
    window.addEventListener('resize', clearNotePositions);
    return () => window.removeEventListener('resize', clearNotePositions);
  }, []);
}
