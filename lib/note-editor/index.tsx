import React, { Component } from 'react';
import { connect } from 'react-redux';
import TagField from '../tag-field';
import NoteDetail from '../note-detail';
import NotePreview from '../components/note-preview';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';
import SimplenoteCompactLogo from '../icons/simplenote-compact';

type StateProps = {
  allTags: Map<T.EntityId, T.Tag>;
  editMode: boolean;
  isEditorActive: boolean;
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  lastUpdated: number;
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  toggleMarkdown: (noteId: T.EntityId, shouldEnableMarkdown: boolean) => any;
  toggleNoteList: () => any;
  toggleEditMode: () => any;
};

type Props = DispatchProps & StateProps;

export class NoteEditor extends Component<Props> {
  static displayName = 'NoteEditor';

  componentDidMount() {
    this.toggleShortcuts(true);
    this.timer = setInterval(() => this?.forceUpdate?.(), 1000);
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
    clearTimeout(this.timer);
  }

  markdownEnabled = () => this.props.note?.systemTags.includes('markdown');

  handleShortcut = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }
    const { code, ctrlKey, metaKey, shiftKey } = event;
    const { note, noteId, toggleMarkdown } = this.props;

    const cmdOrCtrl = ctrlKey || metaKey;

    // toggle Markdown enabled
    if (note && cmdOrCtrl && shiftKey && 'KeyM' === code) {
      console.log('toggling markdown');
      toggleMarkdown(noteId, !this.markdownEnabled());
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle editor mode
    if (cmdOrCtrl && shiftKey && 'KeyP' === code && this.markdownEnabled()) {
      this.props.toggleEditMode();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle between tag editor and note editor
    if (shiftKey && cmdOrCtrl && 'KeyY' === code && this.props.isEditorActive) {
      // prefer focusing the edit field first
      if (!this.editFieldHasFocus()) {
        this.focusNoteEditor?.();

        event.stopPropagation();
        event.preventDefault();
        return false;
      } else {
        this.focusTagField?.();

        event.stopPropagation();
        event.preventDefault();
        return false;
      }
    }

    return true;
  };

  editFieldHasFocus = () => this.editorHasFocus && this.editorHasFocus();

  storeEditorHasFocus = (f) => (this.editorHasFocus = f);

  storeFocusEditor = (f) => (this.focusNoteEditor = f);

  storeFocusTagField = (f) => (this.focusTagField = f);

  storeTagFieldHasFocus = (f) => (this.tagFieldHasFocus = f);

  tagFieldHasFocus = () => this.tagFieldHasFocus && this.tagFieldHasFocus();

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const { editMode, lastUpdated, note, noteId } = this.props;

    if (!note) {
      return (
        <div className="note-detail-placeholder">
          <SimplenoteCompactLogo />
        </div>
      );
    }

    const isTrashed = !!note.deleted;

    return (
      <div className="note-editor theme-color-bg theme-color-fg">
        <div>
          Note last updated: {Math.floor((Date.now() - lastUpdated) / 1000)}s
          ago ({new Date(lastUpdated).toLocaleTimeString()})
        </div>
        {editMode || !note.systemTags.includes('markdown') ? (
          <NoteDetail
            storeFocusEditor={this.storeFocusEditor}
            storeHasFocus={this.storeEditorHasFocus}
          />
        ) : (
          <NotePreview noteId={noteId} />
        )}
        {note && !isTrashed && (
          <TagField
            storeFocusTagField={this.storeFocusTagField}
            storeHasFocus={this.storeTagFieldHasFocus}
          />
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  allTags: state.data.tags[0],
  editMode: state.ui.editMode,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  isEditorActive: !state.ui.showNavigation,
  lastUpdated: state.simperium.lastSync.get(state.ui.openedNote),
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  revision: state.ui.selectedRevision,
  isSmallScreen: selectors.isSmallScreen(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  toggleNoteList: actions.ui.toggleNoteList,
  toggleMarkdown: actions.data.markdownNote,
  toggleEditMode: actions.ui.toggleEditMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
