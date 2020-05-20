import React, { Component } from 'react';
import { connect } from 'react-redux';
import Monaco, { ChangeHandler, EditorDidMount } from 'react-monaco-editor';
import { editor as Editor, Selection, SelectionDirection } from 'monaco-editor';

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
  editorSelection: [number, number, 'RTL' | 'LTR'];
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
    direction: 'LTR' | 'RTL'
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
  editor: Editor.IStandaloneCodeEditor | null = null;

  state: OwnState = {
    content: '',
    editor: 'fast',
    noteId: null,
    overTodo: false,
  };

  static getDerivedStateFromProps(props: Props, state: OwnState) {
    if (props.noteId !== state.noteId) {
      return {
        content: props.note.content.slice(0, props.editorSelection[1] + 5000),
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
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeys, true);
  }

  componentDidUpdate(prevProps: Props) {
    const {
      editorSelection: [prevStart, prevEnd, prevDirection],
    } = prevProps;
    const {
      noteId,
      editorSelection: [thisStart, thisEnd, thisDirection],
    } = this.props;

    if (
      this.editor &&
      this.state.editor === 'full' &&
      (prevStart !== thisStart ||
        prevEnd !== thisEnd ||
        prevDirection !== thisDirection)
    ) {
      const start = this.editor.getModel()?.getPositionAt(thisStart);
      const end = this.editor.getModel()?.getPositionAt(thisEnd);

      this.editor.setSelection(
        Selection.createWithDirection(
          start?.lineNumber,
          start?.column,
          end?.lineNumber,
          end?.column,
          thisDirection === 'RTL'
            ? SelectionDirection.RTL
            : SelectionDirection.LTR
        )
      );
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

  editorReady: EditorDidMount = (editor, monaco) => {
    // @TODO remove these
    window.editor = editor;
    window.monaco = monaco;
    this.editor = editor;

    const titleDecoration = (line: number) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        inlineClassName: 'note-title',
        stickiness: Editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    });

    let decorations: string[] = [];
    const decorateFirstLine = () => {
      const model = editor.getModel();
      if (!model) {
        decorations = [];
        return;
      }

      for (let i = 1; i <= model.getLineCount(); i++) {
        const line = model.getLineContent(i);
        if (line.trim().length > 0) {
          decorations = editor.deltaDecorations(decorations, [
            titleDecoration(i),
          ]);
          break;
        }
      }
    };

    decorateFirstLine();
    editor.onDidChangeModelContent(() => decorateFirstLine());

    document.oncopy = (event) => {
      // @TODO: This is selecting everything in the app but we should only
      //        need to intercept copy events coming from the editor
      event.clipboardData.setData(
        'text/plain',
        withCheckboxSyntax(event.clipboardData.getData('text/plain'))
      );
    };

    const [startOffset, endOffset, direction] = this.props.editorSelection;
    const start = this.editor.getModel()?.getPositionAt(startOffset);
    const end = this.editor.getModel()?.getPositionAt(endOffset);

    this.editor.setSelection(
      Selection.createWithDirection(
        start?.lineNumber,
        start?.column,
        end?.lineNumber,
        end?.column,
        direction === 'RTL' ? SelectionDirection.RTL : SelectionDirection.LTR
      )
    );

    editor.revealLine(start.lineNumber, Editor.ScrollType.Immediate);
    editor.focus();

    editor.onDidChangeCursorSelection((e) => {
      if (
        e.reason === Editor.CursorChangeReason.Undo ||
        e.reason === Editor.CursorChangeReason.Redo
      ) {
        // @TODO: Adjust selection in Undo/Redo
        return;
      }

      const start = editor
        .getModel()
        ?.getOffsetAt(e.selection.getStartPosition());
      const end = editor.getModel()?.getOffsetAt(e.selection.getEndPosition());
      const direction =
        e.selection.getDirection() === SelectionDirection.LTR ? 'LTR' : 'RTL';

      this.props.storeEditorSelection(this.props.noteId, start, end, direction);
    });

    // @TODO: Is this really slow and dumb?
    editor.onMouseMove((e) => {
      const { content } = this.state;
      const {
        target: { range },
      } = e;

      const offset = editor.getModel()!.getOffsetAt({
        lineNumber: range!.startLineNumber,
        column: range!.startColumn,
      });

      this.setState({
        overTodo: content[offset] === '\ue000' || content[offset] === '\ue001',
      });
    });

    editor.onMouseDown((event) => {
      const { editNote, noteId } = this.props;
      const { content } = this.state;
      const {
        target: { range },
      } = event;

      const offset = editor.getModel()!.getOffsetAt({
        lineNumber: range!.startLineNumber,
        column: range!.startColumn,
      });

      if (content[offset] === '\ue000') {
        editNote(noteId, {
          content:
            content.slice(0, offset) + '\ue001' + content.slice(offset + 1),
        });
      } else if (content[offset] === '\ue001') {
        editNote(noteId, {
          content:
            content.slice(0, offset) + '\ue000' + content.slice(offset + 1),
        });
      }
    });
  };

  updateNote: ChangeHandler = (nextValue, event) => {
    const { editNote, noteId } = this.props;

    editNote(noteId, { content: withCheckboxSyntax(nextValue) });
  };

  render() {
    const { fontSize, noteId, theme } = this.props;
    const { content, editor, overTodo } = this.state;

    return (
      <div
        className={`note-content-editor-shell${
          overTodo ? ' cursor-pointer' : ''
        }`}
      >
        {editor === 'fast' ? (
          <div style={{ padding: '0.7em', whiteSpace: 'pre-wrap' }}>
            {content}
          </div>
        ) : (
          <Monaco
            key={noteId}
            editorDidMount={this.editorReady}
            language="plaintext"
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            onChange={this.updateNote}
            options={{
              autoClosingBrackets: 'never',
              autoClosingQuotes: 'never',
              autoIndent: 'keep',
              autoSurround: 'never',
              automaticLayout: true,
              codeLens: false,
              contextmenu: false,
              folding: false,
              fontFamily:
                '"Simplenote Tasks", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", sans-serif',
              fontSize,
              hideCursorInOverviewRuler: true,
              lineHeight: fontSize > 20 ? 42 : 24,
              lineNumbers: 'off',
              links: true,
              minimap: { enabled: false },
              occurrencesHighlight: false,
              overviewRulerBorder: false,
              quickSuggestions: false,
              renderIndentGuides: false,
              renderLineHighlight: 'none',
              scrollbar: { horizontal: 'hidden' },
              selectionHighlight: false,
              wordWrap: 'on',
              wrappingStrategy: 'advanced',
            }}
            value={content}
          />
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  editorSelection: state.ui.editorSelection.get(state.ui.openedNote) ?? [
    0,
    0,
    'LTR',
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
