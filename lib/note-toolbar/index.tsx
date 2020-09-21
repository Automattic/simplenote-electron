import React, { Component } from 'react';
import { connect } from 'react-redux';
import i18n from 'i18n-calypso';

import IconButton from '../icon-button';
import BackIcon from '../icons/back';
import InfoIcon from '../icons/info';
import PreviewIcon from '../icons/preview';
import PreviewStopIcon from '../icons/preview-stop';
import RevisionsIcon from '../icons/revisions';
import TrashIcon from '../icons/trash';
import ShareIcon from '../icons/share';
import SidebarIcon from '../icons/sidebar';
import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  editMode: boolean;
  hasRevisions: boolean;
  isOffline: boolean;
  markdownEnabled: boolean;
  note: T.Note | null;
};

type DispatchProps = {
  deleteNoteForever: () => any;
  restoreNote: () => any;
  shareNote: () => any;
  toggleEditMode: () => any;
  toggleFocusMode: () => any;
  toggleNoteInfo: () => any;
  toggleNoteList: () => any;
  toggleRevisions: () => any;
  trashNote: () => any;
};

type Props = DispatchProps & StateProps;

export class NoteToolbar extends Component<Props> {
  static displayName = 'NoteToolbar';

  render() {
    const { note } = this.props;

    return (
      <div className="note-toolbar-wrapper theme-color-border">
        {note?.deleted ? this.renderTrashed() : this.renderNormal()}
      </div>
    );
  }

  renderNormal = () => {
    const {
      editMode,
      hasRevisions,
      isOffline,
      markdownEnabled,
      note,
      toggleNoteInfo,
    } = this.props;
    return !note ? (
      <div className="note-toolbar-placeholder theme-color-border" />
    ) : (
      <div className="note-toolbar">
        <div className="note-toolbar__column-left">
          <div className="note-toolbar__button note-toolbar__button-sidebar">
            <IconButton
              icon={<SidebarIcon />}
              onClick={this.props.toggleFocusMode}
              title={i18n.translate('Toggle Sidebar')}
            />
          </div>
          <div className="note-toolbar__button note-toolbar-back">
            <IconButton
              icon={<BackIcon />}
              onClick={this.props.toggleNoteList}
              title={i18n.translate('Back')} //+ " • Ctrl+Shift+L"
            />
          </div>
        </div>
        {isOffline && <div className="offline-badge">OFFLINE</div>}
        <div className="note-toolbar__column-right">
          {markdownEnabled && (
            <div className="note-toolbar__button">
              <IconButton
                icon={!editMode ? <PreviewStopIcon /> : <PreviewIcon />}
                onClick={this.props.toggleEditMode}
                title={i18n.translate('Preview')} // • Ctrl+Shift+P"
              />
            </div>
          )}
          <div className="note-toolbar__button">
            <IconButton
              disabled={!hasRevisions}
              icon={<RevisionsIcon />}
              onClick={this.props.toggleRevisions}
              title={
                hasRevisions
                  ? i18n.translate('History')
                  : i18n.translate('History (unavailable)')
              }
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<ShareIcon />}
              onClick={this.props.shareNote}
              title={i18n.translate('Share')}
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<TrashIcon />}
              onClick={this.props.trashNote}
              title={i18n.translate('Trash')}
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<InfoIcon />}
              onClick={toggleNoteInfo}
              title={i18n.translate('Info')}
            />
          </div>
        </div>
      </div>
    );
  };

  renderTrashed = () => {
    const { isOffline } = this.props;

    return (
      <div className="note-toolbar-trashed">
        <div className="note-toolbar__column-left">
          <IconButton
            icon={<BackIcon />}
            onClick={this.props.toggleNoteList}
            title={i18n.translate('Back')} // • Ctrl+Shift+L"
          />
        </div>
        {isOffline && <div className="offline-badge">OFFLINE</div>}
        <div className="note-toolbar__column-right">
          <div className="note-toolbar__button">
            <button
              type="button"
              className="button button-compact button-danger"
              onClick={this.props.deleteNoteForever}
            >
              {i18n.translate('Delete Forever')}
            </button>
          </div>
          <div className="note-toolbar__button">
            <button
              type="button"
              className="button button-primary button-compact"
              onClick={this.props.restoreNote}
            >
              {i18n.translate('Restore Note')}
            </button>
          </div>
        </div>
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { editMode, openedNote },
  simperium: { connectionStatus },
}) => {
  const note = openedNote ? data.notes.get(openedNote) ?? null : null;

  return {
    editMode,
    hasRevisions: !!data.noteRevisions.get(openedNote)?.size,
    isOffline: connectionStatus === 'offline',
    markdownEnabled: note?.systemTags.includes('markdown') || false,
    note,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  deleteNoteForever: actions.ui.deleteOpenNoteForever,
  restoreNote: actions.ui.restoreOpenNote,
  shareNote: () => actions.ui.showDialog('SHARE'),
  toggleEditMode: actions.ui.toggleEditMode,
  toggleFocusMode: actions.settings.toggleFocusMode,
  toggleNoteInfo: actions.ui.toggleNoteInfo,
  toggleNoteList: actions.ui.toggleNoteList,
  toggleRevisions: actions.ui.toggleRevisions,
  trashNote: actions.ui.trashOpenNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteToolbar);
