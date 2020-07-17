import React, { Component } from 'react';
import { connect } from 'react-redux';

import actions from './state/actions';
import * as selectors from './state/selectors';

import * as S from './state';
import * as T from './types';

const withCheckboxCharacters = (s: string): string =>
  s.replace(
    /^(\s*)- \[( |x|X)\](\s)/gm,
    (match, prespace, inside, postspace) =>
      prespace + (inside === ' ' ? '\ue000' : '\ue001') + postspace
  );

const withCheckboxSyntax = (s: string): string =>
  s.replace(/\ue000|\ue001/g, (match) =>
    match === '\ue000' ? '- [ ]' : '- [x]'
  );

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

const leadingWhitespace = /^(\s*)/g;
const toCodeUnits = (s: string) =>
  s
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join(' ');

const getIndentFor = (document: string, offset: number): string => {
  if (document[offset - 1] === '\n') {
    return '\t';
  }

  const [thisLine, thisStart, thisEnd] = getCurrentLine(document, offset);

  if (thisStart === 0 || document[thisStart - 1] === '\n') {
    return '\t';
  }

  const [prevLine, prevStart, prevEnd] = getCurrentLine(
    document,
    thisStart - 1
  );

  if (prevStart === 0 || prevLine === '') {
    return '\t';
  }

  leadingWhitespace.lastIndex = 0;
  const whitespace = leadingWhitespace.exec(prevLine)?.[0] ?? '\t';

  return whitespace;
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

  insertTask = () => {
    if (!this.editor) {
      return;
    }

    const content = this.editor.value;
    const start = this.editor.selectionStart;

    const [line, lineStart, lineEnd] = getCurrentLine(content, start);

    leadingWhitespace.lastIndex = 0;
    const whitespace = leadingWhitespace.exec(line)?.[0] ?? '';

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
