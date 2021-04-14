import React, { Component } from 'react';
import { connect } from 'react-redux';

import NotePreview from '../components/note-preview';
import TagChip from '../components/tag-chip';
import RevisionSelector from '../revision-selector';
import { noteCanonicalTags } from '../state/selectors';
import isEmailTag from '../utils/is-email-tag';
import { tagHashOf } from '../utils/tag-hash';

import type * as S from '../state';
import type * as T from '../types';

type StateProps = {
  allTags: Map<T.TagHash, T.Tag>;
  note: T.Note | undefined;
  noteCanonicalTags: T.TagName[];
  noteId: T.EntityId | null;
  revision: T.Note | undefined;
  revisionIndex: number;
  revisions: Map<number, T.Note> | undefined;
};

type DispatchProps = {
  cancelRevision: () => any;
  openRevision: (noteId: T.EntityId, version: number) => any;
  restoreRevision: (noteId: T.EntityId, note: T.Note) => any;
};

type Props = StateProps &
  DispatchProps &
  Pick<React.HTMLProps<HTMLDivElement>, 'aria-hidden'>;

type State = {
  includeDeletedTags: boolean;
};

export class NoteRevisions extends Component<Props, State> {
  static displayName = 'NoteRevisions';

  state: State = {
    includeDeletedTags: true,
  };

  getTags() {
    return this.props.noteCanonicalTags
      .map((tagName) => {
        const tagHash = tagHashOf(tagName);
        return { name: tagName, deleted: !this.props.allTags.has(tagHash) };
      })
      .filter((tag) => {
        return this.state.includeDeletedTags || !tag.deleted;
      });
  }

  onAcceptRevision = () => {
    const { noteId, note, revision, restoreRevision } = this.props;

    if (!noteId || !note || !revision) {
      return;
    }

    const noteEmailTags = note.tags.filter((tagName) => isEmailTag(tagName));
    const revisionCanonicalTags = this.getTags().map(({ name }) => name);

    restoreRevision(noteId, {
      ...revision,
      tags: [...noteEmailTags, ...revisionCanonicalTags],
      systemTags: note.systemTags,
    });
  };

  onSelectRevision = (revisionIndex: number) => {
    const { noteId, revisions, openRevision } = this.props;

    if (!noteId || !revisions) {
      return;
    }

    const revision = [...revisions.keys()][revisionIndex];

    openRevision(noteId, revision);
  };

  renderTags() {
    const tags = this.getTags();

    return (
      <div className="tags">
        {tags.map(({ name, deleted }) => (
          <TagChip
            key={name}
            tagName={name}
            interactive={false}
            deleted={deleted}
          />
        ))}
      </div>
    );
  }

  render() {
    const {
      'aria-hidden': ariaHidden,
      cancelRevision,
      noteId,
      revision,
      revisionIndex,
      revisions,
    } = this.props;

    if (!noteId || !revisions) {
      return null;
    }

    return (
      <div className="note-revisions">
        <div aria-hidden={ariaHidden} className="note-revision-preview">
          <NotePreview noteId={noteId} note={revision} />
          {this.renderTags()}
        </div>
        <RevisionSelector
          onAccept={this.onAcceptRevision}
          onCancel={cancelRevision}
          onSelect={this.onSelectRevision}
          onToggleRestoreDeletedTags={(toggled) =>
            this.setState({ includeDeletedTags: toggled })
          }
          restoreDeletedTags={this.state.includeDeletedTags}
          revision={revision}
          revisionsSize={revisions.size}
          selectedIndex={revisionIndex}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const noteId = state.ui.openedNote;
  const note = noteId ? state.data.notes.get(noteId) : undefined;
  const revisions = noteId ? state.data.noteRevisions.get(noteId) : undefined;

  const openedRevision =
    state.ui.openedRevision?.[0] === state.ui.openedNote
      ? state.ui.openedRevision?.[1] ?? null
      : null;
  const revision = openedRevision ? revisions?.get(openedRevision) : note;
  const revisionIndex =
    openedRevision && revisions
      ? [...revisions.keys()].indexOf(openedRevision)
      : -1;

  return {
    allTags: state.data.tags,
    note,
    noteCanonicalTags: revision ? noteCanonicalTags(state, revision) : [],
    noteId,
    revision,
    revisionIndex,
    revisions,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openRevision: (noteId, version) => ({
    type: 'OPEN_REVISION',
    noteId,
    version,
  }),
  cancelRevision: () => ({
    type: 'CLOSE_REVISION',
  }),
  restoreRevision: (noteId, note) => ({
    type: 'RESTORE_NOTE_REVISION',
    noteId,
    note,
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteRevisions);
