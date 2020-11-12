import React, { FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import { checkboxRegex } from '../../utils/task-transform';
import renderToNode from '../../note-detail/render-to-node';
import { viewExternalUrl } from '../../utils/url-utils';
import { withCheckboxCharacters } from '../../utils/task-transform';

import actions from '../../state/actions';

import * as S from '../../state';
import * as T from '../../types';

type OwnProps = {
  noteId: T.EntityId;
  note?: T.Note;
};

type StateProps = {
  isFocused: boolean;
  note: T.Note | null;
  noteId: T.EntityId | null;
  notes: Map<T.EntityId, T.Note>;
  searchQuery: string;
  showRenderedView: boolean;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
  openNote: (noteId: T.EntityId) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const NotePreview: FunctionComponent<Props> = ({
  editNote,
  isFocused,
  note,
  noteId,
  notes,
  openNote,
  searchQuery,
  showRenderedView,
}) => {
  const previewNode = useRef<HTMLDivElement>();
  useEffect(() => {
    const copyRenderedNote = (event: ClipboardEvent) => {
      if (!isFocused) {
        return true;
      }

      // Only copy the rendered content if nothing is selected
      if (!document.getSelection().isCollapsed) {
        return true;
      }

      const div = document.createElement('div');
      renderToNode(div, note.content, searchQuery).then(() => {
        try {
          // this works in Chrome and Safari but not Firefox
          event.clipboardData.setData('text/plain', div.innerHTML);
        } catch (DOMException) {
          // try it the Firefox way - this works in Firefox and Chrome
          navigator.clipboard.writeText(div.innerHTML);
        }
      });

      event.preventDefault();
    };

    document.addEventListener('copy', copyRenderedNote, false);
    return () => document.removeEventListener('copy', copyRenderedNote, false);
  }, [isFocused, searchQuery]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      for (let node = event.target; node !== null; node = node.parentNode) {
        if (node.tagName === 'A') {
          event.preventDefault();
          event.stopPropagation();

          const tag = node as HTMLAnchorElement;

          // Intercept internal links
          if (tag.href.startsWith('simplenote://note/')) {
            const match = /^simplenote:\/\/note\/(.+)$/.exec(tag.href);
            if (!match) {
              return;
            }

            const [fullMatch, linkedNoteId] = match;
            // if we try to open a note that doesn't exist in local state,
            // then we annoyingly close the open note without opening anything else
            // implicit else: links that aren't openable will just do nothing
            if (notes.has(linkedNoteId as T.EntityId)) {
              openNote(linkedNoteId as T.EntityId);
            }
            return;
          }

          // skip internal note links (e.g. anchor links, footnotes)
          if (!tag.href.startsWith('http://localhost')) {
            viewExternalUrl(tag.href);
          }

          return;
        }

        if (node.className === 'task-list-item') {
          event.preventDefault();
          event.stopPropagation();

          const allTasks = previewNode!.current.querySelectorAll(
            '[data-markdown-root] .task-list-item'
          );
          const taskIndex = Array.prototype.indexOf.call(allTasks, node);

          let matchCount = 0;
          const content = note.content.replace(
            checkboxRegex,
            (match, prespace, inside, postspace) => {
              const newCheckbox =
                matchCount++ === taskIndex
                  ? inside === ' '
                    ? '- [x]'
                    : '- [ ]'
                  : inside === ' '
                  ? '- [ ]'
                  : '- [x]';
              return prespace + newCheckbox + postspace;
            }
          );

          editNote(noteId, { content });
          return;
        }
      }
    };
    previewNode.current?.addEventListener('click', handleClick, true);
    return () =>
      previewNode.current?.removeEventListener('click', handleClick, true);
  }, [note.content]);

  useEffect(() => {
    if (!previewNode.current) {
      return;
    }
    if (note?.content && showRenderedView) {
      renderToNode(previewNode.current, note!.content, searchQuery);
    } else {
      previewNode.current.innerText = withCheckboxCharacters(
        note?.content ?? ''
      );
    }
  }, [note?.content, searchQuery, showRenderedView]);

  return (
    <div className="note-detail-wrapper">
      <div className="note-detail note-detail-preview">
        <div
          ref={previewNode}
          className="note-detail-markdown theme-color-bg theme-color-fg"
          data-markdown-root
        >
          <div style={{ whiteSpace: 'pre' }}>
            {!showRenderedView && withCheckboxCharacters(note?.content ?? '')}
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => {
  const noteId = props.noteId ?? state.ui.openedNote;
  const note = props.note ?? state.data.notes.get(noteId);

  return {
    isFocused: state.ui.dialogs.length === 0 && !state.ui.showNoteInfo,
    note,
    noteId,
    notes: state.data.notes,
    searchQuery: state.ui.searchQuery,
    showRenderedView:
      !!note?.systemTags.includes('markdown') && !state.ui.editMode,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
  openNote: actions.ui.selectNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotePreview);
