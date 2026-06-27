import { useLayoutEffect, useRef, type RefObject } from 'react';
import {
  $getRoot,
  defineExtension,
  SKIP_SCROLL_INTO_VIEW_TAG,
  type LexicalEditor,
} from 'lexical';

import {
  clearNotePositions,
  getNotePosition,
  getNoteViewState,
  setNoteViewState,
  type NoteViewState,
} from '../utils/note-scroll-position';
import {
  $captureMarkdownViewSelection,
  $exportMarkdownString,
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
        editor.update(
          () => {
            if (!$restoreMarkdownViewSelection(markdown, snapshot)) {
              $getRoot().selectStart();
            }
          },
          { discrete: true, tag: SKIP_SCROLL_INTO_VIEW_TAG }
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

export function useNoteViewMemory({
  shellRef,
  noteId,
}: {
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
      getRestoreScrollTop(saved) || getNotePosition(noteId) || 0;

    return restoreScrollPosition(shell, scrollTop);
  }, [shellRef, noteId]);

  // Save scroll on unmount from the live shell, matching the old useScrollMemory
  // path. Lexical dispose also saves, but programmatic scrolls (remote sync,
  // caret into view) may not update scrollTopRef without a scroll event.
  useLayoutEffect(() => {
    return () => {
      const shell = shellRef.current;
      if (shell) {
        saveNoteScrollTop(noteId, shell.scrollTop);
      }
    };
  }, [shellRef, noteId]);

  useLayoutEffect(() => {
    window.addEventListener('resize', clearNotePositions);
    return () => window.removeEventListener('resize', clearNotePositions);
  }, []);
}
