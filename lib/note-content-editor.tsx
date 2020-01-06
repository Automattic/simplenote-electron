import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ContentState, Editor, EditorState, Modifier } from 'draft-js';
import MultiDecorator from 'draft-js-multidecorators';
import { compact, get, invoke, noop } from 'lodash';

import {
  getCurrentBlock,
  getEquivalentSelectionState,
  getSelectedText,
  plainTextContent,
} from './editor/utils';
import {
  continueList,
  finishList,
  indentCurrentBlock,
  outdentCurrentBlock,
  isLonelyBullet,
} from './editor/text-manipulation-helpers';
import { filterHasText, searchPattern } from './utils/filter-notes';
import matchingTextDecorator from './editor/matching-text-decorator';
import checkboxDecorator from './editor/checkbox-decorator';
import { removeCheckbox, shouldRemoveCheckbox } from './editor/checkbox-utils';
import { taskRegex } from './note-detail/toggle-task/constants';
import insertOrRemoveCheckboxes from './editor/insert-or-remove-checkboxes';
import { getIpcRenderer } from './utils/electron';
import analytics from './analytics';

const TEXT_DELIMITER = '\n';

export default class NoteContentEditor extends Component {
  static propTypes = {
    content: PropTypes.shape({
      text: PropTypes.string.isRequired,
      hasRemoteUpdate: PropTypes.bool.isRequired,
      version: PropTypes.string,
    }),
    filter: PropTypes.string.isRequired,
    noteId: PropTypes.string,
    onChangeContent: PropTypes.func.isRequired,
    spellCheckEnabled: PropTypes.bool.isRequired,
    storeFocusEditor: PropTypes.func,
    storeHasFocus: PropTypes.func,
  };

  static defaultProps = {
    storeFocusEditor: noop,
    storeHasFocus: noop,
  };

  ipc = getIpcRenderer();

  replaceRangeWithText = (rangeToReplace, newText) => {
    const { editorState } = this.state;
    const newContentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      rangeToReplace,
      newText
    );
    this.handleEditorStateChange(
      EditorState.push(editorState, newContentState, 'replace-text')
    );
  };

  generateDecorators = filter => {
    return new MultiDecorator(
      compact([
        filterHasText(filter) && matchingTextDecorator(searchPattern(filter)),
        checkboxDecorator(this.replaceRangeWithText),
      ])
    );
  };

  createNewEditorState = (text, filter) => {
    const newEditorState = EditorState.createWithContent(
      ContentState.createFromText(text, TEXT_DELIMITER),
      this.generateDecorators(filter)
    );

    // Focus the editor for a new, empty note when not searching
    if (text === '' && filter === '') {
      return EditorState.moveFocusToEnd(newEditorState);
    }
    return newEditorState;
  };

  state = {
    editorState: this.createNewEditorState(
      this.props.content.text,
      this.props.filter
    ),
  };

  editorKey = 0;

  componentDidMount() {
    this.props.storeFocusEditor(this.focus);
    this.props.storeHasFocus(this.hasFocus);
    this.ipc.on('appCommand', this.onAppCommand);
    this.editor.blur();
  }

  handleEditorStateChange = editorState => {
    const { editorState: prevEditorState } = this.state;

    if (editorState === prevEditorState) {
      return;
    }

    let newEditorState = editorState;

    if (shouldRemoveCheckbox(editorState, prevEditorState)) {
      const newContentState = removeCheckbox(editorState, prevEditorState);
      newEditorState = EditorState.push(
        editorState,
        newContentState,
        'remove-range'
      );
    }

    const nextContent = plainTextContent(newEditorState);
    const prevContent = plainTextContent(prevEditorState);
    const contentChanged = nextContent !== prevContent;

    const announceChanges = contentChanged
      ? () => this.props.onChangeContent(nextContent)
      : noop;

    this.setState({ editorState: newEditorState }, announceChanges);
  };

  reflectChangesFromReceivedContent = (oldEditorState, content) => {
    let newEditorState = EditorState.push(
      oldEditorState,
      ContentState.createFromText(content, TEXT_DELIMITER),
      'replace-text'
    );

    // Handle transfer of focus from oldEditorState to newEditorState
    if (oldEditorState.getSelection().getHasFocus()) {
      const newSelectionState = getEquivalentSelectionState(
        oldEditorState,
        newEditorState
      );
      newEditorState = EditorState.forceSelection(
        newEditorState,
        newSelectionState
      );
    }

    this.setState({ editorState: newEditorState });
  };

  componentDidUpdate(prevProps) {
    const { content, filter, noteId, spellCheckEnabled } = this.props;
    const { editorState } = this.state;

    // To immediately reflect the changes to the spell check setting,
    // we must remount the Editor and force update. The remount is
    // done by changing the `key` prop on the Editor.
    // https://stackoverflow.com/questions/35792275/
    if (spellCheckEnabled !== prevProps.spellCheckEnabled) {
      this.editorKey += 1;
      this.forceUpdate();
    }

    // If another note/revision is selected,
    // create a new editor state from scratch.
    if (
      noteId !== prevProps.noteId ||
      content.version !== prevProps.content.version
    ) {
      this.setState({
        editorState: this.createNewEditorState(content.text, filter),
      });
      return;
    }

    // If filter changes, re-set decorators
    if (filter !== prevProps.filter) {
      this.setState({
        editorState: EditorState.set(editorState, {
          decorator: this.generateDecorators(filter),
        }),
      });
    }

    // If a remote change comes in, push it to the existing editor state.
    if (content.text !== prevProps.content.text && content.hasRemoteUpdate) {
      this.reflectChangesFromReceivedContent(editorState, content.text);
    }
  }

  saveEditorRef = ref => {
    this.editor = ref;
  };

  componentWillUnmount() {
    this.ipc.removeListener('appCommand', this.onAppCommand);
  }

  focus = () => {
    invoke(this, 'editor.focus');
  };

  /**
   * Determine whether the Draft-JS editor is focused.
   *
   * @returns {boolean} whether the editor area is focused
   */
  hasFocus = () => {
    return document.activeElement === get(this.editor, 'editor');
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
    // matches lines that start with `- `, `* `, `+ `, or `\u2022` (bullet)
    // preceded by 0 or more space characters
    // i.e. a line prefixed by a list bullet
    const listItemRe = /^[ \t\u2000-\u200a]*[-*+\u2022]\s/;

    const { editorState } = this.state;
    const line = getCurrentBlock(editorState).getText();

    const firstCharIndex = line.search(/\S/);
    const caretIsCollapsedAt = index => {
      const { anchorOffset, focusOffset } = editorState.getSelection();
      return anchorOffset === index && focusOffset === index;
    };
    const atBeginningOfLine =
      caretIsCollapsedAt(0) || caretIsCollapsedAt(firstCharIndex);

    if (atBeginningOfLine) {
      return 'not-handled';
    }

    if (isLonelyBullet(line)) {
      this.handleEditorStateChange(finishList(editorState));
      return 'handled';
    }

    const listItemMatch = line.match(listItemRe);
    const taskItemMatch = line.match(taskRegex);

    if (taskItemMatch) {
      const nextTaskPrefix = line.replace(taskRegex, '$1- [ ] ');
      this.handleEditorStateChange(continueList(editorState, nextTaskPrefix));
      return 'handled';
    } else if (listItemMatch) {
      this.handleEditorStateChange(continueList(editorState, listItemMatch[0]));
      return 'handled';
    }

    return 'not-handled';
  };

  onAppCommand = (event, command) => {
    if (get(command, 'action') === 'insertChecklist') {
      this.handleEditorStateChange(
        insertOrRemoveCheckboxes(this.state.editorState)
      );
      analytics.tracks.recordEvent('editor_checklist_inserted');
    }
  };

  /**
   * Copy the raw text as determined by the DraftJS SelectionState.
   *
   * By not relying on the browser's interpretation of the contenteditable
   * selection, this allows for the clipboard data to more accurately reflect
   * the internal plain text data.
   */
  copyPlainText = event => {
    const textToCopy = getSelectedText(this.state.editorState);
    event.clipboardData.setData('text/plain', textToCopy);
    event.preventDefault();
  };

  render() {
    return (
      <div
        onCopy={this.copyPlainText}
        onCut={this.copyPlainText}
        style={{ height: '100%' }}
      >
        <Editor
          key={this.editorKey}
          ref={this.saveEditorRef}
          spellCheck={this.props.spellCheckEnabled}
          stripPastedStyles
          onChange={this.handleEditorStateChange}
          editorState={this.state.editorState}
          onTab={this.onTab}
          handleReturn={this.handleReturn}
        />
      </div>
    );
  }
}
