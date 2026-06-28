import { buildEditorFromExtensions } from '@lexical/extension';
import React, { useMemo, useRef } from 'react';
import { render } from '@testing-library/react';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import {
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';

import {
  $exportMarkdownString,
  createMarkdownEditorExtension,
} from '../extensions/index';
import * as importExport from '../markdown/import-export';
import {
  applyRemoteMarkdownUpdate,
  NoteContentSyncTracker,
} from '../markdown/pipeline';
import { useNoteViewMemory } from './note-view-memory';
import { setNoteViewState } from '../../utils/note-scroll-position';
import {
  clearNoteHistory,
  getNoteHistoryStateForTesting,
  resetNoteHistoryRegistryForTesting,
} from './note-history-memory';
import { subscribeToolbarUndoRedo } from '../toolbar/register';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mountEditor(
  markdown: string,
  noteId: string,
  options?: { withViewMemory?: boolean }
) {
  const input = document.createElement('div');
  input.contentEditable = 'true';
  const shell = document.createElement('div');
  shell.appendChild(input);
  document.body.appendChild(shell);

  const editor = buildEditorFromExtensions(
    createMarkdownEditorExtension(markdown, undefined, {
      getScrollContainer: options?.withViewMemory ? () => shell : undefined,
      getScrollTop: options?.withViewMemory ? () => shell.scrollTop : undefined,
      noteId,
    })
  );
  editor.setRootElement(input);

  return {
    editor,
    unmount: () => {
      editor.setRootElement(null);
      shell.remove();
      editor.dispose();
    },
  };
}

function replaceFirstParagraphText(
  editor: ReturnType<typeof buildEditorFromExtensions>,
  text: string
) {
  editor.update(
    () => {
      const first = $getRoot().getFirstChild();
      if (!$isParagraphNode(first)) {
        throw new Error('Expected a paragraph');
      }
      first.clear();
      first.append($createTextNode(text));
    },
    { discrete: true }
  );
}

function NoteEditorHarness({
  markdown,
  noteId,
}: {
  markdown: string;
  noteId: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  useNoteViewMemory({ initialMarkdown: markdown, shellRef, noteId });

  const extension = useMemo(
    () =>
      createMarkdownEditorExtension(markdown, undefined, {
        getScrollContainer: () => shellRef.current,
        getScrollTop: () => shellRef.current?.scrollTop ?? 0,
        noteId,
      }),
    [markdown, noteId]
  );

  return (
    <LexicalExtensionComposer contentEditable={null} extension={extension}>
      <div ref={shellRef} className="lexical-md-editor-shell">
        <ContentEditable className="lexical-md-editor__input" />
      </div>
    </LexicalExtensionComposer>
  );
}

describe('note history memory', () => {
  beforeEach(() => {
    resetNoteHistoryRegistryForTesting();
  });

  it('preserves undo across a note switch round-trip', async () => {
    const noteId = 'note-a';

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    unmount1();

    const { editor: editor2, unmount: unmount2 } = mountEditor('HELLO', noteId);
    await flushMicrotasks();

    editor2.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();

    expect(editor2.read(() => $exportMarkdownString())).toBe('hello');
    unmount2();
  });

  it('preserves redo across a note switch round-trip', async () => {
    const noteId = 'note-a';

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    editor1.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    unmount1();

    const { editor: editor2, unmount: unmount2 } = mountEditor('hello', noteId);
    await flushMicrotasks();

    editor2.dispatchCommand(REDO_COMMAND, undefined);
    await flushMicrotasks();

    expect(editor2.read(() => $exportMarkdownString())).toBe('HELLO');
    unmount2();
  });

  it('keeps undo stacks isolated per note', async () => {
    const { editor: editorA1, unmount: unmountA1 } = mountEditor(
      'alpha',
      'note-a'
    );
    await flushMicrotasks();
    replaceFirstParagraphText(editorA1, 'ALPHA');
    await flushMicrotasks();
    unmountA1();

    const { editor: editorB1, unmount: unmountB1 } = mountEditor(
      'beta',
      'note-b'
    );
    await flushMicrotasks();
    replaceFirstParagraphText(editorB1, 'BETA');
    await flushMicrotasks();
    unmountB1();

    const { editor: editorA2, unmount: unmountA2 } = mountEditor(
      'ALPHA',
      'note-a'
    );
    await flushMicrotasks();
    editorA2.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    expect(editorA2.read(() => $exportMarkdownString())).toBe('alpha');
    unmountA2();

    const { editor: editorB2, unmount: unmountB2 } = mountEditor(
      'BETA',
      'note-b'
    );
    await flushMicrotasks();
    editorB2.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    expect(editorB2.read(() => $exportMarkdownString())).toBe('beta');
    unmountB2();
  });

  it('preserves history when dispose export fails', async () => {
    const noteId = 'note-a';

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    const stackAfterEdit =
      getNoteHistoryStateForTesting(noteId)?.undoStack.length ?? 0;

    const exportSpy = jest
      .spyOn(importExport, '$exportMarkdownString')
      .mockImplementation(() => {
        throw new Error('teardown export failed');
      });
    unmount1();
    exportSpy.mockRestore();

    const { editor: editor2, unmount: unmount2 } = mountEditor('HELLO', noteId);
    await flushMicrotasks();

    expect(getNoteHistoryStateForTesting(noteId)?.undoStack.length).toBe(
      stackAfterEdit
    );

    editor2.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    expect(editor2.read(() => $exportMarkdownString())).toBe('hello');

    unmount2();
  });

  it('clears history when incoming content diverged while away', async () => {
    const noteId = 'note-a';

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    unmount1();

    const { editor: editor2, unmount: unmount2 } = mountEditor(
      'remote edit',
      noteId
    );
    await flushMicrotasks();

    expect(getNoteHistoryStateForTesting(noteId)?.undoStack).toHaveLength(0);

    editor2.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();

    expect(editor2.read(() => $exportMarkdownString())).toBe('remote edit');
    unmount2();
  });

  it('clears history after a remote apply while the note is open', async () => {
    const noteId = 'note-a';
    const { editor, unmount } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor, 'HELLO');
    await flushMicrotasks();

    const tracker = new NoteContentSyncTracker();
    tracker.resetForNote('hello');

    await new Promise<void>((resolve) => {
      applyRemoteMarkdownUpdate(editor, 'goodbye', tracker, {
        editorFocused: false,
        isCancelled: () => false,
        scrollShell: null,
        scrollTop: 0,
      });
      queueMicrotask(async () => {
        await flushMicrotasks();
        resolve();
      });
    });

    expect(getNoteHistoryStateForTesting(noteId)?.undoStack).toHaveLength(0);
    expect(editor.read(() => $exportMarkdownString())).toBe('goodbye');

    editor.dispatchCommand(UNDO_COMMAND, undefined);
    await flushMicrotasks();
    expect(editor.read(() => $exportMarkdownString())).toBe('goodbye');

    unmount();
  });

  it('clearNoteHistory drops the registry entry for a note', async () => {
    const noteId = 'note-a';

    const { editor, unmount } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor, 'HELLO');
    await flushMicrotasks();
    expect(getNoteHistoryStateForTesting(noteId)).toBeDefined();

    clearNoteHistory(noteId);
    expect(getNoteHistoryStateForTesting(noteId)).toBeUndefined();

    unmount();
  });

  it('does not grow the undo stack when reopening a note', async () => {
    const noteId = 'note-a';

    const { unmount: unmountFirstOpen } = mountEditor('hello', noteId);
    await flushMicrotasks();
    expect(getNoteHistoryStateForTesting(noteId)?.undoStack).toHaveLength(0);
    unmountFirstOpen();

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    const stackAfterEdit =
      getNoteHistoryStateForTesting(noteId)?.undoStack.length ?? 0;
    unmount1();

    const { unmount: unmount2 } = mountEditor('HELLO', noteId);
    await flushMicrotasks();
    expect(getNoteHistoryStateForTesting(noteId)?.undoStack.length).toBe(
      stackAfterEdit
    );
    unmount2();

    const { unmount: unmount3 } = mountEditor('HELLO', noteId, {
      withViewMemory: true,
    });
    await flushMicrotasks();
    expect(getNoteHistoryStateForTesting(noteId)?.undoStack.length).toBe(
      stackAfterEdit
    );
    unmount3();

    const { unmount: unmount4 } = mountEditor('HELLO', noteId);
    await flushMicrotasks();
    expect(getNoteHistoryStateForTesting(noteId)?.undoStack.length).toBe(
      stackAfterEdit
    );
    unmount4();
  });

  it('does not grow the undo stack when reopening through LexicalExtensionComposer', async () => {
    const noteId = 'note-a';
    const markdown = '# title\n\nhello\n\nworld';

    const { editor, unmount: unmountEditor } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor, 'HELLO');
    await flushMicrotasks();
    const stackAfterEdit =
      getNoteHistoryStateForTesting(noteId)?.undoStack.length ?? 0;
    unmountEditor();

    setNoteViewState(noteId, {
      scrollTop: 0,
      structuredSelection: {
        anchor: { rootIndex: 0, path: [0], textOffset: 3 },
        focus: { rootIndex: 0, path: [0], textOffset: 3 },
        direction: 'LTR',
      },
      localMarkdown: 'HELLO',
      localTexts: { anchor: 'HELLO', focus: 'HELLO' },
    });

    const { unmount: unmountComposer } = render(
      <NoteEditorHarness markdown="HELLO" noteId={noteId} />
    );
    await flushMicrotasks();

    expect(getNoteHistoryStateForTesting(noteId)?.undoStack.length).toBe(
      stackAfterEdit
    );

    unmountComposer();
  });

  it('reflects preserved undo availability in the toolbar after remount', async () => {
    const noteId = 'note-a';

    const { editor: editor1, unmount: unmount1 } = mountEditor('hello', noteId);
    await flushMicrotasks();
    replaceFirstParagraphText(editor1, 'HELLO');
    await flushMicrotasks();
    unmount1();

    const { editor: editor2, unmount: unmount2 } = mountEditor('HELLO', noteId);
    await flushMicrotasks();

    let toolbarUndo = false;
    const unsubscribe = subscribeToolbarUndoRedo(editor2, ({ canUndo }) => {
      toolbarUndo = canUndo;
    });

    expect(toolbarUndo).toBe(true);
    unsubscribe();
    unmount2();
  });
});
