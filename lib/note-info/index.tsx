import React, { Component } from 'react';
import Modal from 'react-modal';
import { connect } from 'react-redux';

import LastSyncTime from '../components/last-sync-time';
import SmallCrossIcon from '../icons/cross-small';
import References from './references';

import actions from '../state/actions';
import { getTheme } from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  noteId: T.EntityId;
  note: T.Note;
  theme: string;
};

type DispatchProps = {
  onModalClose: () => any;
};

type Props = StateProps & DispatchProps;

export class NoteInfo extends Component<Props> {
  static displayName = 'NoteInfo';

  render() {
    const { noteId, note, onModalClose, theme } = this.props;
    const creationDate = note.creationDate * 1000;
    const modificationDate = note.modificationDate
      ? note.modificationDate * 1000
      : null;

    return (
      <Modal
        key="note-info-modal"
        className="dialog-renderer__content note-info theme-color-border theme-color-bg theme-color-fg dialog"
        contentLabel="Document"
        isOpen
        onRequestClose={onModalClose}
        overlayClassName="dialog-renderer__overlay"
        portalClassName={`dialog-renderer__portal theme-${theme}`}
        shouldCloseOnOverlayClick={false}
      >
        <div className="note-info-panel note-info-stats theme-color-border theme-color-fg-dim">
          <div className="note-info-header theme-color-border">
            <h2 className="panel-title theme-color-fg">Document</h2>
            <button
              type="button"
              aria-label="Close note info"
              className="about-done button icon-button"
              onClick={onModalClose}
            >
              <SmallCrossIcon />
            </button>
          </div>
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name theme-color-fg">Last synced</span>
              <span className="note-info-detail theme-color-fg-dim">
                <LastSyncTime noteId={noteId} />
              </span>
            </span>
          </p>
          {modificationDate && (
            <p className="note-info-item">
              <span className="note-info-item-text">
                <span className="note-info-name theme-color-fg">Modified</span>
                <span className="note-info-detail theme-color-fg-dim">
                  <time dateTime={new Date(modificationDate).toISOString()}>
                    {new Date(modificationDate).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </time>
                </span>
              </span>
            </p>
          )}
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name theme-color-fg">Created</span>
              <span className="note-info-detail theme-color-fg-dim">
                <time dateTime={new Date(creationDate).toISOString()}>
                  {new Date(creationDate).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </time>
              </span>
            </span>
          </p>
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name theme-color-fg">Words</span>
              <span className="note-info-detail theme-color-fg-dim">
                {wordCount(note.content)}
              </span>
            </span>
          </p>
          <p className="note-info-item">
            <span className="note-info-item-text">
              <span className="note-info-name theme-color-fg">Characters</span>
              <span className="note-info-detail theme-color-fg-dim">
                {characterCount(note.content)}
              </span>
            </span>
          </p>
        </div>
        <References></References>
      </Modal>
    );
  }
}

// https://github.com/RadLikeWhoa/Countable
function wordCount(content: string) {
  const matches = (content || '')
    .replace(/[\u200B]+/, '')
    .trim()
    .replace(/['";:,.?¿\-!¡]+/g, '')
    .match(/\S+/g);

  return (matches || []).length;
}

// https://mathiasbynens.be/notes/javascript-unicode
const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
function characterCount(content: string) {
  return (
    // then get the length
    (content || '')
      // replace every surrogate pair with a BMP symbol
      .replace(surrogatePairs, '_').length
  );
}

const mapStateToProps: S.MapState<StateProps> = (state) => {
  const note = state.data.notes.get(state.ui.openedNote);

  return {
    noteId: state.ui.openedNote,
    note: note,
    theme: getTheme(state),
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  onModalClose: actions.ui.toggleNoteInfo,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteInfo);
