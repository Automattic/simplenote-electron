import React, { Component } from 'react';
import { connect } from 'react-redux';
import { CmdOrCtrl } from '../utils/platform';

import BackIcon from '../icons/back';
import ChecklistIcon from '../icons/check-list';
import EllipsisOutlineIcon from '../icons/ellipsis-outline';
import IconButton from '../icon-button';
import InfoIcon from '../icons/info';
import NewNoteIcon from '../icons/new-note';
import PreviewIcon from '../icons/preview';
import PreviewStopIcon from '../icons/preview-stop';
import SidebarIcon from '../icons/sidebar';
import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  editMode: boolean;
  isOffline: boolean;
  markdownEnabled: boolean;
  note: T.Note | null;
};

type DispatchProps = {
  deleteNoteForever: () => any;
  newNote: () => any;
  restoreNote: () => any;
  toggleEditMode: () => any;
  toggleFocusMode: () => any;
  toggleNoteActions: () => any;
  toggleNoteInfo: () => any;
  toggleNoteList: () => any;
};

type Props = DispatchProps & StateProps & React.HTMLProps<HTMLDivElement>;

export class NoteToolbar extends Component<Props> {
  static displayName = 'NoteToolbar';

  render() {
    const { 'aria-hidden': ariaHidden, note } = this.props;
    return (
      <div aria-hidden={ariaHidden} className="note-toolbar-wrapper">
        {note?.deleted ? this.renderTrashed() : this.renderNormal()}
      </div>
    );
  }

  renderNormal = () => {
    const {
      editMode,
      newNote,
      isOffline,
      markdownEnabled,
      note,
      toggleNoteActions,
      toggleNoteInfo,
    } = this.props;

    return !note ? (
      <div className="note-toolbar-placeholder" />
    ) : (
      <div aria-label="note actions" role="toolbar" className="note-toolbar">
        <div className="note-toolbar__column-left">
          <div className="note-toolbar__button new-note-toolbar__button-sidebar">
            <IconButton
              icon={<NewNoteIcon />}
              onClick={() => newNote()}
              title={`New Note • ${CmdOrCtrl}+Shift+I`}
            />
          </div>
          <div className="note-toolbar__button note-toolbar__button-sidebar">
            <IconButton
              icon={<SidebarIcon />}
              onClick={this.props.toggleFocusMode}
              title="Toggle Focus Mode"
            />
          </div>
          <div className="note-toolbar__button note-toolbar-back">
            <IconButton
              icon={<BackIcon />}
              onClick={this.props.toggleNoteList}
              title={`Back • ${CmdOrCtrl}+Shift+L`}
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
                title={`Preview • ${CmdOrCtrl}+Shift+P`}
              />
            </div>
          )}
          <div className="note-toolbar__button">
            <IconButton
              icon={<ChecklistIcon />}
              onClick={() => window.dispatchEvent(new Event('toggleChecklist'))}
              title={`Insert Checklist • ${CmdOrCtrl}+Shift+C`}
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<InfoIcon />}
              onClick={toggleNoteInfo}
              title="Info"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<EllipsisOutlineIcon />}
              onClick={toggleNoteActions}
              title="Actions"
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
            title={`Back • ${CmdOrCtrl}+Shift+L`}
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
              Delete Forever
            </button>
          </div>
          <div className="note-toolbar__button">
            <button
              type="button"
              className="button button-primary button-compact"
              onClick={this.props.restoreNote}
            >
              Restore Note
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
    isOffline: connectionStatus === 'offline',
    markdownEnabled: note?.systemTags.includes('markdown') || false,
    note,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  deleteNoteForever: actions.ui.deleteOpenNoteForever,
  newNote: actions.ui.createNote,
  restoreNote: actions.ui.restoreOpenNote,
  toggleEditMode: actions.ui.toggleEditMode,
  toggleFocusMode: actions.settings.toggleFocusMode,
  toggleNoteActions: actions.ui.toggleNoteActions,
  toggleNoteInfo: actions.ui.toggleNoteInfo,
  toggleNoteList: actions.ui.toggleNoteList,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteToolbar);
