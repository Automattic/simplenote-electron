import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get } from 'lodash';
import appState from '../flux/app-state';
import TagField from '../tag-field';
import { property } from 'lodash';
import NoteDetail from '../note-detail';

export class NoteEditor extends Component {
  static displayName = 'NoteEditor';

  static propTypes = {
    allTags: PropTypes.array.isRequired,
    closeNote: PropTypes.func.isRequired,
    editorMode: PropTypes.oneOf(['edit', 'markdown']),
    isEditorActive: PropTypes.bool.isRequired,
    isSmallScreen: PropTypes.bool.isRequired,
    filter: PropTypes.string.isRequired,
    note: PropTypes.object,
    noteBucket: PropTypes.object.isRequired,
    fontSize: PropTypes.number,
    onNoteClosed: PropTypes.func.isRequired,
    onUpdateContent: PropTypes.func.isRequired,
    revision: PropTypes.object,
    setEditorMode: PropTypes.func.isRequired,
    syncNote: PropTypes.func.isRequired,
  };

  static defaultProps = {
    editorMode: 'edit',
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

      this.props.setEditorMode({ mode: nextEditorMode });

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

  toggleShortcuts = doEnable => {
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

const mapStateToProps = ({ appState: state, settings, ui: { note } }) => ({
  allTags: state.tags,
  filter: state.filter,
  fontSize: settings.fontSize,
  editorMode: state.editorMode,
  isEditorActive: !state.showNavigation,
  note,
  revision: state.revision,
  tags: get(note, 'data.tags', []),
});

const { closeNote, setEditorMode } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  setEditorMode: args => dispatch(setEditorMode(args)),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
