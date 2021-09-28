import React, { Component } from 'react';
import { connect } from 'react-redux';
import MD5 from 'md5.js';

import isEmailTag from '../../utils/is-email-tag';
import Dialog from '../../dialog';
import TabPanels from '../../components/tab-panels';
import PanelTitle from '../../components/panel-title';
import actions from '../../state/actions';

import * as S from '../../state';
import * as T from '../../types';

type StateProps = {
  settings: S.State['settings'];
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  addCollaborator: (noteId: T.EntityId, collaborator: T.TagName) => any;
  closeDialog: () => any;
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
  removeCollaborator: (noteId: T.EntityId, collaborator: T.TagName) => any;
};

type Props = StateProps & DispatchProps;

export class ShareDialog extends Component<Props> {
  onAddCollaborator = (event) => {
    const { noteId } = this.props;
    const collaborator = this.collaboratorElement.value.trim();

    event.preventDefault();
    this.collaboratorElement.value = '';

    const isSelf = this.props.settings.accountName === collaborator;

    if (collaborator !== '' && !isSelf) {
      this.props.addCollaborator(noteId, collaborator);
    }
  };

  onRemoveCollaborator = (collaborator) => {
    const { noteId } = this.props;

    this.props.removeCollaborator(noteId, collaborator);
  };

  collaborators = () => {
    const { note } = this.props;
    const tags = note?.tags || [];
    const collaborators = tags.filter(isEmailTag);

    collaborators.reverse();

    return collaborators;
  };

  gravatarURL = (email) => {
    const hash = new MD5()
      .update(email.trim().toLowerCase())
      .digest('hex')
      .toLowerCase();

    return `https://secure.gravatar.com/avatar/${hash}.jpg?s=68`;
  };

  render() {
    const { closeDialog } = this.props;

    return (
      <Dialog className="settings" title="Collaborate" onDone={closeDialog}>
        <div className="tab-panels__panel">
          <div className="tab-panels__column">
            <div className="settings-group">
              <p>
                Add an email address of another Simplenote user to share a note.
                You&apos;ll both be able to edit and view the note.
              </p>
              <div className="settings-items">
                <form
                  className="settings-item"
                  onSubmit={this.onAddCollaborator}
                >
                  <input
                    className="settings-item-text-input transparent-input"
                    // Regex to detect valid email
                    pattern="^[^@]+@.+"
                    placeholder="email@example.com"
                    ref={(e) => (this.collaboratorElement = e)}
                    spellCheck={false}
                    title="Please enter a valid email"
                  />
                  <div className="settings-item-control">
                    <button type="submit" className="button button-borderless">
                      Add Email
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="settings-group">
              <div className="share-collaborators-heading">
                <PanelTitle headingLevel={3}>Collaborators</PanelTitle>
              </div>
              <ul className="share-collaborators">
                {this.collaborators().map((collaborator) => (
                  <li key={collaborator} className="share-collaborator">
                    <span className="share-collaborator-photo">
                      <img
                        src={this.gravatarURL(collaborator)}
                        width="34"
                        height="34"
                      />
                    </span>
                    <span className="share-collaborator-name">
                      {collaborator}
                    </span>
                    <button
                      className="share-collaborator-remove button button-borderless button-danger"
                      onClick={this.onRemoveCollaborator.bind(
                        this,
                        collaborator
                      )}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  settings,
  ui: { openedNote },
}) => ({
  settings,
  noteId: openedNote,
  note: data.notes.get(openedNote),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  addCollaborator: actions.data.addCollaborator,
  closeDialog: actions.ui.closeDialog,
  editNote: actions.data.editNote,
  publishNote: actions.data.publishNote,
  removeCollaborator: actions.data.removeCollaborator,
};

export default connect(mapStateToProps, mapDispatchToProps)(ShareDialog);
