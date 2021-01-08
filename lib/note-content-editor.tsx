import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import Monaco, {
  ChangeHandler,
  EditorDidMount,
  EditorWillMount,
} from 'react-monaco-editor';
import {
  editor as Editor,
  languages,
  Range,
  Selection,
  SelectionDirection,
} from 'monaco-editor';
import * as monacoactions from 'monaco-editor/esm/vs/platform/actions/common/actions';

import { searchNotes, tagsFromSearch } from './search';
import actions from './state/actions';
import * as selectors from './state/selectors';
import { getTerms } from './utils/filter-notes';
import { noteTitleAndPreview } from './utils/note-utils';
import { isMac, isSafari } from './utils/platform';
import {
  withCheckboxCharacters,
  withCheckboxSyntax,
} from './utils/task-transform';

import * as S from './state';
import * as T from './types';

const SPEED_DELAY = 120;

const titleDecorationForLine = (line: number) => ({
  range: new Range(line, 1, line, 1),
  options: {
    isWholeLine: true,
    inlineClassName: 'note-title',
    stickiness: Editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
  },
});

const getEditorPadding = (lineLength: T.LineLength, width?: number) => {
  if (lineLength === 'full' || 'undefined' === typeof width) {
    return 25;
  }

  // magic number alert: 328px is the width of the sidebar :/
  // this logic matches "@media only screen and (max-width: 1400px)" in the CSS
  // 1400 is the viewport width; width is the width of the container element
  if (width <= 1400 - 328) {
    // should be 10% up to 1400px wide
    return width * 0.1;
  } else {
    // after 1400, calc((100% - 768px) / 2);
    return (width - 768) / 2;
  }
};

const getTextAfterBracket = (line: string, column: number) => {
  const precedingOpener = line.lastIndexOf('[', column);
  if (-1 === precedingOpener) {
    return { soFar: null, precedingBracket: null };
  }

  const precedingCloser = line.lastIndexOf(']', column);
  const precedingBracket =
    precedingOpener >= 0 && precedingCloser < precedingOpener
      ? precedingOpener
      : -1;

  const soFar =
    precedingBracket >= 0 ? line.slice(precedingBracket + 1, column) : '';

  return { soFar: soFar, precedingBracket: precedingBracket };
};

type OwnProps = {
  storeFocusEditor: (focusSetter: () => any) => any;
  storeHasFocus: (focusGetter: () => boolean) => any;
};

type StateProps = {
  editorSelection: [number, number, 'RTL' | 'LTR'];
  isFocusMode: boolean;
  keyboardShortcuts: boolean;
  lineLength: T.LineLength;
  noteId: T.EntityId;
  note: T.Note;
  notes: Map<T.EntityId, T.Note>;
  searchQuery: string;
  selectedSearchMatchIndex: number | null;
  spellCheckEnabled: boolean;
  theme: T.Theme;
};

type DispatchProps = {
  clearSearch: () => any;
  editNote: (noteId: T.EntityId, changes: Partial<T.Note>) => any;
  insertTask: () => any;
  openNote: (noteId: T.EntityId) => any;
  storeEditorSelection: (
    noteId: T.EntityId,
    start: number,
    end: number,
    direction: 'LTR' | 'RTL'
  ) => any;
  storeNumberOfMatchesInNote: (matches: number) => any;
  storeSearchSelection: (index: number) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

type OwnState = {
  content: string;
  editor: 'fast' | 'full';
  noteId: T.EntityId | null;
  overTodo: boolean;
  searchQuery: string;
};

class NoteContentEditor extends Component<Props> {
  bootTimer: ReturnType<typeof setTimeout> | null = null;
  editor: Editor.IStandaloneCodeEditor | null = null;
  monaco: Monaco | null = null;
  contentDiv = createRef<HTMLDivElement>();
  decorations: string[] = [];
  matchesInNote: [] = [];

  state: OwnState = {
    content: '',
    editor: 'fast',
    noteId: null,
    overTodo: false,
    searchQuery: '',
  };

  static getDerivedStateFromProps(props: Props, state: OwnState) {
    const goFast = props.note.content.length > 5000;
    const contentChanged = props.note.content !== state.content;
    const noteChanged = props.noteId !== state.noteId;

    const content = contentChanged
      ? noteChanged && goFast
        ? props.note.content.slice(0, props.editorSelection[1] + 5000)
        : withCheckboxCharacters(props.note.content)
      : state.content;

    const editor = noteChanged ? (goFast ? 'fast' : 'full') : state.editor;

    // reset search selection when either the note or the search changes
    // to avoid, for example, opening a note and having the fourth match selected (or "4 of 1")
    const searchChanged = props.searchQuery !== state.searchQuery;
    if (noteChanged || searchChanged) {
      props.storeSearchSelection(0);
    }

    return {
      content,
      editor,
      noteId: props.noteId,
      searchQuery: props.searchQuery,
    };
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
    if (document?.activeElement?.id !== 'search-field') {
      this.focusEditor();
    }
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
    window.addEventListener('toggleChecklist', this.handleChecklist, true);
    this.toggleShortcuts(true);

    /* remove unwanted context menu items */
    const menus = monacoactions.MenuRegistry._menuItems;
    const contextMenuEntry = [...menus].find(
      (entry) => entry[0]._debugName === 'EditorContext'
    );
    const contextMenuLinks = contextMenuEntry[1];
    const removableIds = [
      'editor.action.changeAll',
      'editor.action.clipboardCutAction',
      'editor.action.clipboardCopyAction',
      'editor.action.clipboardPasteAction',
      'editor.action.quickCommand',
    ];
    const removeById = (list, ids) => {
      let node = list._first;
      do {
        const shouldRemove = ids.includes(node.element?.command?.id);
        if (shouldRemove) {
          list._remove(node);
        }
      } while ((node = node.next));
    };
    removeById(contextMenuLinks, removableIds);
  }

  componentWillUnmount() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
    }
    window.electron?.removeListener('editorCommand');
    window.removeEventListener('input', this.handleUndoRedo, true);
    window.removeEventListener('toggleChecklist', this.handleChecklist, true);
    this.toggleShortcuts(false);
  }

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  completionProvider: (
    selectedNoteId: T.EntityId | null,
    editor: Editor.IStandaloneCodeEditor
  ) => languages.CompletionItemProvider = (selectedNoteId, editor) => {
    return {
      triggerCharacters: ['['],

      provideCompletionItems(model, position, context, token) {
        const line = model.getLineContent(position.lineNumber);
        const precedingOpener = line.lastIndexOf('[', position.column);
        const precedingCloser = line.lastIndexOf(']', position.column);
        const precedingBracket =
          precedingOpener >= 0 && precedingCloser < precedingOpener
            ? precedingOpener
            : -1;
        const soFar =
          precedingBracket >= 0
            ? line.slice(precedingBracket + 1, position.column)
            : '';

        const notes = searchNotes(
          {
            collection: { type: 'all' },
            excludeIDs: selectedNoteId ? [selectedNoteId] : [],
            searchTags: tagsFromSearch(soFar),
            searchTerms: getTerms(soFar),
            titleOnly: true,
          },
          5
        ).map(([noteId, note]) => ({
          noteId,
          content: note.content,
          isPinned: note.systemTags.includes('pinned'),
          ...noteTitleAndPreview(note),
        }));

        const additionalTextEdits =
          precedingBracket >= 0
            ? [
                {
                  text: '',
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: precedingBracket,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                },
              ]
            : [];

        return {
          incomplete: true,
          suggestions: notes.map((note, index) => ({
            additionalTextEdits,
            kind: note.isPinned
              ? languages.CompletionItemKind.Snippet
              : languages.CompletionItemKind.File,
            label: note.title,
            // detail: note.preview,
            documentation: note.content,
            insertText: `[${note.title}](simplenote://note/${note.noteId})`,
            sortText: index.toString(),
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          })),
        };
      },
    };
  };

  handleShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();

    const cmdOrCtrl = ctrlKey || metaKey;
    if (cmdOrCtrl && shiftKey && key === 'g') {
      this.setPrevSearchSelection();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // Electron can trigger this from the menu
    if (!window.electron && cmdOrCtrl && !shiftKey && key === 'g') {
      this.setNextSearchSelection();
      event.stopPropagation();
      event.preventDefault();
      return false;
    }
  };

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

    if (this.props.searchQuery === '' && prevProps.searchQuery !== '') {
      this.editor?.setSelection(new this.monaco.Range(0, 0, 0, 0));
    }

    if (
      this.props.lineLength !== prevProps.lineLength ||
      this.props.isFocusMode !== prevProps.isFocusMode
    ) {
      // @TODO: This timeout is necessary for no apparent reason
      //        Figure out why and take it out!
      setTimeout(() => {
        if (this.editor) {
          this.editor.layout();
        }
      }, 400);
    }

    if (
      this.editor &&
      this.state.editor === 'full' &&
      prevProps.searchQuery !== this.props.searchQuery
    ) {
      this.editor?.layout();
      this.setDecorators();
    }

    if (
      this.editor &&
      this.state.editor === 'full' &&
      prevProps.selectedSearchMatchIndex !== this.props.selectedSearchMatchIndex
    ) {
      this.setSearchSelection(this.props.selectedSearchMatchIndex);
    }
  }

  setDecorators = () => {
    this.matchesInNote = this.searchMatches() ?? [];
    this.props.storeNumberOfMatchesInNote(this.matchesInNote.length);
    const titleDecoration = this.getTitleDecoration() ?? [];

    this.decorations = this.editor.deltaDecorations(this.decorations, [
      ...this.matchesInNote,
      ...titleDecoration,
    ]);
  };

  getTitleDecoration = () => {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    for (let i = 1; i <= model.getLineCount(); i++) {
      const line = model.getLineContent(i);
      if (line.trim().length > 0) {
        return [titleDecorationForLine(i)];
      }
    }
    return;
  };

  searchMatches = () => {
    if (!this.editor || !this.props.searchQuery) {
      return;
    }
    const model = this.editor.getModel();
    const terms = getTerms(this.props.searchQuery)
      .map((term) => term.normalize().toLowerCase())
      .filter((term) => term.trim().length > 0);

    if (terms.length === 0) {
      return [];
    }

    const content = model.getValue().normalize().toLowerCase();

    const highlights = terms.reduce(
      (matches: monaco.languages.DocumentHighlight, term) => {
        let termAt = null;
        let startAt = 0;

        while (termAt !== -1) {
          termAt = content.indexOf(term, startAt);
          if (termAt === -1) {
            break;
          }

          startAt = termAt + term.length;

          const start = model.getPositionAt(termAt);
          const end = model.getPositionAt(termAt + term.length);

          matches.push({
            options: {
              inlineClassName: 'search-decoration',
              overviewRuler: {
                color: '#3361cc',
                position: Editor.OverviewRulerLane.Full,
              },
            },
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
          });
        }

        return matches;
      },
      []
    );
    return highlights;
  };

  focusEditor = () => this.editor?.focus();

  hasFocus = () => this.editor?.hasTextFocus();

  handleChecklist = (event: InputEvent) => {
    this.editor?.trigger('editorCommand', 'insertChecklist', null);
  };

  handleUndoRedo = (event: InputEvent) => {
    switch (event.inputType) {
      case 'historyUndo':
        this.editor?.trigger('browserMenu', 'undo', null);
        event.preventDefault();
        event.stopPropagation();
        return;
      case 'historyRedo':
        this.editor?.trigger('browserMenu', 'redo', null);
        event.preventDefault();
        event.stopPropagation();
        return;
    }
  };

  cancelSelectionOrSearch = (editor: Editor.IStandaloneCodeEditor) => {
    if (this.props.searchQuery.length > 0 && this.matchesInNote.length > 0) {
      this.props.clearSearch();
      return;
    }
    editor.trigger('customAction', 'cancelSelection', null);
  };

  insertOrRemoveCheckboxes = (editor: Editor.IStandaloneCodeEditor) => {
    // todo: we're not disabling this if !this.props.keyboardShortcuts, do we want to?
    // try to get any selected text first
    const selection = editor.getSelection();
    if (selection) {
      for (
        let i = selection.startLineNumber;
        i <= selection.endLineNumber;
        i++
      ) {
        this.toggleChecklistForLine(editor, i);
      }
    } else {
      const position = editor.getPosition();
      if (!position) {
        return;
      }
      this.toggleChecklistForLine(editor, position.lineNumber);
    }
  };

  toggleChecklistForLine = (
    editor: Editor.IStandaloneCodeEditor,
    lineNumber: number
  ) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }
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

  editorInit: EditorWillMount = (monaco) => {
    Editor.defineTheme('simplenote', {
      base: 'vs',
      inherit: true,
      rules: [{ background: 'FFFFFF', foreground: '#2c3338' }],
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
      rules: [{ background: '1d2327', foreground: 'ffffff' }],
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

    monaco.languages.registerLinkProvider('plaintext', {
      provideLinks: (model) => {
        const matches = model.findMatches(
          'simplenote://note/[a-zA-Z0-9-]+',
          true, // searchOnlyEditableRange
          true, // isRegex
          false, // matchCase
          null, // wordSeparators
          false // captureMatches
        );
        return {
          // don't set a URL on these links, because then Monaco skips resolveLink
          // @cite: https://github.com/Microsoft/vscode/blob/8f89095aa6097f6e0014f2d459ef37820983ae55/src/vs/editor/contrib/links/getLinks.ts#L43:L65
          links: matches.map(({ range }) => ({ range })),
        };
      },
      resolveLink: (link) => {
        const href = editor.getModel()?.getValueInRange(link.range) ?? '';
        const match = /^simplenote:\/\/note\/(.+)$/.exec(href);
        if (!match) {
          return;
        }

        const [fullMatch, linkedNoteId] = match as [string, T.EntityId];

        // if we try to open a note that doesn't exist in local state,
        // then we annoyingly close the open note without opening anything else
        // implicit else: links that aren't openable will just do nothing
        if (this.props.notes.has(linkedNoteId)) {
          this.props.openNote(linkedNoteId);
        }
        return { ...link, url: '#' }; // tell Monaco to do nothing and not complain about it
      },
    });

    // remove keybindings; see https://github.com/microsoft/monaco-editor/issues/287
    const shortcutsToDisable = [
      'cancelSelection', // escape; we need to allow this to bubble up to clear search
      'cursorUndo', // meta+U
      'editor.action.commentLine', // meta+/
      'editor.action.jumpToBracket', // shift+meta+\
      'editor.action.transposeLetters', // ctrl+T
      'expandLineSelection', // meta+L
      'editor.action.gotoLine', // ctrl+G
      // multicursor shortcuts
      'editor.action.insertCursorAbove', // alt+meta+UpArrow
      'editor.action.insertCursorBelow', // alt+meta+DownArrow
      'editor.action.insertCursorAtEndOfEachLineSelected', // shift+alt+I
      // search shortcuts
      'actions.find',
      'actions.findWithSelection',
      'editor.action.addSelectionToNextFindMatch',
      'editor.action.nextMatchFindAction',
      'editor.action.selectHighlights',
    ];
    // let Electron menus trigger these on the Mac
    // this breaks the shortcuts on Win/Linux -- not sure why
    if (window.electron && isMac) {
      shortcutsToDisable.push('undo', 'redo', 'editor.action.selectAll');
    }
    shortcutsToDisable.forEach(function (action) {
      editor._standaloneKeybindingService.addDynamicKeybinding(
        '-' + action,
        undefined,
        () => {}
      );
    });

    // disable editor keybindings for Electron since it is handled by editorCommand
    // doing it this way will always show the keyboard hint in the context menu!
    editor.createContextKey(
      'allowBrowserKeybinding',
      window.electron ? false : true
    );

    editor.addAction({
      id: 'context_undo',
      label: 'Undo',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 2,
      // precondition: 'undo',
      run: () => {
        editor.trigger('contextMenu', 'undo', null);
      },
    });
    editor.addAction({
      id: 'context_redo',
      label: 'Redo',
      keybindings: [
        monaco.KeyMod.WinCtrl | monaco.KeyCode.KEY_Y,
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z,
        // @todo can we switch these so Windows displays the default ^Y?
      ],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 3,
      // precondition: 'redo',
      run: () => {
        editor.trigger('contextMenu', 'redo', null);
      },
    });

    // add a new Cut and Copy that show keyboard shortcuts
    editor.addAction({
      id: 'context_cut',
      label: 'Cut',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_X],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1,
      run: () => {
        editor.trigger('contextMenu', 'editor.action.clipboardCutAction', null);
      },
    });
    editor.addAction({
      id: 'context_copy',
      label: 'Copy',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_C],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 2,
      run: () => {
        editor.trigger(
          'contextMenu',
          'editor.action.clipboardCopyAction',
          null
        );
      },
    });

    editor.addAction({
      id: 'cancel_selection',
      label: 'Cancel Selection',
      keybindings: [monaco.KeyCode.Escape],
      keybindingContext: '!suggestWidgetVisible',
      run: this.cancelSelectionOrSearch,
    });

    /* paste doesn't work in the browser due to security issues */
    if (window.electron) {
      editor.addAction({
        id: 'paste',
        label: 'Paste',
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 3,
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_V],
        keybindingContext: 'allowBrowserKeybinding',
        run: () => {
          document.execCommand('paste');
        },
      });
    }

    editor.addAction({
      id: 'select_all',
      label: 'Select All',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_A],
      keybindingContext: 'allowBrowserKeybinding',
      run: () => {
        editor.setSelection(editor.getModel().getFullModelRange());
      },
    });

    editor.addAction({
      id: 'insertChecklist',
      label: 'Insert Checklist',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_C,
        monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KEY_C,
      ],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '10_checklist',
      contextMenuOrder: 1,
      run: this.insertOrRemoveCheckboxes,
    });

    editor.addAction({
      id: 'selectUpWithoutMulticursor',
      label: 'Select Up',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.UpArrow,
      ],
      run: () => {
        editor.trigger('shortcuts', 'cursorUpSelect', null);
      },
    });
    editor.addAction({
      id: 'selectDownWithoutMulticursor',
      label: 'Select Down',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.DownArrow,
      ],
      run: () => {
        editor.trigger('shortcuts', 'cursorDownSelect', null);
      },
    });

    // Tab to indent lists and tasks
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const lineNumber = editor.getPosition()?.lineNumber;
      if (!lineNumber) {
        return;
      }
      const thisLine = editor.getModel()?.getLineContent(lineNumber);
      const isList = /^(\s*)([-+*\u2022\ue000\ue001])(\s+)/;
      if (thisLine && isList.test(thisLine)) {
        editor.trigger('commands', 'editor.action.indentLines', null);
      } else {
        // default tab key behavior
        editor.trigger('commands', 'tab', null);
      }
    });

    window.electron?.receive('editorCommand', (command) => {
      switch (command.action) {
        case 'findAgain':
          this.setNextSearchSelection();
          return;
        case 'insertChecklist':
          editor.trigger('editorCommand', 'insertChecklist', null);
          return;
        case 'redo':
          if (editor.hasTextFocus()) {
            editor.trigger('editorCommand', 'redo', null);
          } else {
            document.execCommand('redo');
          }
          return;
        case 'selectAll':
          if (editor.hasTextFocus()) {
            editor.setSelection(editor.getModel().getFullModelRange());
          } else {
            document.execCommand('selectAll');
          }
          return;
        case 'undo':
          if (editor.hasTextFocus()) {
            editor.trigger('editorCommand', 'undo', null);
          } else {
            document.execCommand('undo');
          }
          return;
      }
    });

    // handle undo and redo from menu in browser
    if (!window.electron) {
      window.addEventListener('input', this.handleUndoRedo, true);
    }

    this.setDecorators();
    // make component rerender after the decorators are set.
    this.setState({});
    editor.onDidChangeModelContent(() => this.setDecorators());

    // register completion provider for internal links
    const completionProviderHandle = monaco.languages.registerCompletionItemProvider(
      'plaintext',
      this.completionProvider(this.state.noteId, editor)
    );
    editor.onDidDispose(() => completionProviderHandle?.dispose());
    monaco.languages.setLanguageConfiguration('plaintext', {
      // Allow any non-whitespace character to be part of a "word"
      // This prevents the dictionary suggestions from taking over our autosuggest
      wordPattern: /[^\s]+/g,
    });

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

      // a range spanning more than one column means we're over the gutter
      if (range.endColumn - range.startColumn > 1) {
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

      const overTodo =
        content[offset] === '\ue000' || content[offset] === '\ue001';
      if (this.state.overTodo !== overTodo) {
        this.setState({ overTodo });
      }
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

      // a range spanning more than one column means we're over the gutter
      if (range.endColumn - range.startColumn > 1) {
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
        ({ text }) =>
          (text[0] === '\r' || text[0] === '\n') && text.trim() === ''
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

        const range = new this.monaco.Range(
          lineNumber,
          0,
          lineNumber + 1,
          thisLine.length + 1
        );
        const identifier = { major: 1, minor: 1 };
        const op = { identifier, range, text: null, forceMoveMarkers: true };

        Promise.resolve().then(() => {
          this.editor.executeEdits('autolist', [op]);
          this.editor.setPosition({
            column: 0,
            lineNumber: lineNumber,
          });
        });

        return;
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

  setNextSearchSelection = () => {
    const { selectedSearchMatchIndex: index } = this.props;
    const total = this.matchesInNote.length;
    const newIndex = (total + (index ?? -1) + 1) % total;
    this.props.storeSearchSelection(newIndex);
    this.setSearchSelection(newIndex);
  };

  setPrevSearchSelection = () => {
    const { selectedSearchMatchIndex: index } = this.props;
    const total = this.matchesInNote.length;
    const newIndex = (total + (index ?? total) - 1) % total;
    this.props.storeSearchSelection(newIndex);
    this.setSearchSelection(newIndex);
  };

  setSearchSelection = (index) => {
    if (!this.matchesInNote.length) {
      return;
    }
    const range = this.matchesInNote[index].range;
    this.editor.setSelection(range);
    this.editor.revealLineInCenter(range.startLineNumber);
    this.focusEditor();

    const newDecorations = [];
    this.matchesInNote.forEach((match) => {
      let decoration = {};
      if (match.range === range) {
        decoration = {
          range: match.range,
          options: { inlineClassName: 'selected-search' },
        };
      } else {
        decoration = {
          range: match.range,
          options: { inlineClassName: 'search-decoration' },
        };
      }
      newDecorations.push(decoration);
    });

    this.decorations = this.editor.deltaDecorations(
      this.decorations,
      newDecorations
    );
  };

  render() {
    const { lineLength, noteId, searchQuery, theme } = this.props;
    const { content, editor, overTodo } = this.state;
    const searchMatches = searchQuery ? this.searchMatches() : [];

    const editorPadding = getEditorPadding(
      lineLength,
      this.contentDiv.current?.offsetWidth
    );

    return (
      <div
        ref={this.contentDiv}
        className={`note-content-editor-shell${
          overTodo ? ' cursor-pointer' : ''
        }`}
        onClick={this.focusEditor}
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
              folding: false,
              fontFamily:
                '"Simplenote Tasks", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", sans-serif',
              hideCursorInOverviewRuler: true,
              lineDecorationsWidth: editorPadding,
              fontSize: 16,
              lineHeight: 24,
              lineNumbers: 'off',
              links: true,
              matchBrackets: 'never',
              minimap: { enabled: false },
              occurrencesHighlight: false,
              overviewRulerBorder: false,
              quickSuggestions: false,
              renderIndentGuides: false,
              renderLineHighlight: 'none',
              scrollbar: {
                horizontal: 'hidden',
                useShadows: false,
                verticalScrollbarSize: editorPadding,
              },
              scrollBeyondLastLine: false,
              selectionHighlight: false,
              suggestOnTriggerCharacters: true,
              unusualLineTerminators: 'auto',
              wordWrap: 'bounded',
              wrappingStrategy: isSafari ? 'simple' : 'advanced',
              wordWrapColumn: 400,
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
  isFocusMode: state.settings.focusModeEnabled,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  lineLength: state.settings.lineLength,
  noteId: state.ui.openedNote,
  note: state.data.notes.get(state.ui.openedNote),
  notes: state.data.notes,
  searchQuery: state.ui.searchQuery,
  selectedSearchMatchIndex: state.ui.selectedSearchMatchIndex,
  spellCheckEnabled: state.settings.spellCheckEnabled,
  theme: selectors.getTheme(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  clearSearch: () => actions.ui.search(''),
  editNote: actions.data.editNote,
  insertTask: () => ({ type: 'INSERT_TASK' }),
  openNote: actions.ui.selectNote,
  storeEditorSelection: (noteId, start, end, direction) => ({
    type: 'STORE_EDITOR_SELECTION',
    noteId,
    start,
    end,
    direction,
  }),
  storeNumberOfMatchesInNote: (matches) => ({
    type: 'STORE_NUMBER_OF_MATCHES_IN_NOTE',
    matches,
  }),
  storeSearchSelection: (index) => ({
    type: 'STORE_SEARCH_SELECTION',
    index,
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
