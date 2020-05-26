import React, { Component } from 'react';
import { connect } from 'react-redux';
import MultiDecorator from 'draft-js-multidecorators';
import { ContentState, Editor, EditorState, Modifier } from 'draft-js';
import { debounce, get, has, invoke, noop } from 'lodash';

import {
  getCurrentBlock,
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
import actions from './state/actions';

import * as S from './state';
import * as T from './types';

const TEXT_DELIMITER = '\n';

const isElectron = (() => {
  // https://github.com/atom/electron/issues/2288
  const foundElectron = has(window, 'process.type');

  return () => foundElectron;
})();

type StateProps = {
  keyboardShortcuts: boolean;
  noteId: T.EntityId;
  note: T.Note;
  searchQuery: string;
  spellCheckEnabled: boolean;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
};

type Props = StateProps & DispatchProps;

class NoteContentEditor extends Component<Props> {
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

  generateDecorators = (searchQuery: string) => {
    const queryHasTerms = filterHasText(searchQuery);

    if (queryHasTerms) {
      return new MultiDecorator([
        matchingTextDecorator(searchPattern(searchQuery)),
        checkboxDecorator(this.replaceRangeWithText),
      ]);
    }

    return checkboxDecorator(this.replaceRangeWithText);
  };

  createNewEditorState = (text: string, searchQuery: string) => {
    const newEditorState = EditorState.createWithContent(
      ContentState.createFromText(text, TEXT_DELIMITER)
    );

    // Focus the editor for a new, empty note when not searching
    if (text === '' && searchQuery === '') {
      return EditorState.moveFocusToEnd(newEditorState);
    }
    return newEditorState;
  };

  state = {
    editorState: this.createNewEditorState(
      this.props.note.content ?? '',
      this.props.searchQuery
    ),
  };

  editorKey = 0;

  componentDidMount() {
    this.props.storeFocusEditor(this.focus);
    this.props.storeHasFocus(this.hasFocus);
    this.editor.blur();

    if (isElectron()) {
      this.ipc.on('appCommand', this.onAppCommand);
    }

    window.addEventListener('keydown', this.handleKeydown, false);
  }

  handleEditorStateChange = (editorState) => {
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
      ? () =>
          this.props.editNote(this.props.noteId, {
            content: nextContent,
            modificationDate: Date.now() / 1000,
          })
      : noop;

    this.setState({ editorState: newEditorState }, announceChanges);
  };

  componentDidUpdate(prevProps) {
    const { noteId, note, searchQuery, spellCheckEnabled } = this.props;
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
    if (noteId !== prevProps.noteId) {
      this.setState(
        {
          editorState: this.createNewEditorState(
            note.content ?? '',
            searchQuery
          ),
        },
        () => {
          this.queueDecoratorUpdate();

          if ((note.content ?? '').length < 10000) {
            this.queueDecoratorUpdate.flush();
          }

          if (__TEST__) {
            window.testEvents.push([
              'editorNewNote',
              plainTextContent(this.state.editorState),
            ]);
          }
        }
      );
      return;
    }

    // If searchQuery changes, re-set decorators
    if (searchQuery !== prevProps.searchQuery) {
      this.queueDecoratorUpdate();
    }
  }

  queueDecoratorUpdate = debounce(() => {
    const { searchQuery } = this.props;
    const { editorState } = this.state;

    if (this.props.noteId === null) {
      // oops, we unselected a note - don't recompute
      return;
    }

    this.setState({
      editorState: EditorState.set(editorState, {
        decorator: this.generateDecorators(searchQuery),
      }),
    });
  }, 500);

  saveEditorRef = (ref) => {
    this.editor = ref;
  };

  componentWillUnmount() {
    if (isElectron()) {
      this.ipc.removeListener('appCommand', this.onAppCommand);
    }

    window.removeEventListener('keydown', this.handleKeydown, false);
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

  onTab = (e) => {
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
    const caretIsCollapsedAt = (index) => {
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

  handleKeydown = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }
    const { code, ctrlKey, metaKey, shiftKey } = event;
    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && 'KeyC' === code) {
      this.handleEditorStateChange(
        insertOrRemoveCheckboxes(this.state.editorState)
      );
      analytics.tracks.recordEvent('editor_checklist_inserted');

      event.stopPropagation();
      event.preventDefault();

      return false;
    }

    return true;
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
  copyPlainText = (event) => {
    const textToCopy = getSelectedText(this.state.editorState);
    if (!textToCopy) {
      return;
    }
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

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  keyboardShortcuts: state.settings.keyboardShortcuts,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  searchQuery: state.ui.searchQuery,
  spellCheckEnabled: state.settings.spellCheckEnabled,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
