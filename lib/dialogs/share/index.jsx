import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createHash from 'create-hash/browser';
import { includes, isEmpty } from 'lodash';

import analytics from '../../analytics';
import isEmailTag from '../../utils/is-email-tag';
import TabbedDialog from '../../tabbed-dialog';
import PanelTitle from '../../components/panel-title';
import ToggleControl from '../../controls/toggle';

const shareTabs = ['collaborate', 'publish'];

export class ShareDialog extends Component {
  static propTypes = {
    actions: PropTypes.object.isRequired,
    dialog: PropTypes.object.isRequired,
    noteBucket: PropTypes.object.isRequired,
    appState: PropTypes.object.isRequired,
    requestClose: PropTypes.func.isRequired,
    tagBucket: PropTypes.object.isRequired,
  };

  onTogglePublished = event => {
    this.props.actions.publishNote({
      noteBucket: this.props.noteBucket,
      note: this.props.appState.note,
      publish: event.currentTarget.checked,
    });
  };

  copyPublishURL = () => {
    this.publishUrlElement.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      return;
    }

    this.copyUrlElement.focus();
  };

  getPublishURL = url => (isEmpty(url) ? undefined : `http://simp.ly/p/${url}`);

  onAddCollaborator = event => {
    const { note } = this.props.appState;
    const tags = (note.data && note.data.tags) || [];
    const collaborator = this.collaboratorElement.value.trim();

    event.preventDefault();
    this.collaboratorElement.value = '';

    if (collaborator !== '' && tags.indexOf(collaborator) === -1) {
      this.props.actions.updateNoteTags({
        noteBucket: this.props.noteBucket,
        tagBucket: this.props.tagBucket,
        note,
        tags: [...tags, collaborator],
      });
      analytics.tracks.recordEvent('editor_note_collaborator_added');
    }
  };

  onRemoveCollaborator = collaborator => {
    const { note } = this.props.appState;

    let tags = (note.data && note.data.tags) || [];
    tags = tags.filter(tag => tag !== collaborator);

    this.props.actions.updateNoteTags({
      noteBucket: this.props.noteBucket,
      tagBucket: this.props.tagBucket,
      note,
      tags,
    });
    analytics.tracks.recordEvent('editor_note_collaborator_removed');
  };

  collaborators = () => {
    const { note } = this.props.appState;
    const tags = (note.data && note.data.tags) || [];
    const collaborators = tags.filter(isEmailTag);

    collaborators.reverse();

    return collaborators;
  };

  gravatarURL = email => {
    const hash = createHash('md5');

    hash.update(email.trim().toLowerCase());
    let digest = hash
      .digest()
      .toString('hex')
      .toLowerCase();

    return `https://secure.gravatar.com/avatar/${digest}.jpg?s=68`;
  };

  render() {
    const { dialog, requestClose } = this.props;

    return (
      <TabbedDialog
        className="settings"
        title="Share"
        tabs={shareTabs}
        onDone={requestClose}
        renderTabName={this.renderTabName}
        renderTabContent={this.renderTabContent}
        {...dialog}
      />
    );
  }

  renderTabName = tabName => tabName;

  renderTabContent = tabName => {
    const { note } = this.props.appState;
    const data = (note && note.data) || {};
    const isPublished = includes(data.systemTags, 'published');
    const publishURL = this.getPublishURL(data.publishURL);

    switch (tabName) {
      case 'collaborate':
        return (
          <div className="dialog-column share-collaborate">
            <div className="settings-group">
              <p>
                Add an email address of another Simplenote user to share a note.
                You&apos;ll both be able to edit and view the note.
              </p>
              <div className="settings-items theme-color-border">
                <form
                  className="settings-item theme-color-border"
                  onSubmit={this.onAddCollaborator}
                >
                  <input
                    ref={e => (this.collaboratorElement = e)}
                    type="email"
                    pattern="[^@]+@[^@]+"
                    className="settings-item-text-input transparent-input"
                    placeholder="email@example.com"
                    spellCheck={false}
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
              <div className="share-collaborators-heading theme-color-border">
                <PanelTitle headingLevel="3">Collaborators</PanelTitle>
              </div>
              <ul className="share-collaborators">
                {this.collaborators().map(collaborator => (
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
        );

      case 'publish':
        return (
          <div className="dialog-column share-publish">
            <div className="settings-group">
              <div className="settings-items theme-color-border">
                <label
                  htmlFor="settings-field-public"
                  className="settings-item theme-color-border"
                >
                  <div className="settings-item-label">Make public link</div>
                  <div className="settings-item-control">
                    <ToggleControl
                      id="settings-field-public"
                      onChange={this.onTogglePublished}
                      checked={isPublished}
                    />
                  </div>
                </label>
              </div>
              <p>
                Ready to share your note with the world? Anyone with the public
                link will be able to view the latest version.
              </p>
            </div>
            {isPublished && (
              <div className="settings-group">
                <PanelTitle headingLevel="3">Public link</PanelTitle>
                <div className="settings-items theme-color-border">
                  <div className="settings-item theme-color-border">
                    <input
                      ref={e => (this.publishUrlElement = e)}
                      className="settings-item-text-input transparent-input"
                      placeholder={
                        isPublished ? 'Publishing note…' : 'Note not published'
                      }
                      value={publishURL}
                      spellCheck={false}
                    />
                    <div className="settings-item-control">
                      <button
                        ref={e => (this.copyUrlElement = e)}
                        disabled={!publishURL}
                        type="button"
                        className="button button-borderless"
                        onClick={this.copyPublishURL}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                {publishURL && <p>Note published!</p>}
              </div>
            )}
          </div>
        );
    }
  };
}

export default ShareDialog;
