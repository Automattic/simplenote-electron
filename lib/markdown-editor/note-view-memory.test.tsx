import { buildEditorFromExtensions } from '@lexical/extension';
import React, { useMemo, useRef } from 'react';
import { render } from '@testing-library/react';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  KEY_ARROW_UP_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
} from 'lexical';

import { createMarkdownEditorExtension } from './extensions';
import { dispatchArrow, selectTextNode } from './block-cursor-test-helpers';
import {
  getRestoreScrollTop,
  saveNoteScrollTop,
  saveNoteViewStateForEditor,
  useNoteViewMemory,
} from './note-view-memory';
import {
  setNoteViewState,
  getNoteViewState,
  getNotePosition,
} from '../utils/note-scroll-position';
import { restoreScrollPosition } from './scroll-memory';
import { $captureStructuredSelection } from './selection-memory';
import { $isTransientParagraphNode } from './transient-paragraph-node';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mountNoteViewMemoryEditor(
  markdown: string,
  noteId: string,
  options?: {
    getScrollTop?: () => number;
    shell?: HTMLDivElement;
  }
): {
  editor: LexicalEditorWithDispose;
  shell: HTMLDivElement;
  unmount: () => void;
} {
  const shell = options?.shell ?? document.createElement('div');
  if (!options?.shell) {
    shell.className = 'lexical-md-editor-shell';
    const input = document.createElement('div');
    input.className = 'lexical-md-editor__input';
    input.contentEditable = 'true';
    shell.appendChild(input);
    document.body.appendChild(shell);
  }

  const input = shell.querySelector('.lexical-md-editor__input');
  if (!(input instanceof HTMLDivElement)) {
    throw new Error('Expected a lexical input element inside the scroll shell');
  }

  const editor = buildEditorFromExtensions(
    createMarkdownEditorExtension(markdown, undefined, {
      getScrollContainer: () => shell,
      getScrollTop: options?.getScrollTop ?? (() => shell.scrollTop),
      noteId,
    })
  );

  editor.setRootElement(input);

  return {
    editor,
    shell,
    unmount: () => {
      editor.setRootElement(null);
      if (!options?.shell) {
        shell.remove();
      }
      editor.dispose();
    },
  };
}

function createScrollableShell(maxScrollTop = 1000): HTMLDivElement {
  const shell = document.createElement('div');
  shell.className = 'lexical-md-editor-shell';
  let scrollTop = 0;

  Object.defineProperty(shell, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.max(0, Math.min(value, maxScrollTop));
    },
  });
  Object.defineProperty(shell, 'scrollHeight', {
    configurable: true,
    get: () => maxScrollTop + 100,
  });
  Object.defineProperty(shell, 'clientHeight', {
    configurable: true,
    get: () => 100,
  });

  const input = document.createElement('div');
  input.className = 'lexical-md-editor__input';
  input.contentEditable = 'true';
  shell.appendChild(input);
  document.body.appendChild(shell);

  return shell;
}

function applyScrollRestore(shell: HTMLDivElement, noteId: string): () => void {
  const saved = getNoteViewState(noteId);
  const scrollTop = getRestoreScrollTop(saved) || getNotePosition(noteId) || 0;
  return restoreScrollPosition(shell, scrollTop);
}

function NoteEditorHarness({
  markdown,
  noteId,
}: {
  markdown: string;
  noteId: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  useNoteViewMemory({ shellRef, noteId });

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

function selectTextContent(
  editor: LexicalEditorWithDispose,
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
  editor: LexicalEditorWithDispose,
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

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
      });
      unmount();
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

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId
      );
      await flushMicrotasks();

      editor2.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        expect($captureStructuredSelection()).toEqual(saved);
      });
      unmount();
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

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
      });
      unmount();
    });

    it('restores a caret in the transient gap between adjacent code blocks', async () => {
      const markdown = '```\nfirst\n```\n```\nsecond\n```';
      const noteId = 'note-code-gap';

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();
      selectTextNode(editor1, 'second', 0);
      await dispatchArrow(editor1, KEY_ARROW_UP_COMMAND);

      const saved = editor1.read(() => $captureStructuredSelection());
      expect(saved?.anchor.transientGapAfterRootIndex).toBe(0);
      saveNoteViewStateForEditor(editor1, noteId, 50);
      editor1.dispose();

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }

        const anchorNode = selection.anchor.getNode();
        const transient =
          $isTransientParagraphNode(anchorNode) ||
          $isTransientParagraphNode(anchorNode.getParent())
            ? $isTransientParagraphNode(anchorNode)
              ? anchorNode
              : anchorNode.getParent()
            : null;
        expect(transient).not.toBeNull();
      });
      unmount();
    });

    it('restores a caret in an empty paragraph between code blocks', async () => {
      const markdown = '```\nfirst\n```\n\n```\nsecond\n```';
      const noteId = 'note-empty-para';

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();

      editor1.update(
        () => {
          for (const child of $getRoot().getChildren()) {
            if (
              $isElementNode(child) &&
              child.getType() === 'paragraph' &&
              !$isTransientParagraphNode(child) &&
              child.getChildrenSize() === 0
            ) {
              child.selectStart();
              return;
            }
          }
          throw new Error('Expected empty paragraph between code blocks');
        },
        { discrete: true }
      );

      const saved = editor1.read(() => $captureStructuredSelection());
      expect(saved?.anchor.transientGapAfterRootIndex).toBeUndefined();
      saveNoteViewStateForEditor(editor1, noteId, 75);
      editor1.dispose();

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId
      );
      await flushMicrotasks();

      editor2.read(() => {
        expect($captureStructuredSelection()).toEqual(saved);
      });
      unmount();
    });

    it('restores saved scroll without scrolling the caret into view', async () => {
      const markdown = '# title\n\nhello\n\nworld';
      const noteId = 'note-scroll';
      const savedScrollTop = 300;
      const shell = createScrollableShell();

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();
      selectParagraphText(editor1, 'world', 2);
      saveNoteViewStateForEditor(editor1, noteId, savedScrollTop);
      editor1.dispose();

      const { editor: editor2, unmount } = mountNoteViewMemoryEditor(
        markdown,
        noteId,
        { shell }
      );
      await flushMicrotasks();
      applyScrollRestore(shell, noteId);
      await flushMicrotasks();
      editor2.getRootElement()?.focus();

      expect(shell.scrollTop).toBe(savedScrollTop);
      editor2.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }

        expect(selection.anchor.getNode().getTextContent()).toBe('world');
      });
      unmount();
    });

    it('restores scroll and caret through the production React wiring', async () => {
      const markdown = '# title\n\nhello\n\nworld';
      const noteId = 'note-prod';
      const savedScrollTop = 420;

      const editor1 = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, { noteId })
      );
      await flushMicrotasks();
      selectParagraphText(editor1, 'world', 2);
      saveNoteViewStateForEditor(editor1, noteId, savedScrollTop);
      editor1.dispose();

      const scrollTops = new WeakMap<Element, number>();
      const maxScrollTop = 1000;
      const clientHeight = 100;
      const scrollProps: PropertyDescriptorMap = {
        scrollTop: {
          configurable: true,
          get(this: Element) {
            return scrollTops.get(this) ?? 0;
          },
          set(this: Element, value: number) {
            scrollTops.set(
              this,
              Math.round(Math.max(0, Math.min(value, maxScrollTop)))
            );
          },
        },
        scrollHeight: {
          configurable: true,
          get() {
            return maxScrollTop + clientHeight;
          },
        },
        clientHeight: {
          configurable: true,
          get() {
            return clientHeight;
          },
        },
      };
      const originals = Object.fromEntries(
        Object.keys(scrollProps).map((property) => [
          property,
          Object.getOwnPropertyDescriptor(Element.prototype, property),
        ])
      );
      Object.defineProperties(Element.prototype, scrollProps);

      try {
        const { container, unmount } = render(
          <NoteEditorHarness markdown={markdown} noteId={noteId} />
        );
        await flushMicrotasks();

        const shell = container.querySelector('.lexical-md-editor-shell');
        if (!(shell instanceof HTMLDivElement)) {
          throw new Error('Expected markdown scroll shell');
        }

        shell.querySelector('.lexical-md-editor__input')?.focus();
        await flushMicrotasks();

        expect(shell.scrollTop).toBe(savedScrollTop);

        const input = container.querySelector('.lexical-md-editor__input');
        if (!(input instanceof HTMLDivElement)) {
          throw new Error('Expected markdown input');
        }
        input.focus();
        await flushMicrotasks();

        expect(shell.scrollTop).toBe(savedScrollTop);
        unmount();
      } finally {
        for (const [property, descriptor] of Object.entries(originals)) {
          if (descriptor) {
            Object.defineProperty(Element.prototype, property, descriptor);
          }
        }
      }
    });

    it('falls back to document start when there is no saved selection', async () => {
      const markdown = '# title\n\nhello';
      const noteId = 'note-1';

      const { editor, unmount } = mountNoteViewMemoryEditor(markdown, noteId);
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
      unmount();
    });

    it('falls back to document start when saved structured selection is invalid', async () => {
      const noteId = 'note-1';
      const markdown = '# title\n\nhello';

      setNoteViewState(noteId, {
        scrollTop: 200,
        structuredSelection: {
          anchor: { rootIndex: 99, path: [], textOffset: 0 },
          focus: { rootIndex: 99, path: [], textOffset: 0 },
          direction: 'LTR',
        },
        localMarkdown: markdown,
      });

      const { editor, unmount } = mountNoteViewMemoryEditor(markdown, noteId);
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
      unmount();
    });
  });

  describe('createNoteViewMemoryExtension', () => {
    it('writes sessionStorage when the editor is disposed', async () => {
      const markdown = '# title\n\nhello';
      const noteId = 'note-1';
      const scrollTop = 120;
      const shell = document.createElement('div');
      shell.className = 'lexical-md-editor-shell';
      const input = document.createElement('div');
      input.className = 'lexical-md-editor__input';
      input.contentEditable = 'true';
      shell.appendChild(input);
      document.body.appendChild(shell);

      const editor = buildEditorFromExtensions(
        createMarkdownEditorExtension(markdown, undefined, {
          getScrollContainer: () => shell,
          getScrollTop: () => scrollTop,
          noteId,
        })
      );
      editor.setRootElement(input);
      await flushMicrotasks();

      selectParagraphText(editor, 'hello', 2);
      const savedSelection = editor.read(() => $captureStructuredSelection());
      editor.dispose();
      shell.remove();

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
