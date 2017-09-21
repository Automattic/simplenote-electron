import React, { PropTypes } from 'react';
import highlight from 'highlight.js';
import showdown from 'showdown';
import xssFilter from 'showdown-xss-filter';
import { get, debounce, invoke, noop } from 'lodash';
import analytics from './analytics';
import { viewExternalUrl } from './utils/url-utils';
import NoteContentEditor from './note-content-editor';

const saveDelay = 2000;

const markdownConverter = new showdown.Converter({ extensions: [xssFilter] });
markdownConverter.setFlavor('github');

const renderToNode = (node, content) => {
  node.innerHTML = markdownConverter.makeHtml(content);
  node.querySelectorAll('pre code').forEach(highlight.highlightBlock);
};

export default React.createClass({
  propTypes: {
    note: PropTypes.object,
    previewingMarkdown: PropTypes.bool,
    fontSize: PropTypes.number,
    onChangeContent: PropTypes.func.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  },

  getDefaultProps() {
    return {
      storeFocusEditor: noop,
      storeHasFocus: noop,
    };
  },

  componentWillMount: function() {
    this.queueNoteSave = debounce(this.saveNote, saveDelay);
    document.addEventListener('copy', this.copyRenderedNote, false);
  },

  componentDidMount: function() {
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);

    // Ensures note gets saved if user abruptly quits the app
    window.addEventListener('beforeunload', this.queueNoteSave.flush);
  },

  focusEditor() {
    this.focusContentEditor && this.focusContentEditor();
  },

  saveEditorRef(ref) {
    this.editor = ref;
  },

  isValidNote: function(note) {
    return note && note.id;
  },

  componentWillReceiveProps: function() {
    this.queueNoteSave.flush();
  },

  componentDidUpdate: function(prevProps) {
    const { note, previewingMarkdown } = this.props;
    const content = get(note, 'data.content', '');
    if (this.isValidNote(note) && content === '') {
      // Let's focus the editor for new and empty notes
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
  },

  componentWillUnmount: function() {
    window.removeEventListener('beforeunload', this.queueNoteSave.flush);
    document.removeEventListener('copy', this.copyRenderedNote, false);
  },

  copyRenderedNote(event) {
    // Only copy the rendered content if we're in the preview mode
    if (!this.props.previewingMarkdown) {
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
  },

  hasFocus() {
    return this.editorHasFocus && this.editorHasFocus();
  },

  onPreviewClick: function(event) {
    // open markdown preview links in a new window
    for (let node = event.target; node !== null; node = node.parentNode) {
      if (node.tagName === 'A') {
        event.preventDefault();
        viewExternalUrl(node.href);
        break;
      }
    }
  },

  saveNote: function(content) {
    const { note } = this.props;

    if (!this.isValidNote(note)) return;

    this.props.onChangeContent(note, content);
    analytics.tracks.recordEvent('editor_note_edited');
  },

  storeEditorHasFocus(f) {
    this.editorHasFocus = f;
  },

  storeFocusContentEditor(f) {
    this.focusContentEditor = f;
  },

  storePreview(ref) {
    this.previewNode = ref;
  },

  updateMarkdown() {
    if (!this.previewNode) {
      return;
    }

    renderToNode(this.previewNode, this.props.note.data.content);
  },

  render: function() {
    const { filter, fontSize, previewingMarkdown } = this.props;

    const content = get(this.props, 'note.data.content', '');
    const divStyle = { fontSize: `${fontSize}px` };

    return (
      <div className="note-detail">
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
              storeFocusEditor={this.storeFocusContentEditor}
              storeHasFocus={this.storeEditorHasFocus}
              content={content}
              filter={filter}
              onChangeContent={this.queueNoteSave}
            />
          </div>
        )}
      </div>
    );
  },
});
