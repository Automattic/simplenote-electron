import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import TagField from '../tag-field';
import { property } from 'lodash';
import NoteDetail from '../note-detail';
import { toggleEditMode } from '../state/ui/actions';

import { markdownNote, toggleNoteList } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  isSmallScreen: boolean;
};

type StateProps = {
  note: T.NoteEntity | null;
};

type DispatchProps = {
  toggleMarkdown: (note: T.NoteEntity, enableMarkdown: boolean) => any;
  toggleNoteList: () => any;
  toggleEditMode: () => any;
};

type Props = OwnProps & DispatchProps & StateProps;

export class NoteEditor extends Component<Props> {
  static displayName = 'NoteEditor';

  static propTypes = {
    allTags: PropTypes.array.isRequired,
    isEditorActive: PropTypes.bool.isRequired,
    noteBucket: PropTypes.object.isRequired,
    fontSize: PropTypes.number,
    onUpdateContent: PropTypes.func.isRequired,
    revision: PropTypes.object,
    syncNote: PropTypes.func.isRequired,
  };

  static defaultProps = {
    note: {
      data: {
        tags: [],
      },
    },
  };

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  markdownEnabled = () => {
    const revision = this.props.revision || this.props.note;
    return (
      revision &&
      revision.data &&
      revision.data.systemTags &&
      revision.data.systemTags.indexOf('markdown') !== -1
    );
  };

  handleShortcut = (event: KeyboardEvent) => {
    const { code, ctrlKey, metaKey, shiftKey } = event;
    const { note, revision, toggleMarkdown } = this.props;

    const cmdOrCtrl = ctrlKey || metaKey;

    // toggle Markdown enabled
    if (!revision && note && cmdOrCtrl && shiftKey && 'KeyM' === code) {
      toggleMarkdown(note, !this.markdownEnabled());
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

    // open note list
    if (this.props.isSmallScreen && cmdOrCtrl && shiftKey && 'KeyL' === code) {
      this.props.toggleNoteList();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle between tag editor and note editor
    if (
      !shiftKey &&
      cmdOrCtrl &&
      'KeyT' === code &&
      this.props.isEditorActive
    ) {
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

  storeEditorHasFocus = f => (this.editorHasFocus = f);

  storeFocusEditor = f => (this.focusNoteEditor = f);

  storeFocusTagField = f => (this.focusTagField = f);

  storeTagFieldHasFocus = f => (this.tagFieldHasFocus = f);

  tagFieldHasFocus = () => this.tagFieldHasFocus && this.tagFieldHasFocus();

  toggleShortcuts = doEnable => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const { editMode, note, noteBucket, fontSize } = this.props;
    const revision = this.props.revision || note;
    const tags = (revision && revision.data && revision.data.tags) || [];
    const isTrashed = !!(note && note.data.deleted);

    return (
      <div className="note-editor theme-color-bg theme-color-fg">
        <NoteDetail
          storeFocusEditor={this.storeFocusEditor}
          storeHasFocus={this.storeEditorHasFocus}
          noteBucket={noteBucket}
          previewingMarkdown={this.markdownEnabled() && !editMode}
          onChangeContent={this.props.onUpdateContent}
          syncNote={this.props.syncNote}
          fontSize={fontSize}
        />
        {note && !isTrashed && (
          <TagField
            storeFocusTagField={this.storeFocusTagField}
            storeHasFocus={this.storeTagFieldHasFocus}
            allTags={this.props.allTags.map(property('data.name'))}
            note={this.props.note}
            tags={tags}
          />
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  appState: state,
  settings,
  tags,
  ui: { note, editMode, selectedRevision },
}) => ({
  allTags: tags,
  fontSize: settings.fontSize,
  editMode,
  isEditorActive: !state.showNavigation,
  note,
  revision: selectedRevision,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  toggleNoteList: () => dispatch(toggleNoteList()),
  toggleMarkdown: (note, enableMarkdown) =>
    dispatch(markdownNote(note, enableMarkdown)),
  toggleEditMode: () => dispatch(toggleEditMode()),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
