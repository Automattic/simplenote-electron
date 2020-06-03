import React, { FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import renderToNode from '../../note-detail/render-to-node';
import { viewExternalUrl } from '../../utils/url-utils';
import actions from '../../state/actions';

import * as S from '../../state';
import * as T from '../../types';

type OwnProps = {
  noteId: T.EntityId;
};

type StateProps = {
  fontSize: number;
  note: T.Note | null;
  noteId: T.EntityId | null;
  searchQuery: string;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
};

type Props = OwnProps & StateProps;

export const NotePreview: FunctionComponent<Props> = ({
  editNote,
  fontSize,
  note,
  noteId,
  searchQuery,
}) => {
  const previewNode = useRef<HTMLDivElement>();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      for (let node = event.target; node !== null; node = node.parentNode) {
        if (note.tagName === 'A') {
          event.preventDefault();
          event.stopPropagation();

          viewExternalUrl(node.href);

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
    if (previewNode.current && note?.content) {
      renderToNode(previewNode.current, note!.content, searchQuery);
    }
  }, [note?.content, searchQuery]);

  return (
    <div className="note-detail-wrapper">
      <div className="note-detail">
        <div
          ref={previewNode}
          className="note-detail-markdown theme-color-bg theme-color-fg"
          data-markdown-root
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => ({
  fontSize: state.settings.fontSize,
  note: state.data.notes.get(props.noteId),
  noteId: state.ui.openedNote,
  searchQuery: state.ui.searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NotePreview);
