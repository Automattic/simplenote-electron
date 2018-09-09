import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import NoteDetail from '../note-detail';
import TagField from '../tag-field';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import { get, property } from 'lodash';

import { renderNoteToHtml } from '../utils/render-note-to-html';

export class NoteEditor extends Component {
  static displayName = 'NoteEditor';

  static propTypes = {
    editorMode: PropTypes.oneOf(['edit', 'markdown']),
    note: PropTypes.object,
    revisions: PropTypes.array,
    fontSize: PropTypes.number,
    shouldPrint: PropTypes.bool,
    onSetEditorMode: PropTypes.func.isRequired,
    onUpdateContent: PropTypes.func.isRequired,
    onUpdateNoteTags: PropTypes.func.isRequired,
    onTrashNote: PropTypes.func.isRequired,
    onRestoreNote: PropTypes.func.isRequired,
    onShareNote: PropTypes.func.isRequired,
    onDeleteNoteForever: PropTypes.func.isRequired,
    onRevisions: PropTypes.func.isRequired,
    onCloseNote: PropTypes.func.isRequired,
    onNoteInfo: PropTypes.func.isRequired,
    onPrintNote: PropTypes.func,
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

  componentWillReceiveProps() {
    this.setState({ revision: null });
  }

  state = {
    revision: null,
    isViewingRevisions: false,
  };

  componentDidUpdate() {
    // Immediately print once `shouldPrint` has been set
    if (this.props.shouldPrint) {
      window.print();
      this.props.onNotePrinted();
    }
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

      this.props.onSetEditorMode(nextEditorMode);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // open note list - shift + n
    if (cmdOrCtrl && 'N' === key) {
      this.props.onCloseNote();

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

  onViewRevision = revision => this.setState({ revision: revision });

  onSelectRevision = revision => {
    if (!revision) {
      return;
    }

    const { note, onUpdateContent } = this.props;
    const { data: { content } } = revision;

    onUpdateContent(note, content);
    this.setIsViewingRevisions(false);
  };

  onCancelRevision = () => {
    // clear out the revision
    this.setState({ revision: null });
    this.setIsViewingRevisions(false);
  };

  setIsViewingRevisions = isViewing =>
    this.setState({ isViewingRevisions: isViewing });

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
    const { editorMode, note, revisions, fontSize, shouldPrint } = this.props;
    const revision = this.state.revision || note;
    const isViewingRevisions = this.state.isViewingRevisions;
    const tags = (revision && revision.data && revision.data.tags) || [];
    const isTrashed = !!(note && note.data.deleted);

    const markdownEnabled =
      revision &&
      revision.data &&
      revision.data.systemTags &&
      revision.data.systemTags.indexOf('markdown') !== -1;

    const classes = classNames(
      'note-editor',
      'theme-color-bg',
      'theme-color-fg',
      {
        revisions: isViewingRevisions,
        markdown: markdownEnabled,
        'placeholder-note-detail': !note,
        'theme-color-border': !note,
      }
    );

    const content = get(revision, 'data.content', '');

    const printStyle = {
      fontSize: fontSize + 'px',
    };

    const printAttrs = {
      style: printStyle,
      class: 'note-print note-detail-markdown',
    };

    return (
      <div className={classes}>
        {note && (
          <RevisionSelector
            revisions={revisions || []}
            onViewRevision={this.onViewRevision}
            onSelectRevision={this.onSelectRevision}
            onCancelRevision={this.onCancelRevision}
          />
        )}
        <NoteToolbar
          note={note}
          onTrashNote={this.props.onTrashNote}
          onRestoreNote={this.props.onRestoreNote}
          onShareNote={this.props.onShareNote}
          onDeleteNoteForever={this.props.onDeleteNoteForever}
          onRevisions={this.props.onRevisions}
          setIsViewingRevisions={this.setIsViewingRevisions}
          onCloseNote={this.props.onCloseNote}
          onNoteInfo={this.props.onNoteInfo}
          onSetEditorMode={this.props.onSetEditorMode}
          editorMode={editorMode}
          markdownEnabled={markdownEnabled}
        />
        <NoteDetail
          storeFocusEditor={this.storeFocusEditor}
          storeHasFocus={this.storeEditorHasFocus}
          filter={this.props.filter}
          note={revision}
          previewingMarkdown={markdownEnabled && editorMode === 'markdown'}
          onChangeContent={this.props.onUpdateContent}
          fontSize={fontSize}
        />
        {shouldPrint &&
          markdownEnabled && (
            <div
              {...printAttrs}
              dangerouslySetInnerHTML={{
                __html: renderNoteToHtml(content),
              }}
            />
          )}
        {shouldPrint &&
          !markdownEnabled && <div {...printAttrs}>{content}</div>}
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
  isEditorActive: !state.showNavigation,
  markdownEnabled: settings.markdownEnabled,
});

export default connect(mapStateToProps)(NoteEditor);
