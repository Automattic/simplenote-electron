import React, { Component } from 'react';
import { connect } from 'react-redux';

import NotePreview from '../components/note-preview';
import TagChip from '../components/tag-chip';
import { noteCanonicalTags } from '../state/selectors';
import { tagHashOf } from '../utils/tag-hash';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId;
  note?: T.Note;
};

type StateProps = {
  tags: Array<{ name: T.TagName; deleted: boolean }>;
  noteId: T.EntityId | null;
  note: T.Note | null;
};

type Props = OwnProps &
  StateProps &
  Pick<React.HTMLProps<HTMLDivElement>, 'aria-hidden'>;

export class NoteRevisions extends Component<Props> {
  static displayName = 'NoteRevisions';

  render() {
    const { note, noteId, tags, 'aria-hidden': ariaHidden } = this.props;

    return (
      <div aria-hidden={ariaHidden} className="note-revisions">
        <NotePreview noteId={noteId} note={note} />
        <div className="note-revisions-tag-list">
          {tags.map(({ name, deleted }) => (
            <TagChip
              key={name}
              tagName={name}
              interactive={false}
              deleted={deleted}
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
  const restoreDeletedTags = state.ui.restoreDeletedTags;

  const tags = noteCanonicalTags(state, note)
    .map((tagName) => {
      const tagHash = tagHashOf(tagName);
      return { name: tagName, deleted: !state.data.tags.has(tagHash) };
    })
    .filter((tag) => {
      return restoreDeletedTags || !tag.deleted;
    });

  return {
    tags,
    noteId,
    note,
  };
};

export default connect(mapStateToProps)(NoteRevisions);
