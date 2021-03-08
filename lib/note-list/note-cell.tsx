import React, { Component, CSSProperties } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import PublishIcon from '../icons/published-small';
import SmallPinnedIcon from '../icons/pinned-small';
import SmallSyncIcon from '../icons/sync-small';
import { decorateWith, makeFilterDecorator } from './decorators';
import { getTerms } from '../utils/filter-notes';
import { noteTitleAndPreview } from '../utils/note-utils';
import { withCheckboxCharacters } from '../utils/task-transform';

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
  isOffline: boolean;
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
  updateScheduled: ReturnType<typeof setTimeout> | undefined;

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

  componentWillUnmount() {
    clearTimeout(this.updateScheduled);
  }

  render() {
    const {
      displayMode,
      hasPendingChanges,
      isOffline,
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

    const { title, preview } = noteTitleAndPreview(note, searchQuery);
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

    const pinnerClasses = classNames('note-list-item-pinner', {
      'note-list-item-pinned': isPinned,
    });

    const decorators = getTerms(searchQuery).map(makeFilterDecorator);

    return (
      <div style={style} className={classes} role="row">
        <div className="note-list-item-status" role="cell">
          <div
            className={pinnerClasses}
            tabIndex={0}
            onClick={() => pinNote(noteId, !isPinned)}
          >
            <SmallPinnedIcon />
          </div>
        </div>

        <div
          className="note-list-item-text theme-color-border"
          tabIndex={0}
          onClick={() => openNote(noteId)}
          role="cell"
        >
          <div className="note-list-item-title">
            <span>
              {decorateWith(decorators, withCheckboxCharacters(title))}
            </span>
          </div>
          {'expanded' === displayMode && preview.length > 0 && (
            <div className="note-list-item-excerpt theme-color-fg-dim">
              {withCheckboxCharacters(preview)
                .split('\n')
                .map((line, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <br />}
                    {decorateWith(decorators, line.slice(0, 200))}
                  </React.Fragment>
                ))}
            </div>
          )}
          {'comfy' === displayMode && preview.length > 0 && (
            <div className="note-list-item-excerpt theme-color-fg-dim">
              {decorateWith(
                decorators,
                withCheckboxCharacters(preview).slice(0, 200)
              )}
            </div>
          )}
        </div>
        <div
          className="note-list-item-status-right theme-color-border"
          role="cell"
        >
          {hasPendingChanges && (
            <span
              className={classNames('note-list-item-pending-changes', {
                'is-offline': isOffline,
              })}
            >
              <SmallSyncIcon />
            </span>
          )}
          {isPublished && (
            <span className="note-list-item-published-icon">
              <PublishIcon />
            </span>
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
  isOffline: state.simperium.connectionStatus === 'offline',
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
