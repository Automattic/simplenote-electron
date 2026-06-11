import { buildEditorFromExtensions } from '@lexical/extension';
import { $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, type LexicalEditorWithDispose } from 'lexical';

import {
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';
import {
  $insertInternalLink,
  findLinkableNotes,
  getLinkCompletionMatch,
  noteIdFromUrl,
  registerInternalLinkClick,
} from './internal-link';
import { searchNotes } from '../search';

import type * as T from '../types';

jest.mock('../search', () => ({
  ...jest.requireActual('../search'),
  searchNotes: jest.fn(() => []),
}));

const mockSearchNotes = searchNotes as jest.Mock;

const makeNote = (content: string, systemTags: T.SystemTag[] = []): T.Note => ({
  content,
  creationDate: 0,
  deleted: false,
  modificationDate: 0,
  systemTags,
  tags: [],
});

beforeEach(() => {
  mockSearchNotes.mockReset().mockReturnValue([]);
});

describe('getLinkCompletionMatch', () => {
  it('does not match an unclosed bracket like "[gro"', () => {
    expect(getLinkCompletionMatch('see [gro')).toBeNull();
    expect(getLinkCompletionMatch('[')).toBeNull();
  });

  it('matches with an empty query when "(" is reached in "[See also]("', () => {
    expect(getLinkCompletionMatch('[See also](')).toEqual({
      query: '',
      length: '[See also]('.length,
      linkText: 'See also',
    });
  });

  it('uses only the text typed after the paren as query', () => {
    expect(getLinkCompletionMatch('[See also](gro')).toEqual({
      query: 'gro',
      length: '[See also](gro'.length,
      linkText: 'See also',
    });
  });

  it('returns null when no bracket was opened', () => {
    expect(getLinkCompletionMatch('plain text')).toBeNull();
  });

  it('returns null after the bracket is closed', () => {
    expect(getLinkCompletionMatch('[done] and more')).toBeNull();
  });

  it('returns null for a completed link', () => {
    expect(getLinkCompletionMatch('[done](simplenote://note/x)')).toBeNull();
  });

  it('returns null when a real URL is being typed', () => {
    expect(getLinkCompletionMatch('[site](https://exa')).toBeNull();
  });

  it('returns null for image syntax', () => {
    expect(getLinkCompletionMatch('![alt](')).toBeNull();
  });
});

describe('noteIdFromUrl', () => {
  it('extracts the note id from an internal link', () => {
    expect(noteIdFromUrl('simplenote://note/abc-123')).toBe('abc-123');
  });

  it('returns null for other URLs', () => {
    expect(noteIdFromUrl('https://example.com')).toBeNull();
    expect(noteIdFromUrl('simplenote://note/abc/extra')).toBeNull();
    expect(noteIdFromUrl('#heading')).toBeNull();
  });
});

describe('findLinkableNotes', () => {
  it('searches titles only, excluding the current note', () => {
    findLinkableNotes('gro', 'current-note' as T.EntityId);

    expect(mockSearchNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeIDs: ['current-note'],
        searchTerms: ['gro'],
        titleOnly: true,
      }),
      5
    );
  });

  it('maps results to noteId, title, and pinned state', () => {
    mockSearchNotes.mockReturnValue([
      ['note-1', makeNote('Grocery List\nmilk', ['pinned'])],
      ['note-2', makeNote('Groundhog Day')],
      ['note-3', undefined],
    ]);

    expect(findLinkableNotes('gro', null)).toEqual([
      { noteId: 'note-1', title: 'Grocery List', isPinned: true },
      { noteId: 'note-2', title: 'Groundhog Day', isPinned: false },
    ]);
  });
});

describe('$insertInternalLink', () => {
  function makeEditor(markdown: string): LexicalEditorWithDispose {
    return buildEditorFromExtensions(createMarkdownEditorExtension(markdown));
  }

  function insertAtEnd(
    editor: LexicalEditorWithDispose,
    note: { noteId: T.EntityId; title: string }
  ): string {
    editor.update(
      () => {
        $getRoot().selectEnd();
        $insertInternalLink(note);
      },
      { discrete: true }
    );
    return editor
      .getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
  }

  const note = { noteId: 'note-1' as T.EntityId, title: 'Grocery List' };

  it('does nothing for an unclosed bracket', () => {
    const editor = makeEditor('see [gro');
    expect(insertAtEnd(editor, note)).toBe('see [gro');
    editor.dispose();
  });

  it('keeps the typed link text', () => {
    const editor = makeEditor('[See also](');
    expect(insertAtEnd(editor, note)).toBe(
      '[See also](simplenote://note/note-1)'
    );
    editor.dispose();
  });

  it('replaces a partial query typed after the paren', () => {
    const editor = makeEditor('[See also](gro');
    expect(insertAtEnd(editor, note)).toBe(
      '[See also](simplenote://note/note-1)'
    );
    editor.dispose();
  });

  it('does nothing without a completion match', () => {
    const editor = makeEditor('plain text');
    expect(insertAtEnd(editor, note)).toBe('plain text');
    editor.dispose();
  });
});

describe('registerInternalLinkClick', () => {
  function mountEditor(markdown: string) {
    const editor = buildEditorFromExtensions(
      createMarkdownEditorExtension(markdown)
    );
    const root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.appendChild(root);
    editor.setRootElement(root);
    return { editor, root };
  }

  function click(element: Element): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
  }

  it('reports the linked note id when an internal link is clicked', () => {
    const { editor, root } = mountEditor(
      '[Note](simplenote://note/target-1) and text'
    );
    const onOpenNote = jest.fn();
    registerInternalLinkClick(editor, onOpenNote);

    const anchor = root.querySelector('a');
    expect(anchor).not.toBeNull();
    const event = click(anchor!);

    expect(onOpenNote).toHaveBeenCalledWith('target-1');
    expect(event.defaultPrevented).toBe(true);
    editor.dispose();
    root.remove();
  });

  it('ignores external links', () => {
    const { editor, root } = mountEditor('[site](https://example.com)');
    const onOpenNote = jest.fn();
    registerInternalLinkClick(editor, onOpenNote);

    click(root.querySelector('a')!);

    expect(onOpenNote).not.toHaveBeenCalled();
    editor.dispose();
    root.remove();
  });

  it('ignores clicks on plain text', () => {
    const { editor, root } = mountEditor('plain text');
    const onOpenNote = jest.fn();
    registerInternalLinkClick(editor, onOpenNote);

    click(root.querySelector('p') ?? root);

    expect(onOpenNote).not.toHaveBeenCalled();
    editor.dispose();
    root.remove();
  });

  it('stops listening after cleanup', () => {
    const { editor, root } = mountEditor('[Note](simplenote://note/target-1)');
    const onOpenNote = jest.fn();
    const unregister = registerInternalLinkClick(editor, onOpenNote);
    unregister();

    click(root.querySelector('a')!);

    expect(onOpenNote).not.toHaveBeenCalled();
    editor.dispose();
    root.remove();
  });
});
