import React, { Component, CSSProperties } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import PublishIcon from '../icons/published-small';
import SmallPinnedIcon from '../icons/pinned-small';
import SmallSyncIcon from '../icons/sync-small';
import { decorateWith, makeFilterDecorator } from './decorators';
import { getTerms } from '../utils/filter-notes';
import { noteTitleAndPreview } from '../utils/note-utils';
import { getSyncErrorMessage } from '../utils/sync-error-message';
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
  isOffline: boolean;
  isOpened: boolean;
  isSyncing: boolean;
  lastUpdated: number;
  note?: T.Note;
  searchQuery: string;
  hasPendingChanges: boolean;
  syncErrorCode: number | null;
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
      isOffline,
      isOpened,
      isSyncing,
      lastUpdated,
      noteId,
      note,
      openNote,
      pinNote,
      searchQuery,
      hasPendingChanges,
      style,
      syncErrorCode,
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
    const pinnerLabel = isPinned ? `Unpin note ${title}` : `Pin note ${title}`;
    const hasSyncError = null !== syncErrorCode;
    const isSyncErrorState = hasSyncError && !isSyncing;
    const shouldShowStatusIcon = hasPendingChanges || hasSyncError;
    const isSpinning =
      isSyncing || (hasPendingChanges && !hasSyncError && !isOffline);
    const pendingChangesLabel = isOffline
      ? 'Pending changes (waiting for network connection)'
      : 'Pending changes';
    const statusIconLabel = isSyncErrorState
      ? 'Sync failed'
      : pendingChangesLabel;
    const statusIconTooltip = isSyncErrorState
      ? getSyncErrorMessage(syncErrorCode)
      : undefined;

    const decorators = getTerms(searchQuery).map(makeFilterDecorator);

    return (
      <div style={style} className={classes} role="row">
        <div className="note-list-item-content" role="cell">
          <div className="note-list-item-status">
            <button
              aria-label={pinnerLabel}
              className={pinnerClasses}
              onClick={() => pinNote(noteId, !isPinned)}
            >
              <SmallPinnedIcon />
            </button>
          </div>

          <button
            aria-label={`Edit note ${title}`}
            className="note-list-item-text"
            onClick={() => openNote(noteId)}
          >
            <div className="note-list-item-title">
              <span>
                {decorateWith(decorators, withCheckboxCharacters(title))}
              </span>
            </div>
            {'expanded' === displayMode && preview.length > 0 && (
              <div className="note-list-item-excerpt">
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
              <div className="note-list-item-excerpt">
                {decorateWith(
                  decorators,
                  withCheckboxCharacters(preview).slice(0, 200)
                )}
              </div>
            )}
          </button>
          <div className="note-list-item-status-right">
            {shouldShowStatusIcon && (
              <span
                aria-label={statusIconLabel}
                className={classNames('note-list-item-pending-changes', {
                  'has-sync-error': isSyncErrorState,
                  'is-offline': isOffline && !isSyncErrorState,
                  'is-syncing': isSpinning,
                })}
                role="img"
                title={statusIconTooltip}
              >
                <SmallSyncIcon />
              </span>
            )}
            {isPublished && (
              <span
                aria-label="Published note"
                className="note-list-item-published-icon"
                role="img"
              >
                <PublishIcon />
              </span>
            )}
          </div>
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
  isOffline: state.simperium.connectionStatus === 'offline',
  isOpened: state.ui.openedNote === noteId,
  isSyncing: state.simperium.syncingNotes.has(noteId),
  lastUpdated: state.simperium.lastRemoteUpdate.get(noteId) ?? -Infinity,
  note: state.data.notes.get(noteId),
  searchQuery: state.ui.searchQuery,
  hasPendingChanges: selectors.noteHasPendingChanges(state, noteId),
  syncErrorCode: state.simperium.syncErrors.get(noteId) ?? null,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  openNote: actions.ui.openNote,
  pinNote: actions.data.pinNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteCell);
