import React, { Component } from 'react';
import { connect } from 'react-redux';
import { noop } from 'lodash';

import actions from '../state/actions';
import IconButton from '../icon-button';
import BackIcon from '../icons/back';
import InfoIcon from '../icons/info';
import PreviewIcon from '../icons/preview';
import PreviewStopIcon from '../icons/preview-stop';
import RevisionsIcon from '../icons/revisions';
import TrashIcon from '../icons/trash';
import ShareIcon from '../icons/share';
import SidebarIcon from '../icons/sidebar';

import * as T from '../types';
import { State } from '../state';

type Props = {
  note: T.NoteEntity;
  onRestoreNote: Function;
  onTrashNote: Function;
  onDeleteNoteForever: Function;
  onShowRevisions: Function;
  onShareNote: Function;
  onCloseNote: Function;
  onShowNoteInfo: Function;
  setIsViewingRevisions: Function;
  toggleFocusMode: Function;
  markdownEnabled: boolean;
};

type ConnectedProps = ReturnType<typeof mapStateToProps> &
  typeof mapDispatchToProps;

export class NoteToolbar extends Component<Props & ConnectedProps> {
  static displayName = 'NoteToolbar';

  static defaultProps = {
    onCloseNote: noop,
    onDeleteNoteForever: noop,
    onRestoreNote: noop,
    onShowNoteInfo: noop,
    onShowRevisions: noop,
    onShareNote: noop,
    onTrashNote: noop,
    setIsViewingRevisions: noop,
    toggleFocusMode: noop,
  };

  showRevisions = () => {
    this.props.setIsViewingRevisions(true);
    this.props.onShowRevisions(this.props.note);
  };

  render() {
    const { note } = this.props;
    const isTrashed = !!(note && note.data.deleted);

    return (
      <div className="note-toolbar-wrapper theme-color-border">
        {isTrashed ? this.renderTrashed() : this.renderNormal()}
      </div>
    );
  }

  setEditorMode = () => {
    const { editorMode } = this.props;

    this.props.setEditorMode(editorMode === 'markdown' ? 'edit' : 'markdown');
  };

  renderNormal = () => {
    const { note, editorMode, markdownEnabled } = this.props;
    const isPreviewing = editorMode === 'markdown';

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
              onClick={this.props.onCloseNote}
              title="Back"
            />
          </div>
          {markdownEnabled && (
            <div className="note-toolbar__button">
              <IconButton
                icon={isPreviewing ? <PreviewStopIcon /> : <PreviewIcon />}
                onClick={this.setEditorMode}
                title="Preview • Ctrl+Shift+P"
              />
            </div>
          )}
          <div className="note-toolbar__button">
            <IconButton
              icon={<RevisionsIcon />}
              onClick={this.showRevisions}
              title="History"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<ShareIcon />}
              onClick={this.props.onShareNote.bind(null)}
              title="Share"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<TrashIcon />}
              onClick={this.props.onTrashNote.bind(null, note)}
              title="Trash"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<InfoIcon />}
              onClick={this.props.onShowNoteInfo}
              title="Info"
            />
          </div>
        </div>
      </div>
    );
  };

  renderTrashed = () => {
    const { note } = this.props;

    return (
      <div className="note-toolbar-trashed">
        <div className="note-toolbar__column-left">
          <IconButton
            icon={<BackIcon />}
            onClick={this.props.onCloseNote}
            title="Back"
          />
        </div>
        <div className="note-toolbar__column-right">
          <div className="note-toolbar__button">
            <button
              type="button"
              className="button button-compact button-danger"
              onClick={this.props.onDeleteNoteForever.bind(null, note)}
            >
              Delete Forever
            </button>
          </div>
          <div className="note-toolbar__button">
            <button
              type="button"
              className="button button-primary button-compact"
              onClick={this.props.onRestoreNote.bind(null, note)}
            >
              Restore Note
            </button>
          </div>
        </div>
      </div>
    );
  };
}

const mapStateToProps = (state: State) => ({
  editorMode: state.ui.editorMode,
});

const mapDispatchToProps = {
  setEditorMode: actions.ui.setEditorMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteToolbar);
