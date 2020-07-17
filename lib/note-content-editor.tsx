import React, { Component } from 'react';
import { connect } from 'react-redux';

import actions from './state/actions';
import * as selectors from './state/selectors';
import {
  withCheckboxCharacters,
  withCheckboxSyntax,
} from './utils/task-transform';

import * as S from './state';
import * as T from './types';

const getCurrentLine = (
  document: string,
  offset: number
): [string, number, number] => {
  // the start of the line is the last newline before our offset
  // or the current offset if we're at the beginning of the document
  // or the newline before that one if we're already at the end of the line
  const prevNewline = Math.max(
    0,
    document.lastIndexOf('\n', document[offset] === '\n' ? offset - 1 : offset)
  );

  const nextNewline = document.indexOf('\n', offset);
  const line = document.slice(
    prevNewline <= 0 ? 0 : prevNewline + 1,
    nextNewline
  );

  return [line, prevNewline, nextNewline];
};

const leadingIndent = /^(\s*(?:[-+*\u2022\ue000\ue001]\s)?)/g;
const taskLeader = /^(\s*(?:[-+*\u2022]\s)?)/g;
const toCodeUnits = (s: string) =>
  s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join(' ');

const getIndentFor = (document: string, offset: number): string => {
  if (document[offset] === '\n' && document[offset - 1] === '\n') {
    return '';
  }

  const [thisLine, thisStart, thisEnd] = getCurrentLine(document, offset);

  if (thisStart === 0) {
    return '\t';
  }

  if (thisLine === '') {
    return '\t';
  }

  leadingIndent.lastIndex = 0;
  const indent = leadingIndent.exec(thisLine)?.[0] ?? '\t';

  if (indent === thisLine) {
    return '';
  }

  return indent;
};

type StateProps = {
  editorSelection: [number, number, 'forward' | 'backward' | 'none'];
  fontSize: number;
  keyboardShortcuts: boolean;
  noteId: T.EntityId;
  note: T.Note;
  searchQuery: string;
  spellCheckEnabled: boolean;
  theme: T.Theme;
};

type DispatchProps = {
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
  insertTask: () => any;
  storeEditorSelection: (
    noteId: T.EntityId,
    start: number,
    end: number,
    direction: 'forward' | 'backward' | 'none'
  ) => any;
};

type Props = StateProps & DispatchProps;

type OwnState = {
  content: string;
  rawContent: string;
};

class NoteContentEditor extends Component<Props> {
  editor: HTMLTextAreaElement | null = null;

  state: OwnState = {
    content: '',
    rawContent: '',
  };

  static getDerivedStateFromProps(props: Props, state: OwnState) {
    // only update if the non-transformed content of the note has changed
    return props.note.content !== state.rawContent
      ? {
          content: withCheckboxCharacters(props.note.content),
          rawContent: props.note.content,
        }
      : null;
  }

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeys, true);
    window.electron?.receive('appCommand', (command) => {
      if ('insertChecklist' === command.action) {
        this.insertTask();
      }
    });
  }

  bootEditor = (editor: HTMLTextAreaElement) => {
    if (null === editor) {
      return;
    }

    this.editor = editor;

    editor.oncopy = (event) => {
      const text = window.getSelection();
      if (!event.clipboardData || !text) {
        return;
      }

      const toCopy = withCheckboxSyntax(text.toString());
      try {
        event.clipboardData.setData('text/plain', toCopy); // Safari + Chrome
      } catch (DOMException) {
        navigator.clipboard.writeText(toCopy); // Firefox + Chrome
      }
      event.preventDefault();
    };

    editor.addEventListener(
      'click',
      () => {
        const { editNote, noteId } = this.props;
        const { content } = this.state;

        if (!this.editor) {
          return;
        }

        const { selectionStart, selectionEnd } = this.editor;
        if (selectionStart !== selectionEnd) {
          // only accept clicks - not selection spans
          return;
        }

        const clickAt = selectionStart;
        const boxAtClick =
          content[clickAt] === '\ue000' || content[clickAt] === '\ue001';
        const boxBeforeClick =
          !boxAtClick &&
          clickAt > 0 &&
          (content[clickAt - 1] === '\ue000' ||
            content[clickAt - 1] === '\ue001');

        if (!boxAtClick && !boxBeforeClick) {
          return;
        }

        const boxAt = boxAtClick ? clickAt : clickAt - 1;
        const isChecked = content[boxAt] === '\ue001';

        editor.setSelectionRange(boxAt, boxAt + 1, 'forward');
        document.execCommand(
          'insertText',
          false,
          isChecked ? '\ue000' : '\ue001'
        );
        editNote(noteId, {
          content: withCheckboxSyntax(editor.value),
        });
      },
      true
    );

    const [start, end, direction] = this.props.editorSelection;
    editor.setSelectionRange(start, end, direction);
    editor.focus();
  };

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeys, true);
  }

  componentDidUpdate(prevProps: Props, prevState: OwnState) {
    const {
      editorSelection: [prevStart, prevEnd, prevDirection],
    } = prevProps;
    const {
      editorSelection: [thisStart, thisEnd, thisDirection],
    } = this.props;

    if (
      this.editor &&
      (prevStart !== thisStart ||
        prevEnd !== thisEnd ||
        prevDirection !== thisDirection)
    ) {
      this.editor.setSelectionRange(thisStart, thisEnd, thisDirection);
      this.editor.focus();
    }
  }

  continueList = () => {
    if (!this.editor) {
      return;
    }

    const content = this.editor.value;
    const start = this.editor.selectionStart;

    const [prevLine, prevStart, prevEnd] = getCurrentLine(content, start);
    leadingIndent.lastIndex = 0;
    const match = leadingIndent.exec(prevLine)?.[0] ?? '';
    // remove previous indent
    if (match.length > 0 && match === prevLine) {
      this.editor.setSelectionRange(prevStart, prevEnd, 'forward');
      document.execCommand('insertText', false, '\n');
      return;
    }

    const indent = getIndentFor(content, start);

    this.editor.setSelectionRange(start, start, 'forward');
    document.execCommand('insertText', false, '\n' + indent);
    this.editor.setSelectionRange(
      start + indent.length + 1,
      start + indent.length + 1,
      'forward'
    );
  };

  handleKeys = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }

    const { code, ctrlKey, metaKey, shiftKey } = event;
    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && 'KeyC' === code) {
      this.insertTask();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  };

  indent = () => {
    if (!this.editor) {
      return;
    }

    const content = this.editor.value;
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const direction = this.editor.selectionDirection;

    // only indent if we are at the start of a line
    // if the selection is collapsed
    if (start === end) {
      const prevNewline = content.lastIndexOf(
        '\n',
        content[start] === '\n' ? start - 1 : start
      );
      if (
        !/^\s*([-+*\u2022]\s?)?([\ue000\ue001]\s?)?$/.test(
          content.slice(prevNewline, start)
        )
      ) {
        document.execCommand('insertText', false, '\t');
        return;
      }
    }

    const [thisLine, thisStart, thisEnd] = getCurrentLine(content, start);
    const leadingChange = content
      .slice(thisStart, start)
      .replace(/\n/gm, '\n\t');
    const newContent = content.slice(thisStart, end).replace(/\n/gm, '\n\t');

    this.editor.setSelectionRange(thisStart, end);
    document.execCommand('insertText', false, newContent);
    this.editor.setSelectionRange(
      start + (leadingChange.length - (start - thisStart)),
      end + (newContent.length - (end - thisStart)),
      direction
    );
  };

  insertTask = () => {
    if (!this.editor) {
      return;
    }

    const content = this.editor.value;
    const start = this.editor.selectionStart;

    const [line, lineStart, lineEnd] = getCurrentLine(content, start);

    taskLeader.lastIndex = 0;
    const whitespace = taskLeader.exec(line)?.[0] ?? '';

    if (
      line[whitespace.length] === '\ue000' ||
      line[whitespace.length] === '\ue001'
    ) {
      this.editor.setSelectionRange(
        lineStart + whitespace.length + 1 - (lineStart === 0 ? 1 : 0),
        lineStart + whitespace.length + 3 - (lineStart === 0 ? 1 : 0),
        'forward'
      );
      document.execCommand('insertText', false, '');
    } else {
      this.editor.setSelectionRange(
        lineStart + whitespace.length + (lineStart === 0 ? 0 : 1),
        lineStart + whitespace.length + (lineStart === 0 ? 0 : 1),
        'forward'
      );
      document.execCommand('insertText', false, '\ue000 ');
    }
  };

  keyDown: React.KeyboardEventHandler = (event) => {
    console.log({
      key: event.key,
      charCode: event.charCode,
      keyCode: event.keyCode,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
    });
    if (event.key === 'Enter') {
      this.continueList();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === 'Tab' && event.ctrlKey && event.altKey) {
      this.editor?.focus();
      document.execCommand('insertText', false, '\t');
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      event.key === 'Tab' &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey
    ) {
      event.shiftKey ? this.outdent() : this.indent();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  };

  outdent = () => {
    if (!this.editor) {
      return;
    }

    const content = this.editor.value;
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const direction = this.editor.selectionDirection;

    const [thisLine, thisStart, thisEnd] = getCurrentLine(content, start);
    const leadingChange = content.slice(thisStart, start).replace(/^\t/gm, '');
    const newContent = content.slice(thisStart, end).replace(/^\t/gm, '');

    this.editor.setSelectionRange(thisStart, end);
    document.execCommand('insertText', false, newContent);
    this.editor.setSelectionRange(
      start + (leadingChange.length - (start - thisStart)),
      end + (newContent.length - (end - thisStart)),
      direction
    );
  };

  storeSelection = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const {
      currentTarget: { selectionStart, selectionEnd, selectionDirection },
    } = event;

    this.props.storeEditorSelection(
      this.props.noteId,
      selectionStart,
      selectionEnd,
      selectionDirection
    );
  };

  updateNote: React.FormEventHandler<HTMLTextAreaElement> = (event) => {
    const { editNote, noteId } = this.props;

    editNote(noteId, {
      content: withCheckboxSyntax(event.currentTarget.value),
    });
  };

  render() {
    const { content } = this.state;

    return (
      <div className="note-content-editor-shell">
        <textarea
          ref={this.bootEditor}
          value={content}
          dir="auto"
          onChange={this.updateNote}
          onKeyDown={this.keyDown}
          onSelect={this.storeSelection}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  editorSelection: state.ui.editorSelection.get(state.ui.openedNote) ?? [
    0,
    0,
    'none',
  ],
  fontSize: state.settings.fontSize,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  searchQuery: state.ui.searchQuery,
  spellCheckEnabled: state.settings.spellCheckEnabled,
  theme: selectors.getTheme(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  editNote: actions.data.editNote,
  insertTask: () => ({ type: 'INSERT_TASK' }),
  storeEditorSelection: (noteId, start, end, direction) => ({
    type: 'STORE_EDITOR_SELECTION',
    noteId,
    start,
    end,
    direction,
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
