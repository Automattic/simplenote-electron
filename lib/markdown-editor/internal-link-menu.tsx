import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_CRITICAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
} from 'lexical';

import {
  $getSelectionCompletionMatch,
  $insertInternalLink,
  findLinkableNotes,
  registerInternalLinkClick,
  type LinkableNote,
} from './internal-link';

import type * as T from '../types';

type Props = {
  noteId: T.EntityId;
  onOpenNote?: (noteId: T.EntityId) => void;
};

type MenuState = {
  notes: LinkableNote[];
  position: { left: number; top: number };
  selectedIndex: number;
};

function caretPosition(): { left: number; top: number } {
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) {
    return { left: 0, top: 0 };
  }
  const range = domSelection.getRangeAt(0);
  if (typeof range.getBoundingClientRect !== 'function') {
    // jsdom has no layout
    return { left: 0, top: 0 };
  }
  const rect = range.getBoundingClientRect();
  return { left: rect.left, top: rect.bottom };
}

export function InternalLinkPlugin({ noteId, onOpenNote }: Props) {
  const [editor] = useLexicalComposerContext();
  const [menu, setMenu] = useState<MenuState | null>(null);

  const selectNote = useCallback(
    (note: LinkableNote) => {
      editor.update(() => {
        $insertInternalLink(note);
      });
      setMenu(null);
    },
    [editor]
  );

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const match = $getSelectionCompletionMatch();
        const notes = match ? findLinkableNotes(match.query, noteId) : [];
        setMenu(
          notes.length > 0
            ? { notes, position: caretPosition(), selectedIndex: 0 }
            : null
        );
      });
    });
  }, [editor, noteId]);

  useEffect(() => {
    if (!onOpenNote) {
      return;
    }
    return registerInternalLinkClick(editor, onOpenNote);
  }, [editor, onOpenNote]);

  useEffect(() => {
    if (!menu) {
      return;
    }

    const moveSelection = (delta: number) => (event: KeyboardEvent | null) => {
      event?.preventDefault();
      setMenu((current) =>
        current
          ? {
              ...current,
              selectedIndex:
                (current.selectedIndex + delta + current.notes.length) %
                current.notes.length,
            }
          : null
      );
      return true;
    };

    const acceptSelection = (event: KeyboardEvent | null) => {
      event?.preventDefault();
      selectNote(menu.notes[menu.selectedIndex]);
      return true;
    };

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        moveSelection(1),
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        moveSelection(-1),
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        acceptSelection,
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        acceptSelection,
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          setMenu(null);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, menu, selectNote]);

  if (!menu) {
    return null;
  }

  return createPortal(
    <ul
      className="internal-link-suggestions"
      role="listbox"
      style={{ left: menu.position.left, top: menu.position.top }}
    >
      {menu.notes.map((note, index) => (
        <li
          aria-selected={index === menu.selectedIndex}
          className={
            index === menu.selectedIndex
              ? 'internal-link-suggestion is-selected'
              : 'internal-link-suggestion'
          }
          key={note.noteId}
          onMouseDown={(event) => {
            // Keep focus and selection in the editor while clicking.
            event.preventDefault();
            selectNote(note);
          }}
          onMouseEnter={() =>
            setMenu((current) =>
              current ? { ...current, selectedIndex: index } : null
            )
          }
          role="option"
        >
          {note.title}
        </li>
      ))}
    </ul>,
    document.body
  );
}
