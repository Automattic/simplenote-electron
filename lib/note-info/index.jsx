import React, { Component } from 'react';
import PropTypes from 'prop-types';
import onClickOutside from 'react-onclickoutside';
import { includes, isEmpty } from 'lodash';
import PanelTitle from '../components/panel-title';
import ToggleControl from '../controls/toggle';
import moment from 'moment';
import CrossIcon from '../icons/cross';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { setMarkdown } from '../state/settings/actions';
import filterNotes from '../utils/filter-notes';

export class NoteInfo extends Component {
  static propTypes = {
    note: PropTypes.object,
    markdownEnabled: PropTypes.bool,
    onPinNote: PropTypes.func.isRequired,
    onMarkdownNote: PropTypes.func.isRequired,
    onOutsideClick: PropTypes.func.isRequired,
  };

  handleClickOutside = () => this.props.onOutsideClick();

  copyPublishURL = () => {
    this.publishUrlElement.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      return;
    }

    this.copyUrlElement.focus();
  };

  getPublishURL = url => {
    return isEmpty(url) ? null : `http://simp.ly/p/${url}`;
  };

  render() {
    const { isMarkdown, isPinned, note } = this.props;
    const data = (note && note.data) || {};
    const formattedDate =
      data.modificationDate && formatTimestamp(data.modificationDate);
    const isPublished = includes(data.systemTags, 'published');
    const publishURL = this.getPublishURL(data.publishURL);

    return (
      <div className="note-info theme-color-bg theme-color-fg theme-color-border">
        <div className="note-info-panel note-info-stats theme-color-border">
          <div className="note-info-header">
            <PanelTitle headingLevel="2">Info</PanelTitle>
            <button
              type="button"
              className="about-done button button-borderless"
              onClick={this.handleClickOutside}
            >
              <CrossIcon />
            </button>
          </div>
          {formattedDate && (
            <p className="note-info-item">
              <span className="note-info-item-text">
                <span className="note-info-name">Modified</span>
                <br />
                <span className="note-info-detail">{formattedDate}</span>
              </span>
            </p>
          )}
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name">
                {wordCount(data && data.content)} words
              </span>
            </span>
          </p>
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name">
                {characterCount(data && data.content)} characters
              </span>
            </span>
          </p>
        </div>
        <div className="note-info-panel note-info-pin theme-color-border">
          <label className="note-info-item" htmlFor="note-info-pin-checkbox">
            <span className="note-info-item-text">
              <span className="note-info-name">Pin to top</span>
            </span>
            <span className="note-info-item-control">
              <ToggleControl
                id="note-info-pin-checkbox"
                checked={isPinned}
                onChange={this.onPinChanged}
              />
            </span>
          </label>
        </div>
        <div className="note-info-panel note-info-markdown theme-color-border">
          <label
            className="note-info-item"
            htmlFor="note-info-markdown-checkbox"
          >
            <span className="note-info-item-text">
              <span className="note-info-name">Markdown</span>
              <br />
              <span className="note-info-detail">
                Enable markdown formatting on this note.{' '}
                <a
                  target="_blank"
                  href="http://simplenote.com/help/#markdown"
                  rel="noopener noreferrer"
                >
                  Learn more…
                </a>
              </span>
            </span>
            <span className="note-info-item-control">
              <ToggleControl
                id="note-info-markdown-checkbox"
                checked={isMarkdown}
                onChange={this.onMarkdownChanged}
              />
            </span>
          </label>
        </div>
        {isPublished && (
          <div className="note-info-panel note-info-public-link theme-color-border">
            <span className="note-info-item-text">
              <span className="note-info-name">Public link</span>
              <div className="note-info-form">
                <input
                  ref={e => (this.publishUrlElement = e)}
                  className="note-info-detail note-info-link-text"
                  value={publishURL}
                  spellCheck={false}
                />
                <button
                  ref={e => (this.copyUrlElement = e)}
                  type="button"
                  className="button button-borderless note-info-copy-button"
                  onClick={this.copyPublishURL}
                >
                  Copy
                </button>
              </div>
            </span>
          </div>
        )}
      </div>
    );
  }

  onPinChanged = event =>
    this.props.onPinNote(this.props.note, event.currentTarget.checked);

  onMarkdownChanged = event =>
    this.props.onMarkdownNote(this.props.note, event.currentTarget.checked);
}

function formatTimestamp(unixTime) {
  return moment.unix(unixTime).format('MMM D, YYYY h:mm a');
}

// https://github.com/RadLikeWhoa/Countable
function wordCount(content) {
  const matches = (content || '')
    .replace(/[\u200B]+/, '')
    .trim()
    .replace(/['";:,.?¿\-!¡]+/g, '')
    .match(/\S+/g);

  return (matches || []).length;
}

// https://mathiasbynens.be/notes/javascript-unicode
const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
function characterCount(content) {
  return (
    // then get the length
    (content || '')
      // replace every surrogate pair with a BMP symbol
      .replace(surrogatePairs, '_').length
  );
}

const { markdownNote, pinNote, toggleNoteInfo } = appState.actionCreators;

const mapStateToProps = ({ appState: state }) => {
  const filteredNotes = filterNotes(state);
  const noteIndex = Math.max(state.previousIndex, 0);
  const note = state.note ? state.note : filteredNotes[noteIndex];
  return {
    note,
    isMarkdown: note.data.systemTags.includes('markdown'),
    isPinned: note.data.systemTags.includes('pinned'),
  };
};

const mapDispatchToProps = (dispatch, { noteBucket }) => ({
  onMarkdownNote: (note, markdown = true) => {
    dispatch(markdownNote({ markdown, note, noteBucket }));
    // Update global setting to set markdown flag for new notes
    dispatch(setMarkdown(markdown));
  },
  onOutsideClick: () => dispatch(toggleNoteInfo()),
  onPinNote: (note, pin) => dispatch(pinNote({ noteBucket, note, pin })),
});

export default connect(mapStateToProps, mapDispatchToProps)(
  onClickOutside(NoteInfo)
);
