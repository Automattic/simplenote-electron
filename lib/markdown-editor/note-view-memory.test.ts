import { buildEditorFromExtensions } from '@lexical/extension';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
} from 'lexical';

import { createMarkdownEditorExtension } from './extensions';
import {
  getRestoreScrollTop,
  saveNoteScrollTop,
  saveNoteViewStateForEditor,
} from './note-view-memory';
import {
  setNoteViewState,
  getNoteViewState,
} from '../utils/note-scroll-position';
import { $captureStructuredSelection } from './selection-memory';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

function selectTextContent(
  editor: ReturnType<typeof buildEditorFromExtensions>,
  text: string,
  offset: number
): void {
  editor.update(
    () => {
      const walk = (node: LexicalNode): boolean => {
        if ($isTextNode(node) && node.getTextContent() === text) {
          node.select(offset, offset);
          return true;
        }
        if ($isElementNode(node)) {
          for (const child of node.getChildren()) {
            if (walk(child)) {
              return true;
            }
          }
        }
        return false;
      };

      for (const child of $getRoot().getChildren()) {
        if (walk(child)) {
          return;
        }
      }

      throw new Error(`Expected text node ${JSON.stringify(text)}`);
    },
    { discrete: true }
  );
}

function selectParagraphText(
  editor: ReturnType<typeof buildEditorFromExtensions>,
  text: string,
  offset: number
): void {
  editor.update(
    () => {
      for (const child of $getRoot().getChildren()) {
        if (!$isParagraphNode(child)) {
          continue;
        }
        const textNode = child.getFirstChild();
        if ($isTextNode(textNode) && textNode.getTextContent() === text) {
          textNode.select(offset, offset);
          return;
        }
      }
      throw new Error(`Expected paragraph with text ${JSON.stringify(text)}`);
    },
    { discrete: true }
  );
}

describe('note view memory', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('caret restore on remount', () => {
    it('restores a saved collapsed caret at the same structured position', async () => {
      const markdown = '# title\n\nhello\n\nworld';
      const noteId = 'note-1';

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();
      selectParagraphText(editor1, 'hello', 3);

      const saved = editor1.read(() => $captureStructuredSelection());
      saveNoteViewStateForEditor(editor1, noteId, 100);
      editor1.dispose();

      const editor2 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
      });
      editor2.dispose();
    });

    it('restores a non-collapsed selection with direction', async () => {
      const markdown = 'alpha\n\nbeta';
      const noteId = 'note-1';

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor1.update(
        () => {
          for (const child of $getRoot().getChildren()) {
            if (!$isParagraphNode(child)) {
              continue;
            }
            const textNode = child.getFirstChild();
            if ($isTextNode(textNode) && textNode.getTextContent() === 'beta') {
              textNode.select(0, 4);
              return;
            }
          }
        },
        { discrete: true }
      );

      const saved = editor1.read(() => $captureStructuredSelection());
      saveNoteViewStateForEditor(editor1, noteId, 0);
      editor1.dispose();

      const editor2 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor2.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        expect($captureStructuredSelection()).toEqual(saved);
      });
      editor2.dispose();
    });

    it('restores checklist item caret after a note switch', async () => {
      const markdown = [
        '# Note',
        '',
        '- [ ] Open task',
        '- [x] Done task',
      ].join('\n');
      const noteId = 'note-1';

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      selectTextContent(editor1, 'Open task', 2);

      const saved = editor1.read(() => $captureStructuredSelection());
      saveNoteViewStateForEditor(editor1, noteId, 0);
      editor1.dispose();

      const editor2 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
      });
      editor2.dispose();
    });

    it('falls back to document start when there is no saved selection', async () => {
      const markdown = '# title\n\nhello';
      const noteId = 'note-1';

      const editor = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }

        expect(selection.isCollapsed()).toBe(true);
        expect(selection.anchor.offset).toBe(0);
        expect(
          selection.anchor
            .getNode()
            .getTopLevelElementOrThrow()
            .is($getRoot().getFirstChild())
        ).toBe(true);
      });
      editor.dispose();
    });

    it('falls back to document start when saved structured selection is invalid', async () => {
      const noteId = 'note-1';

      setNoteViewState(noteId, {
        scrollTop: 200,
        structuredSelection: {
          anchor: { rootIndex: 99, path: [], textOffset: 0 },
          focus: { rootIndex: 99, path: [], textOffset: 0 },
          direction: 'LTR',
        },
        localMarkdown: '# title\n\nhello',
      });

      const editor = buildEditorFromExtensions(
        createMarkdownEditorExtension('# title\n\nhello', undefined, { noteId })
      );
      await flushMicrotasks();

      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }

        expect(selection.isCollapsed()).toBe(true);
        expect(selection.anchor.offset).toBe(0);
      });
      editor.dispose();
    });
  });

  describe('createNoteViewMemoryExtension', () => {
    it('writes sessionStorage when the editor is disposed', async () => {
      const markdown = '# title\n\nhello';
      const noteId = 'note-1';
      const scrollTop = 120;

      const editor = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, {
          getScrollTop: () => scrollTop,
          noteId,
        })
      );
      await flushMicrotasks();

      selectParagraphText(editor, 'hello', 2);
      const savedSelection = editor.read(() => $captureStructuredSelection());
      editor.dispose();

      expect(getNoteViewState(noteId)).toMatchObject({
        scrollTop: 120,
        structuredSelection: savedSelection,
        localMarkdown: markdown,
      });
    });
  });

  describe('saveNoteViewStateForEditor', () => {
    it('persists scroll and structured selection via editor.read', async () => {
      const markdown = '# title\n\nhello\n\nworld';
      const noteId = 'note-1';

      const editor = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();
      selectParagraphText(editor, 'hello', 3);

      saveNoteViewStateForEditor(editor, noteId, 240);

      expect(getNoteViewState(noteId)).toMatchObject({
        scrollTop: 240,
        structuredSelection: editor.read(() => $captureStructuredSelection()),
        localMarkdown: markdown,
      });
      editor.dispose();
    });
  });

  describe('saveNoteScrollTop', () => {
    it('updates scrollTop without dropping a saved selection', () => {
      setNoteViewState('note-1', {
        scrollTop: 100,
        structuredSelection: {
          anchor: { rootIndex: 0, path: [], textOffset: 2 },
          focus: { rootIndex: 0, path: [], textOffset: 2 },
          direction: 'LTR',
        },
        localMarkdown: 'hello',
      });

      saveNoteScrollTop('note-1', 240);

      expect(getNoteViewState('note-1')).toEqual({
        scrollTop: 240,
        structuredSelection: {
          anchor: { rootIndex: 0, path: [], textOffset: 2 },
          focus: { rootIndex: 0, path: [], textOffset: 2 },
          direction: 'LTR',
        },
        localMarkdown: 'hello',
      });
    });
  });

  describe('getRestoreScrollTop', () => {
    it('returns saved scrollTop', () => {
      expect(getRestoreScrollTop({ scrollTop: 240 })).toBe(240);
    });

    it('returns zero for a missing snapshot', () => {
      expect(getRestoreScrollTop(null)).toBe(0);
    });
  });

  describe('saved view state round trip', () => {
    it('persists structuredSelection for later reads', () => {
      setNoteViewState('note-1', {
        scrollTop: 50,
        structuredSelection: {
          anchor: { rootIndex: 1, path: [], textOffset: 1 },
          focus: { rootIndex: 1, path: [], textOffset: 3 },
          direction: 'LTR',
        },
        localMarkdown: 'alpha\n\nbeta',
      });

      expect(getNoteViewState('note-1')).toEqual({
        scrollTop: 50,
        structuredSelection: {
          anchor: { rootIndex: 1, path: [], textOffset: 1 },
          focus: { rootIndex: 1, path: [], textOffset: 3 },
          direction: 'LTR',
        },
        localMarkdown: 'alpha\n\nbeta',
      });
    });
  });
});
