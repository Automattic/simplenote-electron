import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { get, debounce, invoke, noop } from 'lodash';
import classNames from 'classnames';

import analytics from '../analytics';
import appState from '../flux/app-state';
import { viewExternalUrl } from '../utils/url-utils';
import NoteContentEditor from '../note-content-editor';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import renderToNode from './render-to-node';

const saveDelay = 2000;

export class NoteDetail extends Component {
  static displayName = 'NoteDetail';

  static propTypes = {
    dialogs: PropTypes.array.isRequired,
    filter: PropTypes.string.isRequired,
    fontSize: PropTypes.number,
    isViewingRevisions: PropTypes.bool.isRequired,
    onChangeContent: PropTypes.func.isRequired,
    onNotePrinted: PropTypes.func.isRequired,
    note: PropTypes.object,
    previewingMarkdown: PropTypes.bool,
    shouldPrint: PropTypes.bool.isRequired,
    showNoteInfo: PropTypes.bool.isRequired,
    spellCheckEnabled: PropTypes.bool.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  componentWillMount() {
    this.queueNoteSave = debounce(this.saveNote, saveDelay);
    document.addEventListener('copy', this.copyRenderedNote, false);
  }

  componentDidMount() {
    const { previewingMarkdown } = this.props;
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);

    // Ensures note gets saved if user abruptly quits the app
    window.addEventListener('beforeunload', this.queueNoteSave.flush);

    if (previewingMarkdown) {
      this.updateMarkdown();
    }
  }

  focusEditor = () => this.focusContentEditor && this.focusContentEditor();

  saveEditorRef = ref => (this.editor = ref);

  isValidNote = note => note && note.id;

  componentWillReceiveProps() {
    this.queueNoteSave.flush();
  }

  componentDidUpdate(prevProps) {
    const {
      filter,
      note,
      onNotePrinted,
      previewingMarkdown,
      shouldPrint,
    } = this.props;
    const content = get(note, 'data.content', '');

    // Immediately print once `shouldPrint` has been set
    if (shouldPrint) {
      window.print();
      onNotePrinted();
    }

    // Focus the editor for a new, empty note when not searching
    if (this.isValidNote(note) && content === '' && filter === '') {
      invoke(this, 'editor.focus');
    }

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
    window.removeEventListener('beforeunload', this.queueNoteSave.flush);
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
    // open markdown preview links in a new window
    for (let node = event.target; node !== null; node = node.parentNode) {
      if (node.tagName === 'A') {
        event.preventDefault();
        viewExternalUrl(node.href);
        break;
      }
    }
  };

  saveNote = content => {
    const { note } = this.props;

    if (!this.isValidNote(note)) return;

    this.props.onChangeContent(note, content);
    analytics.tracks.recordEvent('editor_note_edited');
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
    const {
      note,
      filter,
      fontSize,
      isViewingRevisions,
      previewingMarkdown,
      spellCheckEnabled,
    } = this.props;

    const content = get(this.props, 'note.data.content', '');
    const divStyle = { fontSize: `${fontSize}px` };

    const mainClasses = classNames('note-detail', {
      'is-viewing-revisions': isViewingRevisions,
    });

    return (
      <div className="note-detail-wrapper theme-color-border">
        {!note ? (
          <div className="note-detail-placeholder">
            <SimplenoteCompactLogo />
          </div>
        ) : (
          <div className={mainClasses}>
            {previewingMarkdown && (
              <div
                ref={this.storePreview}
                className="note-detail-markdown theme-color-bg theme-color-fg"
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
                  ref={this.saveEditorRef}
                  spellCheckEnabled={spellCheckEnabled}
                  storeFocusEditor={this.storeFocusContentEditor}
                  storeHasFocus={this.storeEditorHasFocus}
                  content={content}
                  filter={filter}
                  onChangeContent={this.queueNoteSave}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state, settings }) => ({
  dialogs: state.dialogs,
  filter: state.filter,
  isViewingRevisions: state.isViewingRevisions,
  shouldPrint: state.shouldPrint,
  showNoteInfo: state.showNoteInfo,
  spellCheckEnabled: settings.spellCheckEnabled,
});

const { setShouldPrintNote } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  onNotePrinted: () => dispatch(setShouldPrintNote({ shouldPrint: false })),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteDetail);
