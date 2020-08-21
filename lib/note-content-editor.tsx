import React, { Component } from 'react';
import { connect } from 'react-redux';
import Monaco, {
  ChangeHandler,
  EditorDidMount,
  EditorWillMount,
} from 'react-monaco-editor';
import { editor as Editor, Selection, SelectionDirection } from 'monaco-editor';

import actions from './state/actions';
import * as selectors from './state/selectors';
import {
  withCheckboxSyntax,
  withCheckboxCharacters,
} from './utils/task-transform';

import * as S from './state';
import * as T from './types';

const SPEED_DELAY = 120;

type OwnProps = {
  storeFocusEditor: (focusSetter: () => any) => any;
  storeHasFocus: (focusGetter: () => boolean) => any;
};

type StateProps = {
  editorSelection: [number, number, 'RTL' | 'LTR'];
  fontSize: number;
  keyboardShortcuts: boolean;
  lineLength: T.LineLength;
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

type Props = OwnProps & StateProps & DispatchProps;

type OwnState = {
  content: string;
  editor: 'fast' | 'full';
  noteId: T.EntityId | null;
  overTodo: boolean;
};

class NoteContentEditor extends Component<Props> {
  bootTimer: ReturnType<typeof setTimeout> | null = null;
  editor: Editor.IStandaloneCodeEditor | null = null;
  monaco: Monaco | null = null;

  state: OwnState = {
    content: '',
    editor: 'fast',
    noteId: null,
    overTodo: false,
  };

  static getDerivedStateFromProps(props: Props, state: OwnState) {
    const {
      note: { content },
    } = props;
    const goFast = content.length > 5000;

    if (props.noteId !== state.noteId) {
      return {
        content: goFast
          ? content.slice(0, props.editorSelection[1] + 5000)
          : withCheckboxCharacters(content),
        editor: goFast ? 'fast' : 'full',
        noteId: props.noteId,
      };
    }

    return content !== state.content
      ? { content: withCheckboxCharacters(content) }
      : null;
  }

  componentDidMount() {
    const { noteId } = this.props;
    this.bootTimer = setTimeout(() => {
      if (noteId === this.props.noteId) {
        this.setState({
          editor: 'full',
          content: withCheckboxCharacters(this.props.note.content),
        });
      }
    }, SPEED_DELAY);
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
  }

  componentWillUnmount() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
    }
    window.electron?.removeListener('editorCommand');
  }

  componentDidUpdate(prevProps: Props) {
    const {
      editorSelection: [prevStart, prevEnd, prevDirection],
    } = prevProps;
    const {
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

    if (this.props.lineLength !== prevProps.lineLength) {
      // @TODO: This timeout is necessary for no apparent reason
      //        Figure out why and take it out!
      setTimeout(() => {
        if (this.editor) {
          this.editor.layout();
        }
      }, 400);
    }
  }

  focusEditor = () => this.editor?.focus();

  hasFocus = () => this.editor?.hasTextFocus();

  insertOrRemoveCheckboxes = (editor: Editor.IStandaloneCodeEditor) => {
    // todo: we're not disabling this if !this.props.keyboardShortcuts, do we want to?
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const position = editor.getPosition();
    if (!position) {
      return;
    }
    const lineNumber = position.lineNumber;
    const thisLine = model.getLineContent(lineNumber);

    // "(1)A line without leading space"
    // "(1   )A line with leading space"
    // "(1   )(3\ue000 )A line with a task and leading space"
    // "(1   )(2- )A line with a bullet"
    // "(1  )(2* )(3\ue001  )Bulleted task"
    const match = /^(\s*)([-+*\u2022]\s*)?([\ue000\ue001]\s+)?/.exec(thisLine);
    if (!match) {
      // this shouldn't be able to fail since it requires no characters
      return;
    }

    const [fullMatch, prefixSpace, bullet, existingTask] = match;
    const hasTask = 'undefined' !== typeof existingTask;

    const lineOffset = prefixSpace.length + (bullet?.length ?? 0) + 1;
    const text = hasTask ? '' : '\ue000 ';
    const range = new this.monaco.Range(
      lineNumber,
      lineOffset,
      lineNumber,
      lineOffset + (existingTask?.length ?? 0)
    );

    const identifier = { major: 1, minor: 1 };
    const op = { identifier, range, text, forceMoveMarkers: true };
    editor.executeEdits('insertOrRemoveCheckboxes', [op]);

    this.props.insertTask();
  };

  editorInit: EditorWillMount = () => {
    Editor.defineTheme('simplenote', {
      base: 'vs',
      inherit: true,
      rules: [{ background: 'FFFFFF' }],
      colors: {
        'editor.foreground': '#2c3338', // $studio-gray-80 AKA theme-color-fg
        'editor.background': '#ffffff',
        'editor.selectionBackground': '#ced9f2', // $studio-simplenote-blue-5
        'scrollbarSlider.activeBackground': '#8c8f94', // $studio-gray-30
        'scrollbarSlider.background': '#c3c4c7', // $studio-gray-10
        'scrollbarSlider.hoverBackground': '#a7aaad', // $studio-gray-20
        'textLink.foreground': '#1d4fc4', // $studio-simplenote-blue-60
      },
    });
    Editor.defineTheme('simplenote-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [{ background: '1d2327' }],
      colors: {
        'editor.foreground': '#ffffff',
        'editor.background': '#1d2327', // $studio-gray-90
        'editor.selectionBackground': '#50575e', // $studio-gray-60
        'scrollbarSlider.activeBackground': '#646970', // $studio-gray-50
        'scrollbarSlider.background': '#2c3338', // $studio-gray-80
        'scrollbarSlider.hoverBackground': '#1d2327', // $studio-gray-90
        'textLink.foreground': '#ced9f2', // studio-simplenote-blue-5
      },
    });
  };

  editorReady: EditorDidMount = (editor, monaco) => {
    this.editor = editor;
    this.monaco = monaco;

    // remove keybindings; see https://github.com/microsoft/monaco-editor/issues/287
    const shortcutsToDisable = [
      'cursorUndo', // meta+U
      'editor.action.commentLine', // meta+/
      'editor.action.jumpToBracket', // shift+meta+\
      'editor.action.transposeLetters', // ctrl+T
      'editor.action.triggerSuggest', // ctrl+space
      'expandLineSelection', // meta+L
      // search shortcuts
      'actions.find',
      'actions.findWithSelection',
      'editor.action.addSelectionToNextFindMatch',
      'editor.action.nextMatchFindAction',
      'editor.action.selectHighlights',
    ];
    // let Electron menus trigger these
    if (window.electron) {
      shortcutsToDisable.push('undo', 'redo', 'editor.action.selectAll');
    }
    shortcutsToDisable.forEach(function (action) {
      editor._standaloneKeybindingService.addDynamicKeybinding('-' + action);
    });

    // disable editor keybindings for Electron since it is handled by editorCommand
    // doing it this way will always show the keyboard hint in the context menu!
    editor.createContextKey(
      'allowBrowserKeybinding',
      window.electron ? false : true
    );

    editor.addAction({
      id: 'insertChecklist',
      label: 'Insert Checklist',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_C,
      ],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 9,
      keybindingContext: 'allowBrowserKeybinding',
      run: this.insertOrRemoveCheckboxes,
    });

    window.electron?.receive('editorCommand', (command) => {
      switch (command.action) {
        case 'insertChecklist':
          editor.trigger('editorCommand', 'insertChecklist', null);
          return;
        case 'redo':
          editor.trigger('editorCommand', 'redo', null);
          return;
        case 'selectAll':
          editor.setSelection(editor.getModel().getFullModelRange());
          return;
        case 'undo':
          editor.trigger('editorCommand', 'undo', null);
          return;
      }
    });

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

      if (!range) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      const offset = model.getOffsetAt({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
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

      if (!range) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      const offset = model.getOffsetAt({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
      });

      if (content[offset] === '\ue000') {
        editNote(noteId, {
          content: withCheckboxSyntax(
            content.slice(0, offset) + '\ue001' + content.slice(offset + 1)
          ),
        });
      } else if (content[offset] === '\ue001') {
        editNote(noteId, {
          content: withCheckboxSyntax(
            content.slice(0, offset) + '\ue000' + content.slice(offset + 1)
          ),
        });
      }
    });
  };

  updateNote: ChangeHandler = (value, event) => {
    const { editNote, noteId } = this.props;

    if (!this.editor) {
      return;
    }

    const autolist = () => {
      // perform list auto-complete
      if (!this.editor || event.isRedoing || event.isUndoing) {
        return;
      }

      const change = event.changes.find(
        ({ text }) => text[0] === '\n' && text.trim() === ''
      );

      if (!change) {
        return;
      }

      const lineNumber = change.range.startLineNumber;
      if (
        lineNumber === 0 ||
        // the newline change starts and ends on one line
        lineNumber !== change.range.endLineNumber
      ) {
        return;
      }

      const model = this.editor.getModel();
      const prevLine = model.getLineContent(lineNumber);

      const prevList = /^(\s*)([-+*\u2022\ue000\ue001])(\s+)/.exec(prevLine);
      if (null === prevList) {
        return;
      }

      const thisLine = model.getLineContent(lineNumber + 1);
      if (!/^\s*$/.test(thisLine)) {
        return;
      }

      // Lonely bullets occur when we continue a list in order
      // to terminate the list. We expect the previous list bullet
      // to disappear and return us to the normal text flow
      const isLonelyBullet =
        thisLine.trim().length === 0 && prevLine.length === prevList[0].length;
      if (isLonelyBullet) {
        const prevLineStart = model.getOffsetAt({
          column: 0,
          lineNumber: lineNumber,
        });

        const thisLineStart = model.getOffsetAt({
          column: 0,
          lineNumber: lineNumber + 1,
        });

        const range = new this.monaco.Range(lineNumber, 0, lineNumber + 1, 0);
        const identifier = { major: 1, minor: 1 };
        const op = { identifier, range, text: '', forceMoveMarkers: true };
        this.editor.executeEdits('autolist', [op]);

        return (
          value.slice(0, Math.max(0, prevLineStart - 1)) +
          value.slice(thisLineStart)
        );
      }

      const lineStart = model.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 1,
      });

      const nextStart = model.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 2,
      });

      const range = new this.monaco.Range(
        lineNumber + 1,
        0,
        lineNumber + 1,
        thisLine.length
      );
      const identifier = { major: 1, minor: 1 };
      const text = prevList[0].replace('\ue001', '\ue000');
      const op = { identifier, range, text, forceMoveMarkers: true };
      this.editor.executeEdits('autolist', [op]);

      // for some reason this wasn't updating
      // the cursor position when executed immediately
      // so we are running it on the next micro-task
      Promise.resolve().then(() =>
        this.editor.setPosition({
          column: prevList[0].length + 1,
          lineNumber: lineNumber + 1,
        })
      );

      return (
        value.slice(0, lineStart) +
        prevList[0].replace('\ue001', '\ue000') +
        event.eol +
        value.slice(nextStart)
      );
    };

    const content = autolist() || value;

    editNote(noteId, { content: withCheckboxSyntax(content) });
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
        <div
          className={`note-content-plaintext${
            editor === 'fast' ? ' visible' : ''
          }`}
        >
          {content}
        </div>
        {editor !== 'fast' && (
          <Monaco
            key={noteId}
            editorDidMount={this.editorReady}
            editorWillMount={this.editorInit}
            language="plaintext"
            theme={theme === 'dark' ? 'simplenote-dark' : 'simplenote'}
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
              matchBrackets: 'never',
              minimap: { enabled: false },
              occurrencesHighlight: false,
              overviewRulerBorder: false,
              quickSuggestions: false,
              renderIndentGuides: false,
              renderLineHighlight: 'none',
              scrollbar: { horizontal: 'hidden', useShadows: false },
              scrollBeyondLastLine: false,
              selectionHighlight: false,
              wordWrap: 'on',
              wrappingStrategy: 'simple',
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
  lineLength: state.settings.lineLength,
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
