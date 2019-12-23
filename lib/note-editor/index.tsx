import React, { Component } from 'react';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import TagField from '../tag-field';
import { property } from 'lodash';
import NoteDetail from '../note-detail';

import { State } from '../state';
import { setEditorMode } from '../state/ui/actions';
import * as T from '../types';

type Props = {
  isSmallScreen: boolean;
  note: T.NoteEntity;
  noteBucket: T.Bucket<T.Note>;
  onNoteClosed: Function;
  onUpdateContent: Function;
  syncNote: Function;
};

type ConnectedProps = ReturnType<typeof mapStateToProps> &
  typeof mapDispatchToProps;

export class NoteEditor extends Component<Props & ConnectedProps> {
  static displayName = 'NoteEditor';

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

  handleShortcut = event => {
    const { ctrlKey, key, metaKey, shiftKey } = event;

    const cmdOrCtrl = ctrlKey || metaKey;

    // toggle editor mode
    if (
      cmdOrCtrl &&
      shiftKey &&
      'p' === key.toLowerCase() &&
      this.markdownEnabled
    ) {
      const prevEditorMode = this.props.editorMode;
      const nextEditorMode = prevEditorMode === 'edit' ? 'markdown' : 'edit';

      this.props.setEditorMode(nextEditorMode);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // open note list - shift + n
    if (this.props.isSmallScreen && cmdOrCtrl && shiftKey && 'n' === key) {
      this.props.closeNote();
      this.props.onNoteClosed();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle between tag editor and note editor
    if (cmdOrCtrl && 't' === key && this.props.isEditorActive) {
      // prefer focusing the edit field first
      if (!this.editFieldHasFocus()) {
        this.focusNoteEditor && this.focusNoteEditor();

        event.stopPropagation();
        event.preventDefault();
        return false;
      } else if (!this.tagFieldHasFocus()) {
        this.focusTagField && this.focusTagField();

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

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const { editorMode, note, noteBucket, fontSize } = this.props;
    const revision = this.props.revision || note;
    const tags = (revision && revision.data && revision.data.tags) || [];
    const isTrashed = !!(note && note.data.deleted);

    return (
      <div className="note-editor theme-color-bg theme-color-fg">
        <NoteDetail
          storeFocusEditor={this.storeFocusEditor}
          storeHasFocus={this.storeEditorHasFocus}
          filter={this.props.filter}
          note={revision}
          noteBucket={noteBucket}
          previewingMarkdown={
            this.markdownEnabled() && editorMode === 'markdown'
          }
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

const mapStateToProps = ({
  appState: { filter, revision, showNavigation, tags },
  settings,
  ui: { editorMode },
}: State) => ({
  allTags: tags,
  filter: filter,
  fontSize: settings.fontSize,
  editorMode,
  isEditorActive: !showNavigation,
  revision: revision,
});

const { closeNote } = appState.actionCreators;

const mapDispatchToProps = {
  closeNote,
  setEditorMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
