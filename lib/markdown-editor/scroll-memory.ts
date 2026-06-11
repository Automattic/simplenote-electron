import { useLayoutEffect, type RefObject } from 'react';

import {
  clearNotePositions,
  getNotePosition,
  setNotePosition,
} from '../utils/note-scroll-position';

/**
 * Remembers the scroll position of the markdown editor shell per note,
 * sharing storage with the Monaco editor (lib/utils/note-scroll-position.ts).
 *
 * Uses layout effects throughout: passive-effect cleanups run after React
 * detaches refs on unmount, so a useEffect-based save would always read null.
 */
export function useScrollMemory(
  shellRef: RefObject<HTMLElement | null>,
  noteId: string
): void {
  // Save on unmount. NoteDetail keys the editor by note id, so switching
  // notes remounts the component and lands here.
  useLayoutEffect(() => {
    return () => {
      const shell = shellRef.current;
      if (shell) {
        setNotePosition(noteId, shell.scrollTop);
      }
    };
  }, [shellRef, noteId]);

  // Restore on mount. Lexical reconciles the initial note content
  // synchronously when ContentEditable attaches the root element (a child
  // layout effect, which runs before this one), so a direct assignment
  // usually succeeds. If it gets clamped — content not fully laid out yet,
  // or replaced by a remote sync — wait for the content to grow instead of
  // guessing with a timer.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    // Always assert a position, defaulting to the top: attaching the editor
    // can scroll the caret into view before this effect runs, so even
    // "nothing saved" needs an explicit reset.
    const position = getNotePosition(noteId) || 0;

    // scrollTop assignments round to device pixels, so an exact read-back
    // comparison would misreport a successful restore as a clamp.
    shell.scrollTop = position;
    if (Math.abs(shell.scrollTop - position) < 1) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (shell.scrollHeight - shell.clientHeight >= position) {
        shell.scrollTop = position;
        observer.disconnect();
      }
    });
    // Observe the element that actually grows with content; the wrapper
    // (.lexical-md-editor) is pinned to the shell's height by
    // `.note-detail-markdown { height: 100% }` and never resizes.
    observer.observe(
      shell.querySelector('.lexical-md-editor__input') ??
        shell.firstElementChild ??
        shell
    );

    // The user scrolling means they took over; never yank the position
    // out from under them.
    const cancel = () => observer.disconnect();
    shell.addEventListener('wheel', cancel, { once: true, passive: true });
    shell.addEventListener('touchstart', cancel, {
      once: true,
      passive: true,
    });

    return () => {
      observer.disconnect();
      shell.removeEventListener('wheel', cancel);
      shell.removeEventListener('touchstart', cancel);
    };
  }, [shellRef, noteId]);

  // Stored positions are layout-dependent; resizing invalidates them all.
  // Mirrors the Monaco editor's behavior.
  useLayoutEffect(() => {
    window.addEventListener('resize', clearNotePositions);
    return () => window.removeEventListener('resize', clearNotePositions);
  }, []);
}
