import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import NoteDetail from '../note-detail';
import TagField from '../tag-field';
import { property } from 'lodash';

export class NoteEditor extends Component {
  static displayName = 'NoteEditor';

  static propTypes = {
    closeNote: PropTypes.func.isRequired,
    editorMode: PropTypes.oneOf(['edit', 'markdown']),
    markdownEnabled: PropTypes.bool.isRequired,
    note: PropTypes.object,
    fontSize: PropTypes.number,
    shouldPrint: PropTypes.bool,
    onUpdateContent: PropTypes.func.isRequired,
    onUpdateNoteTags: PropTypes.func.isRequired,
    revision: PropTypes.object,
    setEditorMode: PropTypes.func.isRequired,
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

  handleShortcut = event => {
    const { ctrlKey, key, metaKey } = event;

    const cmdOrCtrl = ctrlKey || metaKey;

    // toggle editor mode
    if (cmdOrCtrl && 'P' === key && this.props.markdownEnabled) {
      const prevEditorMode = this.props.editorMode;
      const nextEditorMode = prevEditorMode === 'edit' ? 'markdown' : 'edit';

      this.props.setEditorMode({ mode: nextEditorMode });

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // open note list - shift + n
    if (cmdOrCtrl && 'N' === key) {
      this.props.closeNote();

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
    const { editorMode, note, fontSize } = this.props;
    const revision = this.props.revision || note;
    const tags = (revision && revision.data && revision.data.tags) || [];
    const isTrashed = !!(note && note.data.deleted);

    const markdownEnabled =
      revision &&
      revision.data &&
      revision.data.systemTags &&
      revision.data.systemTags.indexOf('markdown') !== -1;

    return (
      <div className="note-editor theme-color-bg theme-color-fg">
        <NoteDetail
          storeFocusEditor={this.storeFocusEditor}
          storeHasFocus={this.storeEditorHasFocus}
          filter={this.props.filter}
          note={revision}
          previewingMarkdown={markdownEnabled && editorMode === 'markdown'}
          onChangeContent={this.props.onUpdateContent}
          fontSize={fontSize}
        />
        {note &&
          !isTrashed && (
            <TagField
              storeFocusTagField={this.storeFocusTagField}
              storeHasFocus={this.storeTagFieldHasFocus}
              allTags={this.props.allTags.map(property('data.name'))}
              note={this.props.note}
              tags={tags}
              onUpdateNoteTags={this.props.onUpdateNoteTags.bind(null, note)}
            />
          )}
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state, settings }) => ({
  fontSize: settings.fontSize,
  editorMode: state.editorMode,
  isEditorActive: !state.showNavigation,
  markdownEnabled: settings.markdownEnabled,
  revision: state.revision,
});

const { closeNote, setEditorMode } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  setEditorMode: args => dispatch(setEditorMode(args)),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
