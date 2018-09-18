import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { noop } from 'lodash';

import BackIcon from '../icons/back';
import InfoIcon from '../icons/info';
import PreviewIcon from '../icons/preview';
import PreviewStopIcon from '../icons/preview-stop';
import RevisionsIcon from '../icons/revisions';
import TrashIcon from '../icons/trash';
import ShareIcon from '../icons/share';

export class NoteToolbar extends Component {
  static displayName = 'NoteToolbar';

  static propTypes = {
    note: PropTypes.object,
    onRestoreNote: PropTypes.func,
    onTrashNote: PropTypes.func,
    onDeleteNoteForever: PropTypes.func,
    onShowRevisions: PropTypes.func,
    onShareNote: PropTypes.func,
    onCloseNote: PropTypes.func,
    onShowNoteInfo: PropTypes.func,
    setIsViewingRevisions: PropTypes.func,
    onSetEditorMode: PropTypes.func,
    editorMode: PropTypes.string,
    markdownEnabled: PropTypes.bool,
  };

  static defaultProps = {
    editorMode: 'edit',
    onCloseNote: noop,
    onDeleteNoteForever: noop,
    onRestoreNote: noop,
    onSetEditorMode: noop,
    onShowNoteInfo: noop,
    onShowRevisions: noop,
    onShareNote: noop,
    onTrashNote: noop,
    setIsViewingRevisions: noop,
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

    this.props.onSetEditorMode(editorMode === 'markdown' ? 'edit' : 'markdown');
  };

  renderNormal = () => {
    const { note, editorMode, markdownEnabled } = this.props;
    const isPreviewing = editorMode === 'markdown';

    return !note ? (
      <div className="note-toolbar-placeholder theme-color-border" />
    ) : (
      <div className="note-toolbar">
        <div className="note-toolbar-icon note-toolbar-back">
          <button
            type="button"
            title="Back"
            className="button button-borderless"
            onClick={this.props.onCloseNote}
          >
            <BackIcon />
          </button>
        </div>
        {markdownEnabled && (
          <div className="note-toolbar-icon">
            <button
              type="button"
              title="Preview"
              className="button button-borderless"
              onClick={this.setEditorMode}
            >
              {isPreviewing ? <PreviewStopIcon /> : <PreviewIcon />}
            </button>
          </div>
        )}
        <div className="note-toolbar-icon">
          <button
            type="button"
            title="History"
            className="button button-borderless"
            onClick={this.showRevisions}
          >
            <RevisionsIcon />
          </button>
        </div>
        <div className="note-toolbar-icon">
          <button
            type="button"
            title="Share"
            className="button button-borderless"
            onClick={this.props.onShareNote.bind(null)}
          >
            <ShareIcon />
          </button>
        </div>
        <div className="note-toolbar-icon">
          <button
            type="button"
            title="Trash"
            className="button button-borderless"
            onClick={this.props.onTrashNote.bind(null, note)}
          >
            <TrashIcon />
          </button>
        </div>
        <div className="note-toolbar-icon">
          <button
            type="button"
            title="Info"
            className="button button-borderless"
            onClick={this.props.onShowNoteInfo}
          >
            <InfoIcon />
          </button>
        </div>
      </div>
    );
  };

  renderTrashed = () => {
    const { note } = this.props;

    return (
      <div className="note-toolbar-trashed">
        <div className="note-toolbar-text">
          <button
            type="button"
            className="button button-compact button-danger"
            onClick={this.props.onDeleteNoteForever.bind(null, note)}
          >
            Delete Forever
          </button>
        </div>
        <div className="note-toolbar-text">
          <button
            type="button"
            className="button button-primary button-compact"
            onClick={this.props.onRestoreNote.bind(null, note)}
          >
            Restore Note
          </button>
        </div>
      </div>
    );
  };
}

export default NoteToolbar;
