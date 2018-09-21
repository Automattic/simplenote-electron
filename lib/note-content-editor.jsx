import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { ContentState, Editor, EditorState, Modifier } from 'draft-js';
import { get, includes, invoke, noop } from 'lodash';

import { filterHasText, searchPattern } from './utils/filter-notes';
import { LF_ONLY_NEWLINES } from './utils/export';
import matchingTextDecorator from './editor/matching-text-decorator';

function plainTextContent(editorState) {
  return editorState.getCurrentContent().getPlainText('\n');
}

function getCurrentBlock(editorState) {
  const key = editorState.getSelection().getFocusKey();
  return editorState.getCurrentContent().getBlockForKey(key);
}

const isLonelyBullet = line => includes(['-', '*', '+'], line.trim());

function indentCurrentBlock(editorState) {
  const selection = editorState.getSelection();
  const selectionStart = selection.getStartOffset();

  const line = getCurrentBlock(editorState).getText();
  const atStart = isLonelyBullet(line);
  const offset = atStart ? 0 : selectionStart;

  // add tab
  const afterInsert = EditorState.push(
    editorState,
    Modifier.replaceText(
      editorState.getCurrentContent(),
      selection.isCollapsed()
        ? selection.merge({
            anchorOffset: offset,
            focusOffset: offset,
          })
        : selection,
      '\t'
    ),
    'insert-characters'
  );

  // move selection to where it was
  return EditorState.forceSelection(
    afterInsert,
    afterInsert.getSelection().merge({
      anchorOffset: selectionStart + 1, // +1 because 1 char was added
      focusOffset: selectionStart + 1,
    })
  );
}

function outdentCurrentBlock(editorState) {
  const selection = editorState.getSelection();
  const selectionStart = selection.getStartOffset();

  const line = getCurrentBlock(editorState).getText();
  const atStart = isLonelyBullet(line);
  const rangeStart = atStart ? 0 : selectionStart - 1;
  const rangeEnd = atStart ? 1 : selectionStart;

  const prevChar = line.slice(rangeStart, rangeEnd);
  // there's no indentation to remove
  if (prevChar !== '\t') {
    return editorState;
  }

  // remove tab
  const afterRemove = EditorState.push(
    editorState,
    Modifier.removeRange(
      editorState.getCurrentContent(),
      selection.merge({
        anchorOffset: rangeStart,
        focusOffset: rangeEnd,
      })
    ),
    'remove-range'
  );

  // move selection to where it was
  return EditorState.forceSelection(
    afterRemove,
    selection.merge({
      anchorOffset: selectionStart - 1, // -1 because 1 char was removed
      focusOffset: selectionStart - 1,
    })
  );
}

function finishList(editorState) {
  // remove `- ` from the current line
  const withoutBullet = EditorState.push(
    editorState,
    Modifier.removeRange(
      editorState.getCurrentContent(),
      editorState.getSelection().merge({
        anchorOffset: 0,
        focusOffset: getCurrentBlock(editorState).getLength(),
      })
    ),
    'remove-range'
  );

  // move selection to the start of the line
  return EditorState.forceSelection(
    withoutBullet,
    withoutBullet.getCurrentContent().getSelectionAfter()
  );
}

function continueList(editorState, listItemMatch) {
  // create a new line
  const withNewLine = EditorState.push(
    editorState,
    Modifier.splitBlock(
      editorState.getCurrentContent(),
      editorState.getSelection()
    ),
    'split-block'
  );

  // insert `- ` in the new line
  const withBullet = EditorState.push(
    withNewLine,
    Modifier.insertText(
      withNewLine.getCurrentContent(),
      withNewLine.getCurrentContent().getSelectionAfter(),
      listItemMatch[0]
    ),
    'insert-characters'
  );

  // move selection to the end of the new line
  return EditorState.forceSelection(
    withBullet,
    withBullet.getCurrentContent().getSelectionAfter()
  );
}

export default class NoteContentEditor extends Component {
  static propTypes = {
    content: PropTypes.string.isRequired,
    onChangeContent: PropTypes.func.isRequired,
    spellCheckEnabled: PropTypes.bool.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  state = {
    editorState: EditorState.createWithContent(
      ContentState.createFromText(this.props.content, '\n'),
      filterHasText(this.props.filter) &&
        matchingTextDecorator(searchPattern(this.props.filter))
    ),
  };

  componentWillMount() {
    document.addEventListener('copy', this.stripFormattingFromSelectedText);
    document.addEventListener('cut', this.stripFormattingFromSelectedText);
  }

  componentDidMount() {
    this.props.storeFocusEditor(this.focus);
    this.props.storeHasFocus(this.hasFocus);
  }

  componentWillUnmount() {
    document.removeEventListener('copy', this.stripFormattingFromSelectedText);
    document.removeEventListener('cut', this.stripFormattingFromSelectedText);
  }

  stripFormattingFromSelectedText(event) {
    if (
      event.path.filter(elem =>
        includes(elem.className, 'note-detail-textarea')
      ).length
    ) {
      const selectedText = window.getSelection().toString();
      // Replace \n with \r\n to keep line breaks on Windows
      event.clipboardData.setData(
        'text/plain',
        selectedText.replace(LF_ONLY_NEWLINES, '\r\n')
      );
      event.clipboardData.setData(
        'text/html',
        selectedText.replace(/(?:\r\n|\r|\n)/g, '<br />')
      );
      event.preventDefault();
    }
  }

  saveEditorRef = ref => {
    this.editor = ref;
  };

  handleEditorStateChange = editorState => {
    if (editorState === this.state.editorState) {
      return;
    }

    const nextContent = plainTextContent(editorState);
    const prevContent = plainTextContent(this.state.editorState);

    const announceChanges =
      nextContent !== prevContent
        ? () => this.props.onChangeContent(nextContent)
        : noop;

    this.setState({ editorState }, announceChanges);
  };

  componentWillReceiveProps({ content: newContent, filter: nextFilter }) {
    const { filter: prevFilter } = this.props;
    const { editorState: oldEditorState } = this.state;

    if (
      newContent === plainTextContent(oldEditorState) &&
      nextFilter === prevFilter
    ) {
      return; // identical to rendered content
    }

    let newEditorState = EditorState.createWithContent(
      ContentState.createFromText(newContent, '\n'),
      filterHasText(nextFilter) &&
        matchingTextDecorator(searchPattern(nextFilter))
    );

    // avoids weird caret position if content is changed
    // while the editor had focus, see
    // https://github.com/facebook/draft-js/issues/410#issuecomment-223408160
    if (oldEditorState.getSelection().getHasFocus()) {
      newEditorState = EditorState.moveFocusToEnd(newEditorState);
    }

    this.setState({ editorState: newEditorState });
  }

  focus = () => {
    invoke(this, 'editor.focus');
  };

  /**
   * This is highly-specific and coupled to the Draft-JS
   * interface but for now it's what we have to do to
   * determine if the editor is focused. Should we come
   * up with a better method to determine if the user is
   * currently working in the editor/editor area we can
   * replace this function with that method.
   *
   * @returns {boolean} whether the editor area is focused
   */
  hasFocus = () => {
    return (
      this.editor &&
      document.activeElement ===
        get(ReactDOM.findDOMNode(this.editor), 'children[0].children[0]') // eslint-disable-line react/no-find-dom-node
    );
  };

  onTab = e => {
    const { editorState } = this.state;

    // prevent moving focus to next input
    e.preventDefault();

    if (!editorState.getSelection().isCollapsed() && e.shiftKey) {
      return;
    }

    if (e.altKey || e.ctrlKey || e.metaKey) {
      return;
    }

    this.handleEditorStateChange(
      e.shiftKey
        ? outdentCurrentBlock(editorState)
        : indentCurrentBlock(editorState)
    );
  };

  handleReturn = () => {
    // matches lines that start with `- `, `* `, or `+ `
    // preceded by 0 or more space characters
    // i.e. a line prefixed by a list bullet
    const listItemRe = /^[ \t\u2000-\u200a]*[-*+]\s/;

    const { editorState } = this.state;
    const line = getCurrentBlock(editorState).getText();

    if (isLonelyBullet(line)) {
      this.handleEditorStateChange(finishList(editorState));
      return 'handled';
    }

    const listItemMatch = line.match(listItemRe);
    if (listItemMatch) {
      this.handleEditorStateChange(continueList(editorState, listItemMatch));
      return 'handled';
    }

    return 'not-handled';
  };

  render() {
    return (
      <Editor
        ref={this.saveEditorRef}
        spellCheck={this.props.spellCheckEnabled}
        stripPastedStyles
        onChange={this.handleEditorStateChange}
        editorState={this.state.editorState}
        onTab={this.onTab}
        handleReturn={this.handleReturn}
      />
    );
  }
}
