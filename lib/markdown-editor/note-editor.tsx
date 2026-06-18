import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { connect } from 'react-redux';
import { $convertToMarkdownString } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

import MarkdownEditor, { $importMarkdownString, TRANSFORMERS } from './editor';
import { REMOTE_CONTENT_TAG } from './extensions';
import { useScrollMemory } from './scroll-memory';
import actions from '../state/actions';
import {
  getNextSearchMatchIndex,
  getPrevSearchMatchIndex,
} from '../search/in-note-search';
import {
  useElectronFindAgain,
  useInNoteSearchShortcuts,
} from '../search/use-in-note-search-shortcuts';
import { withCheckboxSyntax } from '../utils/task-transform';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  storeFocusEditor: (focusSetter: () => void) => void;
  storeHasFocus: (focusGetter: () => boolean) => void;
};

type StateProps = {
  keyboardShortcuts: boolean;
  noteContent: string;
  noteId: T.EntityId;
  notes: Map<T.EntityId, T.Note>;
  searchQuery: string;
  selectedSearchMatchIndex: number | null;
};

type DispatchProps = {
  clearSearch: () => void;
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => void;
  openNote: (noteId: T.EntityId) => void;
  storeNumberOfMatchesInNote: (matches: number) => void;
  storeSearchSelection: (index: number | null) => void;
};

type Props = OwnProps & StateProps & DispatchProps;

function MarkdownNoteEditorComponent({
  clearSearch,
  editNote,
  keyboardShortcuts,
  noteContent,
  noteId,
  notes,
  openNote,
  searchQuery,
  selectedSearchMatchIndex,
  storeFocusEditor,
  storeHasFocus,
  storeNumberOfMatchesInNote,
  storeSearchSelection,
}: Props) {
  const editorRef = useRef<LexicalEditor | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastPushedRef = useRef(withCheckboxSyntax(noteContent));
  const lastDispatchedRef = useRef<string | null>(null);
  const matchCountRef = useRef(0);
  const [matchCount, setMatchCount] = useState(0);
  const previousNoteIdRef = useRef(noteId);
  const previousSearchQueryRef = useRef(searchQuery);
  const initialMarkdown = useMemo(
    () => withCheckboxSyntax(noteContent),
    [noteId]
  );

  useScrollMemory(shellRef, noteId);

  useEffect(() => {
    lastPushedRef.current = withCheckboxSyntax(noteContent);
    lastDispatchedRef.current = null;
  }, [noteId]);

  useEffect(() => {
    const noteChanged = previousNoteIdRef.current !== noteId;
    const searchChanged = previousSearchQueryRef.current !== searchQuery;

    if (noteChanged || searchChanged) {
      storeSearchSelection(null);
    }

    previousNoteIdRef.current = noteId;
    previousSearchQueryRef.current = searchQuery;
  }, [noteId, searchQuery, storeSearchSelection]);

  useEffect(() => {
    if ('' === searchQuery) {
      storeNumberOfMatchesInNote(0);
      matchCountRef.current = 0;
      setMatchCount(0);
    }
  }, [searchQuery, storeNumberOfMatchesInNote]);

  useEffect(() => {
    if (noteContent === lastDispatchedRef.current) {
      return;
    }

    const remote = withCheckboxSyntax(noteContent);

    if (remote === lastPushedRef.current) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    let cancelled = false;

    editor.getEditorState().read(() => {
      if (cancelled) {
        return;
      }

      const local = $convertToMarkdownString(TRANSFORMERS);
      if (remote === local) {
        lastPushedRef.current = remote;
        return;
      }

      editor.update(
        () => {
          $importMarkdownString(remote);
        },
        {
          tag: REMOTE_CONTENT_TAG,
          onUpdate: () => {
            lastPushedRef.current = remote;
          },
        }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [noteContent, noteId]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const hasFocus = useCallback(() => {
    const root = editorRef.current?.getRootElement();
    return root?.contains(document.activeElement) ?? false;
  }, []);

  useEffect(() => {
    storeFocusEditor(focusEditor);
    storeHasFocus(hasFocus);
  }, [focusEditor, hasFocus, storeFocusEditor, storeHasFocus]);

  const handleOpenInternalLink = useCallback(
    (linkedNoteId: T.EntityId) => {
      if (notes.has(linkedNoteId)) {
        openNote(linkedNoteId);
      }
    },
    [notes, openNote]
  );

  const handleChange = useCallback(
    (content: string) => {
      if (content === lastPushedRef.current) {
        return;
      }

      lastPushedRef.current = content;
      lastDispatchedRef.current = content;
      editNote(noteId, { content });
    },
    [editNote, noteId]
  );

  const handleMatchCountChange = useCallback(
    (count: number) => {
      matchCountRef.current = count;
      setMatchCount(count);
      storeNumberOfMatchesInNote(count);
    },
    [storeNumberOfMatchesInNote]
  );

  const setNextSearchSelection = useCallback(() => {
    const total = matchCountRef.current;
    if (0 === total) {
      return;
    }

    const newIndex = getNextSearchMatchIndex(selectedSearchMatchIndex, total);
    storeSearchSelection(newIndex);
    focusEditor();
  }, [focusEditor, selectedSearchMatchIndex, storeSearchSelection]);

  const setPrevSearchSelection = useCallback(() => {
    const total = matchCountRef.current;
    if (0 === total) {
      return;
    }

    const newIndex = getPrevSearchMatchIndex(selectedSearchMatchIndex, total);
    storeSearchSelection(newIndex);
    focusEditor();
  }, [focusEditor, selectedSearchMatchIndex, storeSearchSelection]);

  useInNoteSearchShortcuts({
    enabled: keyboardShortcuts,
    matchCount,
    onNext: setNextSearchSelection,
    onPrev: setPrevSearchSelection,
  });

  useElectronFindAgain(setNextSearchSelection, matchCount);

  return (
    <div
      ref={shellRef}
      className="note-content-editor-shell lexical-md-editor-shell"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.closest('.lexical-md-editor__input') ||
          target.closest('.markdown-editor-toolbar')
        ) {
          return;
        }

        focusEditor();
      }}
    >
      <MarkdownEditor
        key={noteId}
        className="note-detail-textarea note-detail-markdown"
        clearSearch={clearSearch}
        editorRef={editorRef}
        initialMarkdown={initialMarkdown}
        noteId={noteId}
        onChange={handleChange}
        onMatchCountChange={handleMatchCountChange}
        onOpenInternalLink={handleOpenInternalLink}
        scrollContainerRef={shellRef}
        searchQuery={searchQuery}
        selectedSearchMatchIndex={selectedSearchMatchIndex}
      />
    </div>
  );
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const noteId = state.ui.openedNote as T.EntityId;
  const note = state.data.notes.get(noteId)!;

  return {
    keyboardShortcuts: state.settings.keyboardShortcuts,
    noteId,
    noteContent: note.content,
    notes: state.data.notes,
    searchQuery: state.ui.searchQuery,
    selectedSearchMatchIndex: state.ui.selectedSearchMatchIndex,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  clearSearch: () => actions.ui.search(''),
  editNote: actions.data.editNote,
  openNote: actions.ui.selectNote,
  storeNumberOfMatchesInNote: (matches) => ({
    type: 'STORE_NUMBER_OF_MATCHES_IN_NOTE',
    matches,
  }),
  storeSearchSelection: (index) => ({
    type: 'STORE_SEARCH_SELECTION',
    index,
  }),
};

export const MarkdownNoteEditor = connect(
  mapStateToProps,
  mapDispatchToProps
)(MarkdownNoteEditorComponent);
