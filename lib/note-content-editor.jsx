import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ContentState, Editor, EditorState, Modifier } from 'draft-js';
import MultiDecorator from 'draft-js-multidecorators';
import { compact, get, includes, invoke, noop } from 'lodash';

import {
  getCurrentBlock,
  getSelectedText,
  plainTextContent,
} from './editor/utils';
import { filterHasText, searchPattern } from './utils/filter-notes';
import matchingTextDecorator from './editor/matching-text-decorator';
import checkboxDecorator from './editor/checkbox-decorator';
import tabDecorator from './editor/tab-decorator';
import { removeCheckbox, shouldRemoveCheckbox } from './editor/checkbox-utils';
import { taskRegex } from './note-detail/toggle-task/constants';
import insertOrRemoveCheckboxes from './editor/insert-or-remove-checkboxes';
import { getIpcRenderer } from './utils/electron';
import analytics from './analytics';

const isLonelyBullet = line =>
  includes(['-', '*', '+', '- [ ]', '- [x]'], line.trim());

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

function continueList(editorState, itemPrefix) {
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
      itemPrefix
    ),
    'insert-characters'
  );

  // move selection to the end of the new line
  return EditorState.forceSelection(
    withBullet,
    withBullet.getCurrentContent().getSelectionAfter()
  );
}

function getNewSelectionState(oldEditorState, newEditorState) {
  // Find the block index for the old focus/anchor keys
  // Use the new focus/anchor keys at that index with the old focus/anchor offsets
  const oldEditorSelection = oldEditorState.getSelection();
  const oldAnchorKey = oldEditorSelection.getAnchorKey();
  const oldFocusKey = oldEditorSelection.getFocusKey();
  const oldEditorBlocks = oldEditorState.getCurrentContent().getBlocksAsArray();
  let oldAnchorPosition;
  let oldFocusPosition;
  for (let i = 0; i < oldEditorBlocks.length; i++) {
    if (oldEditorBlocks[i].getKey() === oldAnchorKey) {
      oldAnchorPosition = i;
    }
    if (oldEditorBlocks[i].getKey() === oldFocusKey) {
      oldFocusPosition = i;
    }
  }
  const newEditorBlocks = newEditorState.getCurrentContent().getBlocksAsArray();
  return {
    anchorKey: newEditorBlocks[oldAnchorPosition].getKey(),
    anchorOffset: oldEditorSelection.getAnchorOffset(),
    focusKey: newEditorBlocks[oldFocusPosition].getKey(),
    focusOffset: oldEditorSelection.getFocusOffset(),
    isBackward: oldEditorSelection.getIsBackward(),
    hasFocus: oldEditorSelection.getHasFocus(),
  };
}

export default class NoteContentEditor extends Component {
  static propTypes = {
    content: PropTypes.string.isRequired,
    filter: PropTypes.string.isRequired,
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

  createNewEditorState = (text, filter) => {
    return EditorState.createWithContent(
      ContentState.createFromText(text, '\n'),
      new MultiDecorator(
        compact([
          filterHasText(filter) && matchingTextDecorator(searchPattern(filter)),
          checkboxDecorator(this.replaceRangeWithText),
          tabDecorator(),
        ])
      )
    );
  };

  state = {
    editorState: this.createNewEditorState(
      this.props.content,
      this.props.filter
    ),
  };

  editorKey = 0;

  componentDidMount() {
    this.props.storeFocusEditor(this.focus);
    this.props.storeHasFocus(this.hasFocus);
    this.ipc.on('appCommand', this.onAppCommand);
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

    const announceChanges =
      nextContent !== prevContent
        ? () => this.props.onChangeContent(nextContent)
        : noop;

    this.setState({ editorState: newEditorState }, announceChanges);
  };

  componentDidUpdate(prevProps) {
    // To immediately reflect the changes to the spell check setting,
    // we must remount the Editor and force update. The remount is
    // done by changing the `key` prop on the Editor.
    // https://stackoverflow.com/questions/35792275/
    if (prevProps.spellCheckEnabled !== this.props.spellCheckEnabled) {
      this.editorKey += 1;
      this.forceUpdate();
    }
  }

  saveEditorRef = ref => {
    this.editor = ref;
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

    let newEditorState = this.createNewEditorState(newContent, nextFilter);

    // Handle transfer of focus from oldEditorState to newEditorState
    if (oldEditorState.getSelection().getHasFocus()) {
      const newSelectionState = getNewSelectionState(
        oldEditorState,
        newEditorState
      );
      const selection = newEditorState.getSelection();
      newEditorState = EditorState.forceSelection(
        newEditorState,
        selection.merge(newSelectionState)
      );
    }

    this.setState({ editorState: newEditorState });
  }

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
    // matches lines that start with `- `, `* `, or `+ `
    // preceded by 0 or more space characters
    // i.e. a line prefixed by a list bullet
    const listItemRe = /^[ \t\u2000-\u200a]*[-*+]\s/;

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
      <div onCopy={this.copyPlainText} onCut={this.copyPlainText}>
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
