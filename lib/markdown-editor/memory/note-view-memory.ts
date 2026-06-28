// View memory: scroll + structured caret per note in sessionStorage.
//
// Restore order (do not relocate):
//   Phase A — createNoteViewMemoryExtension root listener restores caret
//             with SKIP_SCROLL_INTO_VIEW_TAG.
//   Phase B — useNoteViewMemory layout effect restores scroll after Phase A.
//
// Save paths (three writers):
//   1. useNoteViewScrollTracking — scroll events → saveNoteScrollTop
//   2. useNoteViewMemory unmount — live shell scrollTop (programmatic scrolls)
//   3. extension dispose — full snapshot via saveNoteViewStateForEditor
// On note switch, Lexical dispose (child) runs before parent unmount cleanup.

import { useLayoutEffect, useRef, type RefObject } from 'react';
import {
  $getRoot,
  defineExtension,
  HISTORY_MERGE_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
  type LexicalEditor,
} from 'lexical';

import {
  clearNotePositions,
  getNotePosition,
  getNoteViewState,
  setNoteViewState,
  type NoteViewState,
} from '../../utils/note-scroll-position';
import {
  $captureMarkdownViewSelection,
  $exportMarkdownString,
  $restoreMarkdownViewSelection,
  type MarkdownViewSelectionSnapshot,
} from '../markdown/import-export';
import { restoreScrollPosition } from './scroll-memory';

export function getRestoreScrollTop(
  saved: NoteViewState | null,
  initialMarkdown: string
): number {
  if (!saved) {
    return 0;
  }

  if (
    saved.structuredSelection &&
    saved.localMarkdown !== undefined &&
    saved.localMarkdown !== initialMarkdown
  ) {
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

function isStaleViewSnapshot(
  snapshot: MarkdownViewSelectionSnapshot,
  currentMarkdown: string
): boolean {
  return snapshot.localMarkdown !== currentMarkdown;
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
      const selection = $captureMarkdownViewSelection(editor);
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

export type NoteViewMemoryExtensionOptions = {
  getScrollContainer: () => HTMLElement | null;
  getScrollTop: () => number;
  noteId: string;
};

/**
 * Saves scroll + caret on dispose; restores caret when the root attaches,
 * using SKIP_SCROLL_INTO_VIEW_TAG so DOM sync does not scroll the shell.
 * Scroll is restored separately in useNoteViewMemory after layout.
 */
export function createNoteViewMemoryExtension({
  getScrollTop,
  noteId,
}: NoteViewMemoryExtensionOptions) {
  return defineExtension({
    name: '@simplenote/note-view-memory',
    register(editor) {
      let restored = false;

      const restoreCaretOnce = () => {
        if (restored) {
          return;
        }

        restored = true;

        const snapshot = savedViewSelection(getNoteViewState(noteId));
        if (!snapshot) {
          return;
        }

        const markdown = editor.read(() => $exportMarkdownString());
        if (isStaleViewSnapshot(snapshot, markdown)) {
          return;
        }

        editor.update(
          () => {
            if (!$restoreMarkdownViewSelection(markdown, snapshot)) {
              $getRoot().selectStart();
            }
          },
          {
            discrete: true,
            tag: [SKIP_SCROLL_INTO_VIEW_TAG, HISTORY_MERGE_TAG],
          }
        );
      };

      const unregisterRoot = editor.registerRootListener((root) => {
        if (root) {
          restoreCaretOnce();
        }
      });

      return () => {
        unregisterRoot();
        saveNoteViewStateForEditor(editor, noteId, getScrollTop());
      };
    },
  });
}

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

export function useNoteViewMemory({
  initialMarkdown,
  shellRef,
  noteId,
}: {
  initialMarkdown: string;
  shellRef: RefObject<HTMLElement | null>;
  noteId: string;
}): void {
  // Restore scroll after the editor root attaches and caret restore runs.
  // Layout effects run after ref callbacks, so this wins over any caret
  // scroll-into-view that slipped past SKIP_SCROLL_INTO_VIEW_TAG.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const saved = getNoteViewState(noteId);
    const scrollTop =
      (saved !== null ? getRestoreScrollTop(saved, initialMarkdown) : null) ??
      getNotePosition(noteId) ??
      0;

    return restoreScrollPosition(shell, scrollTop);
  }, [initialMarkdown, shellRef, noteId]);

  // Catch programmatic scrolls that never fire a scroll event. Lexical dispose
  // also saves, but may run before the last caret-into-view scroll settles.
  // Capture shell + noteId at mount: on note switch shellRef already points at
  // the incoming note when cleanup runs, so reading shellRef.current there
  // would overwrite the departing note with the wrong scroll position.
  useLayoutEffect(() => {
    const departingNoteId = noteId;
    const shell = shellRef.current;

    return () => {
      if (shell) {
        saveNoteScrollTop(departingNoteId, shell.scrollTop);
      }
    };
  }, [shellRef, noteId]);

  useLayoutEffect(() => {
    window.addEventListener('resize', clearNotePositions);
    return () => window.removeEventListener('resize', clearNotePositions);
  }, []);
}
