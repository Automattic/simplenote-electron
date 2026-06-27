import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { connect } from 'react-redux';
import type { LexicalEditor } from 'lexical';

import MarkdownEditor from './editor';
import { useNoteViewMemory } from './memory/note-view-memory';
import { useKeyboardInset } from './hooks/keyboard-inset';
import {
  applyRemoteMarkdownUpdate,
  NoteContentSyncTracker,
} from './markdown/pipeline';
import actions from '../state/actions';
import {
  getNextSearchMatchIndex,
  getPrevSearchMatchIndex,
} from '../search/in-note-search';
import { useInNoteSearchShortcuts } from '../search/use-in-note-search-shortcuts';
import { useElectronEditorCommands } from './hooks/use-electron-editor-commands';
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
  const frameRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const syncTrackerRef = useRef(new NoteContentSyncTracker());
  const matchCountRef = useRef(0);
  const [matchCount, setMatchCount] = useState(0);
  const [editorReady, setEditorReady] = useState(0);
  const previousNoteIdRef = useRef(noteId);
  const previousSearchQueryRef = useRef(searchQuery);
  const initialMarkdown = useMemo(
    () => withCheckboxSyntax(noteContent),
    [noteId]
  );

  useNoteViewMemory({ initialMarkdown, shellRef, noteId });
  useKeyboardInset({ frameRef, shellRef });

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const hasFocus = useCallback(() => {
    const root = editorRef.current?.getRootElement();
    return root?.contains(document.activeElement) ?? false;
  }, []);

  useEffect(() => {
    syncTrackerRef.current.resetForNote(noteContent);
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
    let cancelled = false;

    const cancelRestore = applyRemoteMarkdownUpdate(
      editorRef.current,
      noteContent,
      syncTrackerRef.current,
      {
        editorFocused: hasFocus(),
        isCancelled: () => cancelled,
        scrollShell: shellRef.current,
        scrollTop: shellRef.current?.scrollTop ?? 0,
      }
    );

    return () => {
      cancelled = true;
      cancelRestore();
    };
  }, [noteContent, noteId, hasFocus, editorReady]);

  useEffect(() => {
    storeFocusEditor(focusEditor);
    storeHasFocus(hasFocus);
  }, [focusEditor, hasFocus, storeFocusEditor, storeHasFocus]);

  const handleEditorReady = useCallback(() => {
    setEditorReady((n) => n + 1);
  }, []);

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
      const tracker = syncTrackerRef.current;
      if (tracker.shouldSkipLocalChange(content)) {
        return;
      }

      tracker.recordLocalDispatch(content);
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

  useElectronEditorCommands({
    editorRef,
    matchCount,
    onFindAgain: setNextSearchSelection,
  });

  return (
    <div
      ref={frameRef}
      className="note-content-editor-shell lexical-md-editor-frame"
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
        onEditorReady={handleEditorReady}
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
