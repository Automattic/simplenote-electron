import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import RevisionSelector from '../revision-selector';
import TagChip from '../components/tag-chip';
import {
  buildSourceClipboardPayload,
  writeClipboardPayload,
} from '../utils/clipboard/copy';
import { noteCanonicalTags } from '../state/selectors';
import { tagHashOf } from '../utils/tag-hash';
import { withCheckboxSyntax } from '../utils/task-transform';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  noteId: T.EntityId | null;
  note?: T.Note | null;
};

type StateProps = {
  markdownEnabled: boolean;
  tags: Array<{ name: T.TagName; deleted: boolean }>;
  noteId: T.EntityId | null;
  note: T.Note | null;
};

type DispatchProps = {
  cancelRevision: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class NoteRevisions extends Component<Props> {
  static displayName = 'NoteRevisions';

  revisionContent = createRef<HTMLTextAreaElement>();

  componentDidMount() {
    this.revisionContent.current?.focus();
  }

  handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.props.cancelRevision();
    }
  };

  handleSourceCopy = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const source = event.currentTarget;
    const selectedContent = source.value.slice(
      source.selectionStart,
      source.selectionEnd
    );

    if (!selectedContent || !event.clipboardData) {
      return;
    }

    const didWrite = writeClipboardPayload(
      event.clipboardData,
      buildSourceClipboardPayload(selectedContent, this.props.markdownEnabled)
    );

    if (didWrite) {
      event.preventDefault();
    }
  };

  render() {
    const { note, tags } = this.props;
    const content = withCheckboxSyntax(note?.content ?? '');

    return (
      <section
        aria-label="History"
        className="note-revisions"
        onKeyDown={this.handleKeyDown}
      >
        <textarea
          ref={this.revisionContent}
          aria-label="Revision source"
          className="note-revisions-content"
          onCopy={this.handleSourceCopy}
          readOnly
          spellCheck={false}
          value={content}
        />
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
        <RevisionSelector />
      </section>
    );
  }
}

const mapStateToProps: S.MapState<StateProps, OwnProps> = (state, props) => {
  const noteId = props.noteId ?? state.ui.openedNote;
  const note =
    props.note ?? (noteId ? state.data.notes.get(noteId) : null) ?? null;
  const liveNote = noteId ? state.data.notes.get(noteId) : null;
  const restoreDeletedTags = state.ui.restoreDeletedTags;

  const tags = note
    ? noteCanonicalTags(state, note)
        .map((tagName) => {
          const tagHash = tagHashOf(tagName);
          return { name: tagName, deleted: !state.data.tags.has(tagHash) };
        })
        .filter((tag) => {
          return restoreDeletedTags || !tag.deleted;
        })
    : [];

  return {
    markdownEnabled: !!liveNote?.systemTags.includes('markdown'),
    tags,
    noteId,
    note,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  cancelRevision: () => ({
    type: 'CLOSE_REVISION',
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteRevisions);
