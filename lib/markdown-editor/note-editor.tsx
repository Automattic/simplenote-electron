import React, { useCallback, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { $convertToMarkdownString } from '@lexical/markdown';
import type { LexicalEditor } from 'lexical';

import MarkdownEditor, { $importMarkdownString, TRANSFORMERS } from './editor';
import actions from '../state/actions';
import { withCheckboxSyntax } from '../utils/task-transform';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  storeFocusEditor: (focusSetter: () => void) => void;
  storeHasFocus: (focusGetter: () => boolean) => void;
};

type StateProps = {
  noteContent: string;
  noteId: T.EntityId;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => void;
};

type Props = OwnProps & StateProps & DispatchProps;

function MarkdownNoteEditorComponent({
  editNote,
  noteContent,
  noteId,
  storeFocusEditor,
  storeHasFocus,
}: Props) {
  const editorRef = useRef<LexicalEditor | null>(null);
  const lastPushedRef = useRef(withCheckboxSyntax(noteContent));
  const isApplyingRemoteRef = useRef(false);
  const initialMarkdown = withCheckboxSyntax(noteContent);

  useEffect(() => {
    lastPushedRef.current = withCheckboxSyntax(noteContent);
  }, [noteId]);

  useEffect(() => {
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

      isApplyingRemoteRef.current = true;
      editor.update(
        () => {
          $importMarkdownString(remote);
        },
        {
          onUpdate: () => {
            lastPushedRef.current = remote;
            isApplyingRemoteRef.current = false;
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

  const handleChange = useCallback(
    (content: string) => {
      if (isApplyingRemoteRef.current) {
        return;
      }

      if (content === lastPushedRef.current) {
        return;
      }

      lastPushedRef.current = content;
      editNote(noteId, { content });
    },
    [editNote, noteId]
  );

  return (
    <div
      className="note-content-editor-shell"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('.lexical-md-editor__input')) {
          return;
        }

        focusEditor();
      }}
    >
      <MarkdownEditor
        key={noteId}
        className="note-detail-textarea note-detail-markdown"
        editorRef={editorRef}
        initialMarkdown={initialMarkdown}
        noteId={noteId}
        onChange={handleChange}
      />
    </div>
  );
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const noteId = state.ui.openedNote as T.EntityId;
  const note = state.data.notes.get(noteId)!;

  return {
    noteId,
    noteContent: note.content,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
};

export const MarkdownNoteEditor = connect(
  mapStateToProps,
  mapDispatchToProps
)(MarkdownNoteEditorComponent);
