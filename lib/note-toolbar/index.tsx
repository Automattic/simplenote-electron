import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { noop } from 'lodash';

import IconButton from '../icon-button';
import BackIcon from '../icons/back';
import InfoIcon from '../icons/info';
import PreviewIcon from '../icons/preview';
import PreviewStopIcon from '../icons/preview-stop';
import RevisionsIcon from '../icons/revisions';
import TrashIcon from '../icons/trash';
import ShareIcon from '../icons/share';
import SidebarIcon from '../icons/sidebar';

import {
  closeNote,
  toggleEditMode,
  toggleNoteInfo,
  toggleRevisions,
} from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type DispatchProps = {
  closeNote: () => any;
  toggleEditMode: () => any;
  toggleNoteInfo: () => any;
  toggleRevisions: () => any;
};

type StateProps = {
  editMode: boolean;
  markdownEnabled: boolean;
  note: T.NoteEntity | null;
};

type Props = DispatchProps & StateProps;

export class NoteToolbar extends Component<Props> {
  static displayName = 'NoteToolbar';

  static propTypes = {
    onRestoreNote: PropTypes.func,
    onTrashNote: PropTypes.func,
    onDeleteNoteForever: PropTypes.func,
    onShareNote: PropTypes.func,
    toggleFocusMode: PropTypes.func.isRequired,
  };

  static defaultProps = {
    onDeleteNoteForever: noop,
    onRestoreNote: noop,
    onShareNote: noop,
    onTrashNote: noop,
    toggleFocusMode: noop,
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
              onClick={this.props.closeNote}
              title="Back"
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
              onClick={this.props.onShareNote.bind(null)}
              title="Share"
            />
          </div>
          <div className="note-toolbar__button">
            <IconButton
              icon={<TrashIcon />}
              onClick={this.props.onTrashNote.bind(null, note)}
              title="Trash • Ctrl+Delete"
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
    const { note } = this.props;

    return (
      <div className="note-toolbar-trashed">
        <div className="note-toolbar__column-left">
          <IconButton
            icon={<BackIcon />}
            onClick={this.props.closeNote}
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

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { note, editMode, selectedRevision },
}) => {
  const revisionOrNote = selectedRevision || note;

  return {
    editMode,
    markdownEnabled: revisionOrNote
      ? revisionOrNote.data.systemTags.includes('markdown')
      : false,
    note,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeNote,
  toggleEditMode,
  toggleNoteInfo,
  toggleRevisions,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteToolbar);
