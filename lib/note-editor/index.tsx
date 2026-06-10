import React, { Component } from 'react';
import { connect } from 'react-redux';
import SearchResultsBar from '../search-results-bar';
import TagField from '../tag-field';
import NoteDetail from '../note-detail';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';
import SimplenoteCompactLogo from '../icons/simplenote-compact';

type StateProps = {
  allTags: Map<T.TagHash, T.Tag>;
  isEditorActive: boolean;
  isSearchActive: boolean;
  isSmallScreen: boolean;
  hasSearchMatchesInNote: boolean;
  hasSearchQuery: boolean;
  keyboardShortcuts: boolean;
  noteId: T.EntityId;
  note: T.Note;
};

type DispatchProps = {
  toggleMarkdown: (noteId: T.EntityId, shouldEnableMarkdown: boolean) => any;
  toggleNoteList: () => any;
};

type Props = DispatchProps & StateProps;

export class NoteEditor extends Component<Props> {
  static displayName = 'NoteEditor';

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  markdownEnabled = () => this.props.note?.systemTags.includes('markdown');

  handleShortcut = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }

    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();
    const { note, noteId, toggleMarkdown } = this.props;

    const cmdOrCtrl = ctrlKey || metaKey;

    // toggle Markdown enabled
    if (note && cmdOrCtrl && shiftKey && 'm' === key) {
      toggleMarkdown(noteId, !this.markdownEnabled());
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle between tag editor and note editor
    if (shiftKey && cmdOrCtrl && 'y' === key && this.props.isEditorActive) {
      // prefer focusing the edit field first
      if (!this.editFieldHasFocus() || this.props.isSearchActive) {
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
    const { hasSearchQuery, hasSearchMatchesInNote, note } = this.props;

    if (!note) {
      return (
        <div className="note-detail-placeholder">
          <SimplenoteCompactLogo />
        </div>
      );
    }

    const isTrashed = !!note.deleted;

    return (
      <div className="note-editor">
        <NoteDetail
          storeFocusEditor={this.storeFocusEditor}
          storeHasFocus={this.storeEditorHasFocus}
        />
        {note && !isTrashed && (
          <TagField
            storeFocusTagField={this.storeFocusTagField}
            storeHasFocus={this.storeTagFieldHasFocus}
          />
        )}
        {hasSearchQuery && hasSearchMatchesInNote && <SearchResultsBar />}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  allTags: state.data.tags,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  isEditorActive: !state.ui.showNavigation,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  revision: state.ui.selectedRevision,
  hasSearchQuery: state.ui.searchQuery !== '',
  hasSearchMatchesInNote:
    !!state.ui.numberOfMatchesInNote && state.ui.numberOfMatchesInNote > 0,
  isSearchActive: !!state.ui.searchQuery.length,
  isSmallScreen: selectors.isSmallScreen(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  toggleNoteList: actions.ui.toggleNoteList,
  toggleMarkdown: actions.data.markdownNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
