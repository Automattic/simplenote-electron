import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import Monaco, {
  ChangeHandler,
  EditorDidMount,
  EditorWillMount,
} from 'react-monaco-editor';
import {
  editor as Editor,
  CancellationToken,
  IKeyboardEvent,
  languages,
  IRange,
  Position,
  Range,
  Selection,
  SelectionDirection,
} from 'monaco-editor';

import { searchNotes, tagsFromSearch } from './search';
import actions from './state/actions';
import * as selectors from './state/selectors';
import {
  clipboardHtmlToMarkdown,
  clipboardItemsHtmlToMarkdown,
  insertMarkdownPaste,
} from './utils/clipboard/html-to-markdown';
import {
  buildSourceClipboardPayload,
  writeClipboardPayload,
} from './utils/clipboard/copy';
import { getTerms } from './utils/filter-notes';
import { noteTitleAndPreview } from './utils/note-utils';
import {
  getNextSlashCommandIndex,
  getSlashCommandKeyAction,
  getSlashCommandSuggestions,
  getSlashCommandTrigger,
  SlashCommandId,
  SlashCommandSuggestion,
  SlashCommandTrigger,
} from './slash-commands';
import {
  clearNotePositions,
  getNotePosition,
  setNotePosition,
} from './utils/note-scroll-position';
import { isMac, isSafari } from './utils/platform';
import {
  withCheckboxCharacters,
  withCheckboxSyntax,
} from './utils/task-transform';
import { warmMarkdownRenderer } from './utils/render-note-to-html';

import * as S from './state';
import * as T from './types';

const SPEED_DELAY = 120;

const overviewRuler = {
  color: '#3361cc',
  position: Editor.OverviewRulerLane.Full,
};

const selectedSearchDecoration = (range: IRange) => ({
  range: range,
  options: {
    inlineClassName: 'selected-search',
    zIndex: 10,
    overviewRuler: overviewRuler,
  },
});

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
  exportNotes: () => any;
  focusSearchField: () => any;
  insertTask: () => any;
  openNote: (noteId: T.EntityId) => any;
  showKeyboardShortcuts: () => any;
  showPreferences: () => any;
  storeEditorSelection: (
    noteId: T.EntityId,
    start: number,
    end: number,
    direction: 'LTR' | 'RTL'
  ) => any;
  storeNumberOfMatchesInNote: (matches: number) => any;
  storeSearchSelection: (index: number | null) => any;
  toggleFocusMode: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

type OwnState = {
  content: string;
  editor: 'fast' | 'full';
  noteId: T.EntityId | null;
  overTodo: boolean;
  searchQuery: string;
  slashCommand: SlashCommandPaletteState | null;
};

type SlashCommandPaletteState = {
  trigger: SlashCommandTrigger;
  suggestions: SlashCommandSuggestion[];
  selectedIndex: number;
  top: number;
  left: number;
  ghostText: string;
};

class NoteContentEditor extends Component<Props> {
  bootTimer: ReturnType<typeof setTimeout> | null = null;
  editor: Editor.IStandaloneCodeEditor | null = null;
  contentDiv = createRef<HTMLDivElement>();
  slashCommandPalette = createRef<HTMLDivElement>();
  decorations: Editor.IEditorDecorationsCollection | undefined;
  matchesInNote: Editor.IModelDeltaDecoration[] = [];
  selectedDecoration: Editor.IEditorDecorationsCollection | undefined;
  slashCommandDecoration: Editor.IEditorDecorationsCollection | undefined;

  state: OwnState = {
    content: '',
    editor: 'fast',
    noteId: null,
    overTodo: false,
    searchQuery: '',
    slashCommand: null,
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
      props.storeSearchSelection(null);
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
        const position = getNotePosition(noteId);
        if (position) {
          this.editor?.setScrollPosition({
            scrollTop: position,
          });
        }
      }
    }, SPEED_DELAY);
    this.focusEditor();
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
    window.addEventListener('resize', clearNotePositions);
    window.addEventListener('toggleChecklist', this.handleChecklist, true);
    document.addEventListener('copy', this.handleCopy);
    document.addEventListener('paste', this.handlePaste, true);
    this.toggleShortcuts(true);
    this.warmMarkdownRendererIfNeeded();
  }

  componentWillUnmount() {
    setNotePosition(this.props.noteId, this.editor?.getScrollTop() ?? 0);

    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
    }
    window.electron?.removeListener('editorCommand');
    window.removeEventListener('input', this.handleUndoRedo, true);
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('paste', this.handlePaste, true);
    window.removeEventListener('toggleChecklist', this.handleChecklist, true);
    window.removeEventListener('resize', clearNotePositions, true);
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

      provideCompletionItems(
        model: Editor.ITextModel,
        position: Position,
        _context: languages.CompletionContext,
        _token: CancellationToken
      ) {
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
        )
          .filter(([noteId, note]) => {
            return typeof note !== 'undefined';
          })
          .map(([noteId, note]) => ({
            noteId,
            content: note!.content,
            isPinned: note!.systemTags.includes('pinned'),
            ...noteTitleAndPreview(note!),
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
      this.editor?.setSelection(new Range(0, 0, 0, 0));
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

    if (
      prevProps.noteId !== this.props.noteId ||
      prevProps.note.systemTags !== this.props.note.systemTags
    ) {
      this.warmMarkdownRendererIfNeeded();
    }
  }

  warmMarkdownRendererIfNeeded = () => {
    if (this.props.note.systemTags.includes('markdown')) {
      warmMarkdownRenderer();
    }
  };

  setDecorators = () => {
    // special styling for title (first line)
    const titleDecoration = this.getTitleDecoration();
    titleDecoration &&
      this.editor?.createDecorationsCollection([titleDecoration]);

    // search highlights
    this.matchesInNote = this.searchMatches() ?? [];
    this.props.storeNumberOfMatchesInNote(this.matchesInNote.length);

    this.decorations?.clear();
    if (this.matchesInNote.length === 0) {
      return;
    }
    this.decorations = this.editor?.createDecorationsCollection(
      this.matchesInNote
    );

    // selected search highlight
    this.selectedDecoration?.clear();
    const range = this.editor?.getSelection();
    if (range) {
      this.matchesInNote.forEach((match) => {
        if (match.range === range) {
          this.editor?.createDecorationsCollection([
            selectedSearchDecoration(range),
          ]);
        }
      });
    }
  };

  getTitleDecoration = () => {
    const model = this.editor?.getModel();
    if (!model) {
      return;
    }

    for (let i = 1; i <= model.getLineCount(); i++) {
      const line = model.getLineContent(i);
      if (line.trim().length > 0) {
        return titleDecorationForLine(i);
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

    const highlights = terms.reduce(
      (matches: Editor.IModelDeltaDecoration[], term) => {
        const findMatches = model?.findMatches(
          term,
          true,
          false,
          false,
          null,
          false
        );
        findMatches?.forEach((match) => {
          matches.push({
            options: {
              inlineClassName: 'search-decoration',
              overviewRuler: overviewRuler,
            },
            range: match.range,
          });
        });
        return matches;
      },
      []
    );
    return highlights;
  };

  focusEditor = () => this.editor?.focus();

  hasFocus = () => this.editor?.hasTextFocus() || false;

  clearSlashCommand = () => {
    this.slashCommandDecoration?.clear();
    if (this.state.slashCommand) {
      this.setState({ slashCommand: null });
    }
  };

  updateSlashCommand = () => {
    const editor = this.editor;
    const model = editor?.getModel();
    const position = editor?.getPosition();
    const selection = editor?.getSelection();

    if (!editor || !model || !position || !selection?.isEmpty()) {
      this.clearSlashCommand();
      return;
    }

    const line = model.getLineContent(position.lineNumber);
    const trigger = getSlashCommandTrigger(line, position.column);

    if (!trigger) {
      this.clearSlashCommand();
      return;
    }

    const suggestions = getSlashCommandSuggestions(trigger.query);
    if (suggestions.length === 0) {
      this.clearSlashCommand();
      return;
    }

    const visiblePosition = editor.getScrolledVisiblePosition(position);
    if (!visiblePosition) {
      this.clearSlashCommand();
      return;
    }

    const layout = editor.getLayoutInfo();
    const paletteWidth = this.slashCommandPalette.current?.offsetWidth ?? 280;
    const paletteHeight = this.slashCommandPalette.current?.offsetHeight ?? 180;
    const left = Math.max(
      8,
      Math.min(visiblePosition.left, layout.width - paletteWidth - 8)
    );
    const top =
      visiblePosition.top + paletteHeight > layout.height
        ? Math.max(8, visiblePosition.top - paletteHeight)
        : visiblePosition.top + visiblePosition.height + 6;

    const previous = this.state.slashCommand;
    const previousCommandId =
      previous?.suggestions[previous.selectedIndex]?.command.id;
    const selectedIndex = Math.max(
      0,
      suggestions.findIndex(({ command }) => command.id === previousCommandId)
    );
    const selected = suggestions[selectedIndex] ?? suggestions[0];
    const nextSlashCommand = {
      trigger,
      suggestions,
      selectedIndex,
      top,
      left,
      ghostText: selected?.completion ?? '',
    };

    this.setState({ slashCommand: nextSlashCommand }, () =>
      this.updateSlashCommandGhostText(nextSlashCommand)
    );
  };

  updateSlashCommandGhostText = (slashCommand = this.state.slashCommand) => {
    this.slashCommandDecoration?.clear();

    if (!this.editor || !slashCommand?.ghostText) {
      return;
    }

    const model = this.editor.getModel();
    const position = this.editor.getPosition();

    if (!model || !position) {
      return;
    }

    const range = new Range(
      position.lineNumber,
      slashCommand.trigger.endColumn,
      position.lineNumber,
      slashCommand.trigger.endColumn
    );

    this.slashCommandDecoration = this.editor.createDecorationsCollection([
      {
        range,
        options: {
          showIfCollapsed: true,
          after: {
            content: slashCommand.ghostText,
            inlineClassName: 'slash-command-ghost',
            cursorStops: Editor.InjectedTextCursorStops.None,
          },
        },
      },
    ]);
  };

  selectSlashCommand = (selectedIndex: number) => {
    const { slashCommand } = this.state;
    const selected = slashCommand?.suggestions[selectedIndex];

    if (!slashCommand || !selected) {
      return;
    }

    const nextSlashCommand = {
      ...slashCommand,
      selectedIndex,
      ghostText: selected.completion,
    };

    this.setState({ slashCommand: nextSlashCommand }, () =>
      this.updateSlashCommandGhostText(nextSlashCommand)
    );
  };

  selectNextSlashCommand = (offset: number) => {
    const { slashCommand } = this.state;
    if (!slashCommand) {
      return;
    }

    const nextIndex = getNextSlashCommandIndex(
      slashCommand.suggestions.length,
      slashCommand.selectedIndex,
      offset
    );

    this.selectSlashCommand(nextIndex);
  };

  replaceSlashCommandToken = (text: string) => {
    const { slashCommand } = this.state;
    const editor = this.editor;
    const position = editor?.getPosition();

    if (!slashCommand || !editor || !position) {
      return;
    }

    const range = new Range(
      position.lineNumber,
      slashCommand.trigger.startColumn,
      position.lineNumber,
      slashCommand.trigger.endColumn
    );

    editor.executeEdits('slash-command', [
      {
        range,
        text,
        forceMoveMarkers: true,
      },
    ]);

    editor.setPosition({
      lineNumber: position.lineNumber,
      column: slashCommand.trigger.startColumn + text.length,
    });
  };

  completeSlashCommand = () => {
    const { slashCommand } = this.state;
    const suggestion = slashCommand?.suggestions[slashCommand.selectedIndex];

    if (!slashCommand || !suggestion) {
      return;
    }

    this.replaceSlashCommandToken(`/${suggestion.command.name}`);
  };

  executeSlashCommand = (commandId?: SlashCommandId) => {
    const { slashCommand } = this.state;
    const command =
      commandId ??
      slashCommand?.suggestions[slashCommand.selectedIndex]?.command.id;

    if (!command) {
      return;
    }

    this.replaceSlashCommandToken('');
    this.clearSlashCommand();

    switch (command) {
      case 'search':
        this.props.focusSearchField();
        return;
      case 'shortcuts':
        this.props.showKeyboardShortcuts();
        return;
      case 'focus':
        this.props.toggleFocusMode();
        return;
      case 'pref':
        this.props.showPreferences();
        return;
      case 'export':
        this.props.exportNotes();
        return;
    }
  };

  handleEditorKeyDown = (event: IKeyboardEvent) => {
    const { slashCommand } = this.state;
    const browserEvent = event.browserEvent as KeyboardEvent;
    const action = getSlashCommandKeyAction(
      browserEvent.key,
      browserEvent.isComposing,
      !!slashCommand
    );

    if (!slashCommand || !action) {
      return;
    }

    switch (action) {
      case 'complete':
        event.preventDefault();
        event.stopPropagation();
        this.completeSlashCommand();
        return;
      case 'execute':
        event.preventDefault();
        event.stopPropagation();
        this.executeSlashCommand();
        return;
      case 'next':
        event.preventDefault();
        event.stopPropagation();
        this.selectNextSlashCommand(1);
        return;
      case 'previous':
        event.preventDefault();
        event.stopPropagation();
        this.selectNextSlashCommand(-1);
        return;
      case 'cancel':
        event.preventDefault();
        event.stopPropagation();
        this.clearSlashCommand();
        return;
      case 'cancel-and-type':
        this.clearSlashCommand();
        return;
    }
  };

  handleChecklist = (event: Event) => {
    this.editor?.trigger('editorCommand', 'insertChecklist', null);
  };

  handleCopy = (event: ClipboardEvent) => {
    if (!this.editor?.hasTextFocus() || !event.clipboardData) {
      return;
    }

    const plainText = event.clipboardData.getData('text/plain');

    if (!plainText) {
      return;
    }

    const didWrite = writeClipboardPayload(
      event.clipboardData,
      buildSourceClipboardPayload(
        plainText,
        this.props.note.systemTags.includes('markdown')
      )
    );

    if (didWrite) {
      event.preventDefault();
    }
  };

  handlePaste = (event: ClipboardEvent) => {
    if (event.defaultPrevented || !this.editor?.hasTextFocus()) {
      return;
    }

    const markdown = clipboardHtmlToMarkdown(event.clipboardData);

    if (!markdown) {
      return;
    }

    if (insertMarkdownPaste(this.editor, markdown)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  };

  pasteFromClipboard = async () => {
    const editor = this.editor;

    if (!editor) {
      return;
    }

    editor.focus();

    const markdown = await this.readClipboardMarkdown();

    if (markdown && insertMarkdownPaste(editor, markdown)) {
      return;
    }

    const text = await this.readClipboardText();

    if (text !== null && insertMarkdownPaste(editor, text)) {
      return;
    }

    editor.trigger('contextMenu', 'editor.action.clipboardPasteAction', null);
  };

  readClipboardMarkdown = async (): Promise<string | null> => {
    try {
      return await clipboardItemsHtmlToMarkdown(
        await navigator.clipboard?.read?.()
      );
    } catch {
      return null;
    }
  };

  readClipboardText = async (): Promise<string | null> => {
    try {
      return (await navigator.clipboard?.readText?.()) ?? null;
    } catch {
      return null;
    }
  };

  handleUndoRedo = (e: Event) => {
    const event = e as InputEvent;
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
    const range = new Range(
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
      rules: [],
      colors: {
        'editor.foreground': '#2c3338', // $studio-gray-80
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
      rules: [],
      colors: {
        'editor.foreground': '#ffffff',
        'editor.background': '#1d2327', // $studio-gray-90
        'editor.selectionBackground': '#646970', // $studio-gray-50
        'scrollbarSlider.activeBackground': '#646970', // $studio-gray-50
        'scrollbarSlider.background': '#2c3338', // $studio-gray-80
        'scrollbarSlider.hoverBackground': '#1d2327', // $studio-gray-90
        'textLink.foreground': '#ced9f2', // studio-simplenote-blue-5
      },
    });
  };

  editorReady: EditorDidMount = (editor, monaco) => {
    this.editor = editor;

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

        const [_fullMatch, linkedNoteId] = match as [string, T.EntityId];

        // if we try to open a note that doesn't exist in local state,
        // then we annoyingly close the open note without opening anything else
        // implicit else: links that aren't openable will just do nothing
        if (this.props.notes.has(linkedNoteId)) {
          this.props.openNote(linkedNoteId);
        }
        return { ...link, url: '#' }; // tell Monaco to do nothing and not complain about it
      },
    });

    /* remove unwanted context menu items */
    // see https://github.com/Microsoft/monaco-editor/issues/1058#issuecomment-468681208
    const idsToRemove = [
      'editor.action.changeAll',
      'editor.action.clipboardPasteAction',
      'editor.action.quickCommand',
    ];

    const contextmenu = this.editor.getContribution(
      'editor.contrib.contextmenu'
    );

    // @ts-ignore undocumented internals
    const realMethod = contextmenu._getMenuActions;

    // @ts-ignore undocumented internals
    contextmenu._getMenuActions = function (...args) {
      const items = realMethod.apply(contextmenu, args);

      return items.filter(function (item: Editor.IActionDescriptor) {
        return !idsToRemove.includes(item.id);
      });
    };

    // remove some default keybindings
    // @see https://github.com/microsoft/monaco-editor/issues/3623#issuecomment-1472578786
    const shortcutsToDisable = [
      'editor.action.quickCommand', // command palette
      'editor.action.commentLine', // meta+/
      'editor.action.transposeLetters', // ctrl+T
      'expandLineSelection', // meta+L
      'editor.action.gotoLine', // ctrl+G
      // search shortcuts
      'editor.action.changeAll',
      'actions.find',
      'actions.findWithSelection',
      'editor.action.addSelectionToNextFindMatch',
      'editor.action.nextMatchFindAction',
      'editor.action.selectHighlights',
    ];

    shortcutsToDisable.forEach(function (action) {
      monaco.editor.addKeybindingRule({
        keybinding: 0,
        command: '-' + action,
      });
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
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 2,
      run: () => {
        editor.trigger('contextMenu', 'undo', null);
      },
    });
    editor.addAction({
      id: 'context_redo',
      label: 'Redo',
      keybindings: [
        monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyY,
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
        // @todo can we switch these so Windows displays the default ^Y?
      ],
      keybindingContext: 'allowBrowserKeybinding',
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 3,
      run: () => {
        editor.trigger('contextMenu', 'redo', null);
      },
    });

    // re-add keybindings for cut/copy so they show labels. Paste needs the
    // browser paste event so rich clipboard HTML can be converted first.
    monaco.editor.addKeybindingRules([
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
        command: 'editor.action.clipboardCutAction',
        when: 'allowBrowserKeybinding && editorTextFocus',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
        command: 'editor.action.clipboardCopyAction',
        when: 'allowBrowserKeybinding && editorTextFocus',
      },
    ]);

    // cancel selection that bubbles up to clear any search terms
    editor.addAction({
      id: 'cancel_selection',
      label: 'Cancel Selection',
      keybindings: [monaco.KeyCode.Escape],
      keybindingContext: '!suggestWidgetVisible',
      run: this.cancelSelectionOrSearch,
    });

    editor.addAction({
      id: 'context_paste',
      label: 'Paste',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3,
      run: this.pasteFromClipboard,
    });

    editor.addAction({
      id: 'select_all',
      label: 'Select All',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
      keybindingContext: 'allowBrowserKeybinding && editorTextFocus',
      run: () => {
        const range = editor.getModel()?.getFullModelRange();
        range && editor.setSelection(range);
      },
    });

    editor.addAction({
      id: 'insertChecklist',
      label: 'Insert Checklist',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
        monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
      ],
      keybindingContext: 'allowBrowserKeybinding && editorTextFocus',
      contextMenuGroupId: '10_checklist',
      contextMenuOrder: 1,
      run: this.insertOrRemoveCheckboxes,
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
            const range = editor.getModel()?.getFullModelRange();
            range && editor.setSelection(range);
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

    editor.onKeyDown(this.handleEditorKeyDown);
    this.setDecorators();
    // make component rerender after the decorators are set.
    this.setState({});
    editor.onDidChangeModelContent(() => {
      this.setDecorators();
      this.updateSlashCommand();
    });
    editor.onDidScrollChange(() => this.updateSlashCommand());

    // register completion provider for internal links
    const completionProviderHandle =
      monaco.languages.registerCompletionItemProvider(
        'plaintext',
        this.completionProvider(this.state.noteId, editor)
      );
    editor.onDidDispose(() => completionProviderHandle?.dispose());

    const [startOffset, endOffset, direction] = this.props.editorSelection;
    const start = this.editor.getModel()?.getPositionAt(startOffset);
    const end = this.editor.getModel()?.getPositionAt(endOffset);

    start &&
      end &&
      this.editor.setSelection(
        Selection.createWithDirection(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column,
          direction === 'RTL' ? SelectionDirection.RTL : SelectionDirection.LTR
        )
      );

    start && editor.revealLine(start.lineNumber, Editor.ScrollType.Immediate);

    editor.onDidChangeCursorSelection(
      (e: Editor.ICursorSelectionChangedEvent) => {
        if (
          e.reason === Editor.CursorChangeReason.Undo ||
          e.reason === Editor.CursorChangeReason.Redo
        ) {
          // @TODO: Adjust selection in Undo/Redo
          this.clearSlashCommand();
          return;
        }

        const newStart = editor
          .getModel()
          ?.getOffsetAt(e.selection.getStartPosition());
        const newEnd = editor
          .getModel()
          ?.getOffsetAt(e.selection.getEndPosition());
        const newDirection =
          e.selection.getDirection() === SelectionDirection.LTR ? 'LTR' : 'RTL';

        newStart &&
          newEnd &&
          this.props.storeEditorSelection(
            this.props.noteId,
            newStart,
            newEnd,
            newDirection
          );

        this.updateSlashCommand();
      }
    );

    // @TODO: Is this really slow and dumb?
    editor.onMouseMove((e: Editor.IEditorMouseEvent) => {
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

    editor.onMouseDown((event: Editor.IEditorMouseEvent) => {
      if (
        (event.event.ctrlKey && event.event.leftButton) ||
        event.event.rightButton
      ) {
        // ignore right clicks and OSX trackpad right clicks (ctrl+click)
        return;
      }
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
      const prevLine = model?.getLineContent(lineNumber) || '';

      const prevList = /^(\s*)([-+*\u2022\ue000\ue001])(\s+)/.exec(prevLine);
      if (null === prevList) {
        return;
      }

      const thisLine = model?.getLineContent(lineNumber + 1) || '';
      if (!/^\s*$/.test(thisLine)) {
        return;
      }

      // Lonely bullets occur when we continue a list in order
      // to terminate the list. We expect the previous list bullet
      // to disappear and return us to the normal text flow
      const isLonelyBullet =
        thisLine.trim().length === 0 && prevLine.length === prevList[0].length;
      if (isLonelyBullet) {
        const prevLineStart = model?.getOffsetAt({
          column: 0,
          lineNumber: lineNumber,
        });

        const thisLineStart = model?.getOffsetAt({
          column: 0,
          lineNumber: lineNumber + 1,
        });

        const range = new Range(
          lineNumber,
          0,
          lineNumber + 1,
          thisLine.length + 1
        );
        const identifier = { major: 1, minor: 1 };
        const op = { identifier, range, text: null, forceMoveMarkers: true };

        Promise.resolve().then(() => {
          this.editor?.executeEdits('autolist', [op]);
          this.editor?.setPosition({
            column: 0,
            lineNumber: lineNumber,
          });
        });

        return;
      }

      const lineStart = model?.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 1,
      });

      const nextStart = model?.getOffsetAt({
        column: 0,
        lineNumber: lineNumber + 2,
      });

      const range = new Range(
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
        this.editor?.setPosition({
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
    this.focusEditor();
  };

  setPrevSearchSelection = () => {
    const { selectedSearchMatchIndex: index } = this.props;
    const total = this.matchesInNote.length;
    const newIndex = (total + (index ?? total) - 1) % total;
    this.props.storeSearchSelection(newIndex);
    this.setSearchSelection(newIndex);
    this.focusEditor();
  };

  setSearchSelection = (index: number | null) => {
    this.selectedDecoration?.clear();
    if (!this.matchesInNote.length || index === null || isNaN(index)) {
      return;
    }
    const range = this.matchesInNote[index].range;

    if (!range) {
      return;
    }
    this.editor?.setSelection(range);
    this.editor?.revealLineInCenter(range.startLineNumber);

    // Add a selected-search decoration on top of the existing decorations
    this.matchesInNote.forEach((match) => {
      if (match.range === range) {
        const selectedDecoration = selectedSearchDecoration(range);
        this.selectedDecoration = this.editor?.createDecorationsCollection([
          selectedDecoration,
        ]);
      }
    });
  };

  renderSlashCommandPalette = () => {
    const { slashCommand } = this.state;

    if (!slashCommand) {
      return null;
    }

    return (
      <div
        aria-label="Slash commands"
        className="slash-command-palette"
        ref={this.slashCommandPalette}
        role="listbox"
        style={{
          top: slashCommand.top,
          left: slashCommand.left,
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        {slashCommand.suggestions.map(({ command }, index) => {
          const isSelected = index === slashCommand.selectedIndex;
          return (
            <button
              aria-selected={isSelected}
              className={`slash-command-palette__item${
                isSelected ? ' is-selected' : ''
              }`}
              key={command.id}
              onMouseDown={(event) => {
                event.preventDefault();
                this.executeSlashCommand(command.id);
              }}
              onMouseEnter={() => this.selectSlashCommand(index)}
              role="option"
              type="button"
            >
              <span className="slash-command-palette__command">
                /{command.name}
              </span>
              <span className="slash-command-palette__title">
                {command.title}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  render() {
    const { lineLength, noteId, searchQuery, theme } = this.props;
    const { content, editor, overTodo } = this.state;

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
        onClick={(e: React.MouseEvent) => {
          // click was on the editor body, let the editor handle it
          const target = e.target as HTMLDivElement;
          if (
            target.classList.contains('view-line') ||
            target.classList.contains('view-lines')
          ) {
            return;
          }

          // it was a fake (trackpad) right click, ignore it
          if (e.ctrlKey) {
            // TODO it would be nice if we could trigger the context menu from the left gutter :/
            return;
          }
          this.focusEditor();
        }}
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
              copyWithSyntaxHighlighting: false,
              // @ts-ignore, @see https://github.com/microsoft/monaco-editor/issues/3829
              'bracketPairColorization.enabled': false,
              codeLens: false,
              folding: false,
              fontFamily:
                '"Simplenote Tasks", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen-Sans", "Ubuntu", "Cantarell", "Helvetica Neue", sans-serif',
              hideCursorInOverviewRuler: true,
              fontSize: 16,
              guides: { indentation: false },
              lineDecorationsWidth: editorPadding /* hack for left padding */,
              lineHeight: 24,
              lineNumbers: 'off',
              links: true,
              matchBrackets: 'never',
              minimap: { enabled: false },
              multiCursorLimit: 1,
              occurrencesHighlight: 'off',
              overviewRulerBorder: false,
              padding: { top: 40, bottom: 0 },
              quickSuggestions: false,
              renderControlCharacters: false,
              renderLineHighlight: 'none',
              renderWhitespace: 'none',
              scrollbar: {
                horizontal: 'hidden',
                useShadows: false,
                verticalScrollbarSize:
                  editorPadding /* hack for right padding */,
              },
              scrollBeyondLastLine: false,
              selectionHighlight: false,
              showFoldingControls: 'never',
              stickyScroll: { enabled: false },
              suggestOnTriggerCharacters: true,
              unicodeHighlight: {
                ambiguousCharacters: false,
                invisibleCharacters: false,
              },
              unusualLineTerminators: 'auto',
              wordWrap: 'bounded',
              wordWrapColumn: 400,
              wrappingIndent: 'none',
              wrappingStrategy: 'advanced',
            }}
            value={content}
          />
        )}
        {this.renderSlashCommandPalette()}
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
  exportNotes: actions.data.exportNotes,
  focusSearchField: actions.ui.focusSearchField,
  insertTask: () => ({ type: 'INSERT_TASK' }),
  openNote: actions.ui.selectNote,
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
  showPreferences: () => actions.ui.showDialog('SETTINGS'),
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
  toggleFocusMode: actions.settings.toggleFocusMode,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteContentEditor);
