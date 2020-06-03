import React, { Component } from 'react';
import { connect } from 'react-redux';
import Monaco, { ChangeHandler, EditorDidMount } from 'react-monaco-editor';
import type { IPosition } from 'monaco-editor';
import { editor as Editor } from 'monaco-editor';

import actions from './state/actions';
import * as selectors from './state/selectors';

import * as S from './state';
import * as T from './types';

const lastCursorPosition: Map<T.EntityId, IPosition> = new Map();

type StateProps = {
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
};

type Props = StateProps & DispatchProps;

class NoteContentEditor extends Component<Props> {
  editorReady: EditorDidMount = (editor, monaco) => {
    // @TODO remove these
    window.editor = editor;
    window.monaco = monaco;

    editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(1, 1, 1, 1),
          options: {
            isWholeLine: true,
            inlineClassName: 'note-title',
            stickiness:
              Editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
      ]
    );

    editor.onDidChangeModelContent(() => {
      editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(1, 1, 1, 1),
            options: {
              isWholeLine: true,
              inlineClassName: 'note-title',
            },
          },
        ]
      );
    });

    document.oncopy = (event) => {
      // @TODO: This is selecting everything in the app but we should only
      //        need to intercept copy events coming from the editor
      event.clipboardData.setData(
        'text/plain',
        event.clipboardData
          .getData('text/plain')
          .replace(/\ue000/g, '- [ ]')
          .replace(/\ue001/g, '- [x]')
      );
    };

    if (lastCursorPosition.has(this.props.noteId)) {
      editor.setPosition(lastCursorPosition.get(this.props.noteId)!);
      editor.revealLine(
        lastCursorPosition.get(this.props.noteId)!.lineNumber,
        Editor.ScrollType.Immediate
      );
      editor.focus();
    }

    editor.onDidChangeCursorPosition((e) => {
      lastCursorPosition.set(this.props.noteId, e.position);
    });

    editor.onMouseDown((event) => {
      const {
        editNote,
        noteId,
        note: { content },
      } = this.props;
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

    editNote(noteId, { content: nextValue });
  };

  render() {
    const { fontSize, noteId, note, theme } = this.props;
    const isMarkdown = note.systemTags.includes('markdown');

    return (
      <div className="note-content-editor-shell">
        <Monaco
          key={noteId}
          editorDidMount={this.editorReady}
          language={isMarkdown ? 'markdown' : 'plaintext'}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          onChange={this.updateNote}
          options={{
            automaticLayout: true,
            codeLens: false,
            contextmenu: false,
            folding: false,
            fontFamily:
              'SimplenoteTodo, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", sans-serif',
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
          value={this.props.note.content}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
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
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
