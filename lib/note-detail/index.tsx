import React, { Component, createRef } from 'react';
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
import * as T from '../types';

const syncDelay = 2000;

type OwnProps = {
  previewingMarkdown: boolean;
};

type StateProps = {
  isDialogOpen: boolean;
  note: T.NoteEntity | null;
  searchQuery: string;
  showNoteInfo: boolean;
};

type Props = OwnProps & StateProps;

export class NoteDetail extends Component<Props> {
  static displayName = 'NoteDetail';

  static propTypes = {
    fontSize: PropTypes.number,
    onChangeContent: PropTypes.func.isRequired,
    syncNote: PropTypes.func.isRequired,
    note: PropTypes.object,
    noteBucket: PropTypes.object.isRequired,
    previewingMarkdown: PropTypes.bool,
    spellCheckEnabled: PropTypes.bool.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  previewNode = createRef<HTMLDivElement>();

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
    const { note, previewingMarkdown, searchQuery } = this.props;

    const prevContent = get(prevProps, 'note.data.content', '');
    const nextContent = get(this.props, 'note.data.content', '');

    if (
      (previewingMarkdown &&
        (prevProps.note !== note ||
          prevContent !== nextContent ||
          prevProps.searchQuery !== searchQuery)) ||
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
    const { previewingMarkdown, showNoteInfo, isDialogOpen } = this.props;
    // Only copy the rendered content if we're in the preview mode
    if (!previewingMarkdown) {
      return true;
    }

    // Only copy if not viewing the note info panel or a dialog
    if (showNoteInfo || isDialogOpen) {
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

  updateMarkdown = () => {
    if (
      !this.props.previewingMarkdown ||
      !this.props.note ||
      !this.previewNode.current
    ) {
      return;
    }

    renderToNode(
      this.previewNode.current,
      this.props.note.data.content,
      this.props.searchQuery
    );
  };

  render() {
    const {
      note,
      fontSize,
      previewingMarkdown,
      spellCheckEnabled,
    } = this.props;

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
                ref={this.previewNode}
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
                  spellCheckEnabled={spellCheckEnabled}
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

const mapStateToProps: S.MapState<StateProps> = ({ ui, settings }) => ({
  isDialogOpen: ui.dialogs.length > 0,
  note: ui.selectedRevision || ui.note,
  searchQuery: ui.searchQuery,
  showNoteInfo: ui.showNoteInfo,
  spellCheckEnabled: settings.spellCheckEnabled,
});

export default connect(mapStateToProps)(NoteDetail);
