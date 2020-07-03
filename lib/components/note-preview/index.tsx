import React, { FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import renderToNode from '../../note-detail/render-to-node';
import { viewExternalUrl } from '../../utils/url-utils';
import actions from '../../state/actions';

import * as S from '../../state';
import * as T from '../../types';

type OwnProps = {
  noteId: T.EntityId;
  note?: T.Note;
};

type StateProps = {
  fontSize: number;
  isDialogOpen: boolean;
  isNoteInfoOpen: boolean;
  note: T.Note | null;
  noteId: T.EntityId | null;
  searchQuery: string;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const NotePreview: FunctionComponent<Props> = ({
  editNote,
  fontSize,
  isDialogOpen,
  isNoteInfoOpen,
  note,
  noteId,
  searchQuery,
}) => {
  const previewNode = useRef<HTMLDivElement>();

  useEffect(() => {
    const copyRenderedNote = (event: ClipboardEvent) => {
      console.log(isNoteInfoOpen);
      // TODO this isn't working - these are false when I log them, but in console they are true
      // e.g. state.ui.showNoteInfo in console will print "true"
      // Only copy if not viewing the note info panel or a dialog
      if (isNoteInfoOpen || isDialogOpen) {
        return true;
      }

      // Only copy the rendered content if nothing is selected
      if (!document.getSelection().isCollapsed) {
        return true;
      }

      const node = document.createDocumentFragment();
      const div = document.createElement('div');
      renderToNode(div, note!.content, searchQuery);
      node.appendChild(div);

      // TODO this is a bug
      console.log(div); // innerHTML shows up here in console
      console.log(div.innerHTML); // innerHTML is now an empty string???????

      event.clipboardData.setData('text/plain', div.innerHTML);
      event.preventDefault();
    };

    document.addEventListener('copy', copyRenderedNote, false);
    return () => document.removeEventListener('copy', copyRenderedNote, false);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      for (let node = event.target; node !== null; node = node.parentNode) {
        if (note.tagName === 'A') {
          event.preventDefault();
          event.stopPropagation();

          // skip internal note links (e.g. anchor links, footnotes)
          if (!node.href.startsWith('http://localhost')) {
            viewExternalUrl(node.href);
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
          const content = note.content.replace(/[\ue000|\ue001]/g, (match) =>
            matchCount++ === taskIndex
              ? match === '\ue000'
                ? '\ue001'
                : '\ue000'
              : match
          );

          editNote(noteId, { content });
          return;
        }
      }
    };
    previewNode.current?.addEventListener('click', handleClick, true);
    return () =>
      previewNode.current?.removeEventListener('click', handleClick, true);
  }, []);

  useEffect(() => {
    if (
      previewNode.current &&
      note?.content &&
      note?.systemTags.includes('markdown')
    ) {
      renderToNode(previewNode.current, note!.content, searchQuery);
    }
  }, [note?.content, note?.systemTags, searchQuery]);

  return (
    <div className="note-detail-wrapper">
      <div className="note-detail">
        <div
          ref={previewNode}
          className="note-detail-markdown theme-color-bg theme-color-fg"
          data-markdown-root
          style={{ fontSize: `${fontSize}px` }}
        >
          <div style={{ whiteSpace: 'pre' }}>{note?.content}</div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => ({
  fontSize: state.settings.fontSize,
  isDialogOpen: state.ui.dialogs.length > 0,
  isNoteInfoOpen: state.ui.showNoteInfo,
  note: props.note ?? state.data.notes.get(props.noteId),
  noteId: props.noteId ?? state.ui.openedNote,
  searchQuery: state.ui.searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotePreview);
