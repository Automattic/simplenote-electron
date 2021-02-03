import React, { Component } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';
import { includes, isEmpty } from 'lodash';

import ClipboardButton from '../components/clipboard-button';
import ToggleControl from '../controls/toggle';
import getNoteTitleAndPreview from '../utils/note-utils';

import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  isMarkdown: boolean;
  isPinned: boolean;
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  markdownNote: (noteId: T.EntityId, shouldEnableMarkdown: boolean) => any;
  onOutsideClick: () => any;
  pinNote: (noteId: T.EntityId, shouldPin: boolean) => any;
  shareNote: () => any;
  toggleRevisions: () => any;
  trashNote: () => any;
};

type Props = StateProps & DispatchProps;

export class NoteActions extends Component<Props> {
  static displayName = 'NoteActions';

  handleClickOutside = this.props.onOutsideClick;

  getNoteLink = (note: T.Note, noteId: T.EntityId) => {
    const { title } = getNoteTitleAndPreview(note);
    return `[${title}](simplenote://note/${noteId})`;
  };

  getPublishURL = (url: string | undefined) => {
    return isEmpty(url) ? null : `http://simp.ly/p/${url}`;
  };

  render() {
    const { isMarkdown, isPinned, noteId, note } = this.props;
    const isPublished = includes(note.systemTags, 'published');
    const publishURL = this.getPublishURL(note.publishURL);
    const noteLink = this.getNoteLink(note, noteId);

    return (
      <div className="note-actions theme-color-bg theme-color-fg theme-color-border">
        <div className="note-info-panel note-info-pin theme-color-border">
          <label className="note-info-item" htmlFor="note-info-pin-checkbox">
            <span className="note-info-item-text">
              <span className="note-info-name">Pin to top</span>
            </span>
            <span className="note-info-item-control">
              <ToggleControl
                id="note-info-pin-checkbox"
                checked={isPinned}
                onChange={this.pinNote}
              />
            </span>
          </label>

          <label
            className="note-info-item"
            htmlFor="note-info-markdown-checkbox"
          >
            <span className="note-info-item-text">
              <span className="note-info-name">Markdown</span>
            </span>
            <span className="note-info-item-control">
              <ToggleControl
                id="note-info-markdown-checkbox"
                checked={isMarkdown}
                onChange={this.markdownNote}
              />
            </span>
          </label>

          <div className="note-info-item">
            <a onClick={this.props.shareNote}>Share</a>
          </div>

          {/* todo probably verify it has revisions */}
          <div className="note-info-item">
            <a onClick={this.props.toggleRevisions}>History...</a>
          </div>

          {/* todo what if already in trash? */}
          <div className="note-info-item">
            <a onClick={this.props.trashNote}>
              <span className="note-info-name">Trash</span>
            </a>
          </div>
        </div>
        {isPublished && (
          <div className="note-info-panel note-info-public-link theme-color-border">
            <span className="note-info-item-text">
              <span className="note-info-name">Public link</span>
              <div className="note-info-copy">
                <p className="note-info-detail note-info-link-text theme-color-fg-dim">
                  {publishURL}
                </p>
                <ClipboardButton text={publishURL} />
              </div>
            </span>
          </div>
        )}
        <div className="note-info-panel note-info-internal-link theme-color-border">
          <span className="note-info-item-text">
            <span className="note-info-name">Internal link</span>
            <div className="note-info-copy">
              <p className="note-info-detail note-info-link-text theme-color-fg-dim">{`simplenote://note/${noteId}`}</p>
              <ClipboardButton text={noteLink} />
            </div>
          </span>
        </div>
      </div>
    );
  }

  pinNote = (shouldPin: boolean) =>
    this.props.pinNote(this.props.noteId, shouldPin);

  markdownNote = (shouldEnableMarkdown: boolean) =>
    this.props.markdownNote(this.props.noteId, shouldEnableMarkdown);
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { openedNote },
}) => {
  const note = data.notes.get(openedNote);

  return {
    noteId: openedNote,
    note: note,
    isMarkdown: note?.systemTags.includes('markdown'),
    isPinned: note?.systemTags.includes('pinned'),
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  markdownNote: actions.data.markdownNote,
  onOutsideClick: actions.ui.toggleNoteActions,
  pinNote: actions.data.pinNote,
  shareNote: () => actions.ui.showDialog('SHARE'),
  toggleRevisions: actions.ui.toggleRevisions,
  trashNote: actions.ui.trashOpenNote,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(onClickOutside(NoteActions));
