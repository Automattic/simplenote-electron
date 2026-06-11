import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, type LexicalEditor } from 'lexical';

import {
  createMarkdownEditorExtension,
  MARKDOWN_TRANSFORMERS,
} from './extensions';
import { InternalLinkPlugin } from './internal-link-menu';
import { searchNotes } from '../search';

import type * as T from '../types';

jest.mock('../search', () => ({
  ...jest.requireActual('../search'),
  searchNotes: jest.fn(() => []),
}));

const mockSearchNotes = searchNotes as jest.Mock;

const makeNote = (content: string): T.Note => ({
  content,
  creationDate: 0,
  deleted: false,
  modificationDate: 0,
  systemTags: [],
  tags: [],
});

beforeEach(() => {
  mockSearchNotes.mockReset().mockReturnValue([
    ['note-1', makeNote('Grocery List')],
    ['note-2', makeNote('Groundhog Day')],
  ]);
});

function mountEditor(markdown: string, onOpenNote?: (id: T.EntityId) => void) {
  const editorRef = React.createRef<LexicalEditor>();
  const result = render(
    <LexicalExtensionComposer
      contentEditable={<ContentEditable />}
      extension={createMarkdownEditorExtension(markdown)}
    >
      <EditorRefPlugin editorRef={editorRef} />
      <InternalLinkPlugin
        noteId={'current-note' as T.EntityId}
        onOpenNote={onOpenNote}
      />
    </LexicalExtensionComposer>
  );

  const placeCaretAtEnd = () => {
    act(() => {
      editorRef.current!.update(() => $getRoot().selectEnd(), {
        discrete: true,
      });
    });
  };

  const getMarkdown = () =>
    editorRef
      .current!.getEditorState()
      .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));

  const keyDown = (key: string) => {
    fireEvent.keyDown(editorRef.current!.getRootElement()!, { key });
  };

  return { ...result, editorRef, getMarkdown, keyDown, placeCaretAtEnd };
}

describe('InternalLinkPlugin', () => {
  it('shows recent notes when the caret reaches the paren', () => {
    const { placeCaretAtEnd, queryByText } = mountEditor('see [my link](');
    placeCaretAtEnd();

    expect(queryByText('Grocery List')).not.toBeNull();
    expect(queryByText('Groundhog Day')).not.toBeNull();
    expect(mockSearchNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeIDs: ['current-note'],
        searchTerms: [],
      }),
      5
    );
  });

  it('searches with the text typed after the paren, not the link text', () => {
    const { placeCaretAtEnd } = mountEditor('see [my link](gro');
    placeCaretAtEnd();

    expect(mockSearchNotes).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerms: ['gro'] }),
      5
    );
  });

  it('shows no menu for an unclosed bracket', () => {
    const { placeCaretAtEnd, queryByRole } = mountEditor('see [gro');
    placeCaretAtEnd();

    expect(queryByRole('listbox')).toBeNull();
  });

  it('shows no menu when there are no results', () => {
    mockSearchNotes.mockReturnValue([]);
    const { placeCaretAtEnd, queryByRole } = mountEditor('see [gro](');
    placeCaretAtEnd();

    expect(queryByRole('listbox')).toBeNull();
  });

  it('inserts the link when an item is clicked', async () => {
    const { getByText, getMarkdown, placeCaretAtEnd, queryByRole } =
      mountEditor('see [gro](');
    placeCaretAtEnd();

    fireEvent.mouseDown(getByText('Groundhog Day'));
    // Lexical commits non-discrete updates in a microtask.
    await act(async () => {});

    expect(getMarkdown()).toBe('see [gro](simplenote://note/note-2)');
    expect(queryByRole('listbox')).toBeNull();
  });

  it('inserts the highlighted item on Enter', async () => {
    const { getMarkdown, keyDown, placeCaretAtEnd } = mountEditor('see [gro](');
    placeCaretAtEnd();

    keyDown('ArrowDown');
    keyDown('Enter');
    await act(async () => {});

    expect(getMarkdown()).toBe('see [gro](simplenote://note/note-2)');
  });

  it('closes the menu on Escape without modifying the note', () => {
    const { getMarkdown, keyDown, placeCaretAtEnd, queryByRole } =
      mountEditor('see [gro](');
    placeCaretAtEnd();

    keyDown('Escape');

    expect(queryByRole('listbox')).toBeNull();
    expect(getMarkdown()).toBe('see [gro](');
  });

  it('opens internal links through onOpenNote', () => {
    const onOpenNote = jest.fn();
    const { editorRef } = mountEditor(
      '[Note](simplenote://note/target-1)',
      onOpenNote
    );

    const anchor = editorRef
      .current!.getRootElement()!
      .querySelector('a') as HTMLAnchorElement;
    fireEvent.click(anchor);

    expect(onOpenNote).toHaveBeenCalledWith('target-1');
  });
});
