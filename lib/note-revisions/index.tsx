import React, { Component } from 'react';
import { connect } from 'react-redux';

import NotePreview from '../components/note-preview';
import TagChip from '../components/tag-chip';
import { noteTags } from '../state/selectors';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId;
  note?: T.Note;
};

type StateProps = {
  tags: Map<T.TagHash, T.Tag>;
  noteId: T.EntityId | null;
  note: T.Note | null;
};

type Props = OwnProps & StateProps;

export class NoteRevisions extends Component<Props> {
  static displayName = 'NoteRevisions';

  render() {
    const { note, noteId, tags } = this.props;

    return (
      <div className="note-revisions">
        <NotePreview noteId={noteId} note={note} />
        <div className="tags">
          {[...tags.entries()].map(([tagHash, tag]) => (
            <TagChip
              key={tagHash}
              tagName={tag.name}
              interactive={false}
              deleted={tag.deleted}
            />
          ))}
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => {
  const noteId = props.noteId ?? state.ui.openedNote;
  const note = props.note ?? state.data.notes.get(noteId);

  return {
    tags: noteTags(state, note),
    noteId,
    note,
  };
};

export default connect(mapStateToProps)(NoteRevisions);
