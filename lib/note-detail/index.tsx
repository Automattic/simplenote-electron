import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get, debounce, noop } from 'lodash';
import analytics from '../analytics';
import { viewExternalUrl } from '../utils/url-utils';
import NoteContentEditor from '../note-content-editor';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import renderToNode from './render-to-node';
import toggleTask from './toggle-task';

import * as S from '../state';

const syncDelay = 2000;

type StateProps = {
  showNoteInfo: boolean;
};

type Props = StateProps;

export class NoteDetail extends Component<Props> {
  static displayName = 'NoteDetail';

  static propTypes = {
    dialogs: PropTypes.array.isRequired,
    fontSize: PropTypes.number,
    onChangeContent: PropTypes.func.isRequired,
    syncNote: PropTypes.func.isRequired,
    note: PropTypes.object,
    noteBucket: PropTypes.object.isRequired,
    previewingMarkdown: PropTypes.bool,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  componentWillMount() {
    this.queueNoteSync = debounce(this.syncNote, syncDelay);
    document.addEventListener('copy', this.copyRenderedNote, false);
  }

  componentDidMount() {
    const { previewingMarkdown } = this.props;
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);

    // Ensures note gets saved if user abruptly quits the app
    window.addEventListener('beforeunload', this.queueNoteSync.flush);

    if (previewingMarkdown) {
      this.updateMarkdown();
    }
  }

  focusEditor = () => this.focusContentEditor && this.focusContentEditor();

  isValidNote = note => note && note.id;

  componentWillReceiveProps(nextProps) {
    const isEditingNote = get(this.props, ['note', 'id'], false);
    if (isEditingNote === false) {
      return;
    }
    if (get(nextProps, ['note', 'id']) !== isEditingNote) {
      this.queueNoteSync.flush();
    }
  }

  componentDidUpdate(prevProps) {
    const { note, previewingMarkdown } = this.props;

    const prevContent = get(prevProps, 'note.data.content', '');
    const nextContent = get(this.props, 'note.data.content', '');

    if (
      (previewingMarkdown &&
        (prevProps.note !== note || prevContent !== nextContent)) ||
      (!prevProps.previewingMarkdown && this.props.previewingMarkdown)
    ) {
      this.updateMarkdown();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.queueNoteSync.flush);
    document.removeEventListener('copy', this.copyRenderedNote, false);
  }

  copyRenderedNote = event => {
    const { previewingMarkdown, showNoteInfo, dialogs } = this.props;
    // Only copy the rendered content if we're in the preview mode
    if (!previewingMarkdown) {
      return true;
    }

    // Only copy if not viewing the note info panel or a dialog
    if (showNoteInfo || dialogs.length > 0) {
      return true;
    }

    // Only copy the rendered content if nothing is selected
    if (!document.getSelection().isCollapsed) {
      return true;
    }

    const node = document.createDocumentFragment();
    const div = document.createElement('div');
    renderToNode(div, this.props.note.data.content);
    node.appendChild(div);

    event.clipboardData.setData('text/plain', div.innerHTML);
    event.preventDefault();
  };

  hasFocus = () => this.editorHasFocus && this.editorHasFocus();

  onPreviewClick = event => {
    const { note, onChangeContent, syncNote } = this.props;

    for (let node = event.target; node !== null; node = node.parentNode) {
      // open markdown preview links in a new window
      if (node.tagName === 'A') {
        event.preventDefault();
        viewExternalUrl(node.href);
        break;
      }

      // handle task list items
      if (node.className === 'task-list-item') {
        event.preventDefault();
        toggleTask({ taskNode: node, text: note.data.content }).then(
          newContent => {
            onChangeContent(note, newContent);
            syncNote(note.id);
          }
        );
        break;
      }
    }
  };

  saveNote = content => {
    const { note } = this.props;

    if (!this.isValidNote(note)) return;

    this.props.onChangeContent(note, content);
    this.queueNoteSync();
    analytics.tracks.recordEvent('editor_note_edited');
  };

  syncNote = () => {
    const { note } = this.props;

    if (!this.isValidNote(note)) return;

    this.props.syncNote(note.id);
  };

  storeEditorHasFocus = f => (this.editorHasFocus = f);

  storeFocusContentEditor = f => (this.focusContentEditor = f);

  storePreview = ref => (this.previewNode = ref);

  updateMarkdown = () => {
    if (!this.previewNode) {
      return;
    }

    renderToNode(this.previewNode, this.props.note.data.content);
  };

  render() {
    const { note, fontSize, previewingMarkdown } = this.props;

    const content = {
      text: get(note, 'data.content', ''),
      hasRemoteUpdate: get(note, 'hasRemoteUpdate', false),
      version: get(note, 'version', undefined),
    };
    const divStyle = { fontSize: `${fontSize}px` };

    return (
      <div className="note-detail-wrapper">
        {!note ? (
          <div className="note-detail-placeholder">
            <SimplenoteCompactLogo />
          </div>
        ) : (
          <div className="note-detail">
            {previewingMarkdown && (
              <div
                ref={this.storePreview}
                className="note-detail-markdown theme-color-bg theme-color-fg"
                data-markdown-root
                onClick={this.onPreviewClick}
                style={divStyle}
              />
            )}

            {!previewingMarkdown && (
              <div
                className="note-detail-textarea theme-color-bg theme-color-fg"
                style={divStyle}
              >
                <NoteContentEditor
                  storeFocusEditor={this.storeFocusContentEditor}
                  storeHasFocus={this.storeEditorHasFocus}
                  noteId={get(note, 'id', null)}
                  content={content}
                  onChangeContent={this.saveNote}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({ appState: state, ui }) => ({
  dialogs: state.dialogs,
  note: ui.selectedRevision || ui.note,
  showNoteInfo: ui.showNoteInfo,
});

export default connect(mapStateToProps)(NoteDetail);
