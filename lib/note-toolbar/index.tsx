import React, { Component } from 'react';
import { connect } from 'react-redux';

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
    const { editMode, markdownEnabled, note, toggleNoteInfo } = this.props;
    return !note ? (
      <div className="note-toolbar-placeholder theme-color-border" />
    ) : (
      <div className="note-toolbar">
        <div className="note-toolbar__column-left">
          <div className="note-toolbar__button">
            <IconButton
              icon={<SidebarIcon />}
              onClick={this.props.toggleFocusMode}
              title="Toggle Sidebar"
            />
          </div>
        </div>
        <div className="note-toolbar__column-right">
          <div className="note-toolbar__button note-toolbar-back">
            <IconButton
              icon={<BackIcon />}
              onClick={this.props.toggleNoteList}
              title="Back • Ctrl+Shift+L"
            />
          </div>
          {markdownEnabled && (
            <div className="note-toolbar__button">
              <IconButton
                icon={!editMode ? <PreviewStopIcon /> : <PreviewIcon />}
                onClick={this.props.toggleEditMode}
                title="Preview • Ctrl+Shift+P"
              />
            </div>
          )}
          <div className="note-toolbar__button">
            <IconButton
              icon={<RevisionsIcon />}
              onClick={this.props.toggleRevisions}
              title="History"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<ShareIcon />}
              onClick={this.props.shareNote}
              title="Share"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<TrashIcon />}
              onClick={this.props.trashNote}
              title="Trash"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<InfoIcon />}
              onClick={toggleNoteInfo}
              title="Info"
            />
          </div>
        </div>
      </div>
    );
  };

  renderTrashed = () => {
    return (
      <div className="note-toolbar-trashed">
        <div className="note-toolbar__column-left">
          <IconButton
            icon={<BackIcon />}
            onClick={this.props.toggleNoteList}
            title="Back • Ctrl+Shift+L"
          />
        </div>
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
  ui: { editMode, openedNote, selectedRevision },
}) => {
  const note = openedNote ? data.notes.get(openedNote) ?? null : null;

  return {
    editMode,
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
