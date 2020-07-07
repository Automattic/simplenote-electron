import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';

import actions from './state/actions';
import * as selectors from './state/selectors';

import * as S from './state';
import * as T from './types';

const SPEED_DELAY = 120;

const withCheckboxCharacters = (s: string): string =>
  s
    .replace(/^(\s*)- \[ \](\s)/gm, '$1\ue000$2')
    .replace(/^(\s*)- \[x\](\s)/gim, '$1\ue001$2');

const withCheckboxSyntax = (s: string): string =>
  s.replace(/\ue000/g, '- [ ]').replace(/\ue001/g, '- [x]');

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
  editor: 'fast' | 'full';
  noteId: T.EntityId | null;
  overTodo: boolean;
};

class NoteContentEditor extends Component<Props> {
  editor = createRef<HTMLTextAreaElement>();

  state: OwnState = {
    content: '',
    editor: 'fast',
    noteId: null,
    overTodo: false,
  };

  static getDerivedStateFromProps(props: Props, state: OwnState) {
    if (props.noteId !== state.noteId) {
      return {
        content: withCheckboxCharacters(
          props.note.content.slice(0, props.editorSelection[1] + 5000)
        ),
        editor: 'fast',
        noteId: props.noteId,
      };
    }

    return props.note.content !== state.content
      ? { content: withCheckboxCharacters(props.note.content) }
      : null;
  }

  componentDidMount() {
    const { noteId } = this.props;
    window.addEventListener('keydown', this.handleKeys, true);
    setTimeout(() => {
      if (noteId === this.props.noteId) {
        this.setState({
          editor: 'full',
          content: withCheckboxCharacters(this.props.note.content),
        });
      }
    }, SPEED_DELAY);

    this.editor.current.oncopy = (event) => {
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

    this.editor.current.addEventListener(
      'click',
      () => {
        const { editNote, noteId } = this.props;
        const { content } = this.state;

        if (!this.editor.current) {
          return;
        }

        const { selectionStart, selectionEnd } = this.editor.current;
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

        this.editor.current.setSelectionRange(boxAt, boxAt + 1, 'forward');
        document.execCommand(
          'insertText',
          false,
          isChecked ? '\ue000' : '\ue001'
        );
      },
      true
    );
    //
    // const [start, end, direction] = this.props.editorSelection;
    // this.editor.current.setSelectionRange(start, end, direction);
    // this.editor.current.focus();
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeys, true);
  }

  componentDidUpdate(prevProps: Props, prevState: OwnState) {
    const {
      editorSelection: [prevStart, prevEnd, prevDirection],
    } = prevProps;
    const {
      noteId,
      editorSelection: [thisStart, thisEnd, thisDirection],
    } = this.props;

    if (
      this.editor.current &&
      ((this.state.editor === 'full' &&
        (prevStart !== thisStart ||
          prevEnd !== thisEnd ||
          prevDirection !== thisDirection)) ||
        prevProps.noteId !== this.props.noteId ||
        prevState.editor !== this.state.editor)
    ) {
      this.editor.current.setSelectionRange(thisStart, thisEnd, thisDirection);
      this.editor.current.focus();
    }

    // @TODO is this really a smart thing? It's super fast when navigating
    //       through the notes but also could be jerky and sensitive to
    //       tuning of the delay
    if (this.state.editor === 'fast') {
      setTimeout(() => {
        if (noteId === this.props.noteId) {
          this.setState({
            editor: 'full',
            content: withCheckboxCharacters(this.props.note.content),
          });
        }
      }, SPEED_DELAY);
    }
  }

  handleKeys = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }

    const { code, ctrlKey, metaKey, shiftKey } = event;
    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && 'KeyC' === code) {
      this.props.insertTask();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  };

  storeSelection = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const {
      currentTarget: { selectionStart, selectionEnd, selectionDirection },
    } = event;

    if (this.state.editor === 'fast') {
      return;
    }

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
    const { content, editor } = this.state;

    return (
      <div className="note-content-editor-shell">
        <textarea
          ref={this.editor}
          value={content}
          dir="auto"
          onChange={this.updateNote}
          onSelect={this.storeSelection}
          readOnly={editor === 'fast'}
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
