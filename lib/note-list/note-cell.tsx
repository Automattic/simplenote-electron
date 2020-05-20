import React, { Component, CSSProperties } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import PublishIcon from '../icons/feed';
import { decorateWith, makeFilterDecorator } from './decorators';
import { getTerms } from '../utils/filter-notes';
import { noteTitleAndPreview } from '../utils/note-utils';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  invalidateHeight: () => any;
  noteId: T.EntityId;
  style: CSSProperties;
};

type StateProps = {
  displayMode: T.ListDisplayMode;
  hasPendingChanges: boolean;
  isOpened: boolean;
  lastUpdated: number;
  note?: T.Note;
  searchQuery: string;
};

type DispatchProps = {
  openNote: (noteId: T.EntityId) => any;
  pinNote: (noteId: T.EntityId, shouldPin: boolean) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class NoteCell extends Component<Props> {
  createdAt: number;

  constructor(props: Props) {
    super(props);

    // prevent bouncing note updates on app boot
    this.createdAt = Date.now();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.note?.content !== this.props.note?.content) {
      this.props.invalidateHeight();
    }

    // make sure we reset our update indicator
    // otherwise it won't re-animate on the next update
    if (this.props.lastUpdated < 1000 && !this.updateScheduled) {
      this.updateScheduled = setTimeout(() => this.forceUpdate(), 1000);
    }
  }

  render() {
    const {
      displayMode,
      hasPendingChanges,
      isOpened,
      lastUpdated,
      noteId,
      note,
      openNote,
      pinNote,
      searchQuery,
      style,
    } = this.props;

    if (!note) {
      return <div>{"Couldn't find note"}</div>;
    }

    const { title, preview } = noteTitleAndPreview(note);
    const isPinned = note.systemTags.includes('pinned');
    const isPublished = !!note.publishURL;
    const recentlyUpdated =
      lastUpdated - this.createdAt > 1000 && Date.now() - lastUpdated < 1200;
    const classes = classNames('note-list-item', {
      'note-list-item-selected': isOpened,
      'note-list-item-pinned': isPinned,
      'note-recently-updated': recentlyUpdated,
      'published-note': isPublished,
    });

    const decorators = getTerms(searchQuery).map(makeFilterDecorator);

    return (
      <div style={style} className={classes}>
        <div
          className="note-list-item-pinner"
          tabIndex={0}
          onClick={() => pinNote(noteId, !isPinned)}
        />
        <div
          className="note-list-item-text theme-color-border"
          tabIndex={0}
          onClick={() => openNote(noteId)}
        >
          <div className="note-list-item-title">
            <span>
              {hasPendingChanges && '⚠️ '}
              {decorateWith(decorators, title)}
            </span>
            {isPublished && (
              <div className="note-list-item-published-icon">
                <PublishIcon />
              </div>
            )}
          </div>
          {'expanded' === displayMode && preview.length > 0 && (
            <div className="note-list-item-excerpt">
              {preview.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <br />}
                  {decorateWith(decorators, line.slice(0, 200))}
                </React.Fragment>
              ))}
            </div>
          )}
          {'comfy' === displayMode && preview.length > 0 && (
            <div className="note-list-item-excerpt">
              {decorateWith(decorators, preview.slice(0, 200))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps, OwnProps> = (
  state,
  { noteId }
) => ({
  displayMode: state.settings.noteDisplay,
  hasPendingChanges: selectors.noteHasPendingChanges(state, noteId),
  isOpened: state.ui.openedNote === noteId,
  lastUpdated: state.simperium.lastRemoteUpdate.get(noteId) ?? -Infinity,
  note: state.data.notes.get(noteId),
  searchQuery: state.ui.searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openNote: actions.ui.openNote,
  pinNote: actions.data.pinNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteCell);
