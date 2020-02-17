import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import TagField from '../tag-field';
import { property } from 'lodash';
import NoteDetail from '../note-detail';
import { toggleEditMode } from '../state/ui/actions';

import { closeNote } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type DispatchProps = {
  toggleEditMode: () => any;
};

type StateProps = {
  note: T.NoteEntity | null;
};

type Props = DispatchProps & StateProps;

export class NoteEditor extends Component<Props> {
  static displayName = 'NoteEditor';

  static propTypes = {
    allTags: PropTypes.array.isRequired,
    isEditorActive: PropTypes.bool.isRequired,
    isSmallScreen: PropTypes.bool.isRequired,
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
      this.props.toggleEditMode();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // open note list - shift + n
    if (
      this.props.isSmallScreen &&
      cmdOrCtrl &&
      shiftKey &&
      'n' === key.toLowerCase()
    ) {
      this.props.closeNote();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // toggle between tag editor and note editor
    if (cmdOrCtrl && 't' === key.toLowerCase() && this.props.isEditorActive) {
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
  ui: { note, editMode },
}) => ({
  allTags: state.tags,
  fontSize: settings.fontSize,
  editMode,
  isEditorActive: !state.showNavigation,
  note,
  revision: state.revision,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  toggleEditMode: () => dispatch(toggleEditMode()),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteEditor);
