import React, { Component } from 'react';
import { connect } from 'react-redux';
import { negate } from 'lodash';

import NotePreview from '../components/note-preview';
import TagChip from '../components/tag-chip';
import isEmailTag from '../utils/is-email-tag';
import { tagHashOf } from '../utils/tag-hash';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId;
  note?: T.Note;
};

type StateProps = {
  allTags: Map<T.TagHash, T.Tag>;
  noteId: T.EntityId | null;
  note: T.Note | null;
};

type Props = OwnProps & StateProps;

export class NoteRevisions extends Component<Props> {
  static displayName = 'NoteRevisions';

  getTagName = (tag: T.TagName) => {
    const { allTags } = this.props;
    return allTags.get(tagHashOf(tag))?.name;
  };

  render() {
    const { note, noteId } = this.props;

    return (
      <div className="note-revisions">
        <NotePreview noteId={noteId} note={note} />
        <div className="tags">
          {note?.tags.filter(negate(isEmailTag)).map((tag) => (
            <TagChip
              key={tag}
              tagName={this.getTagName(tag)}
              interactive={false}
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
    allTags: state.data.tags,
    noteId,
    note,
  };
};

export default connect(mapStateToProps)(NoteRevisions);
