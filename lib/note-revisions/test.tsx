import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { NoteRevisions } from './';
import renderToNode from '../note-detail/render-to-node';

jest.mock('../revision-selector', () => {
  const ReactForMock = require('react');

  return function MockRevisionSelector() {
    return ReactForMock.createElement('div', {
      'data-testid': 'revision-selector',
    });
  };
});

jest.mock('../note-detail/render-to-node', () => ({
  __esModule: true,
  default: jest.fn((node: HTMLElement) => {
    node.innerHTML =
      '<h1>Heading</h1><p>Keep <strong>markdown</strong> source.</p><ul><li class="task-list-item"><input type="checkbox">first task</li></ul><p><a href="https://example.com">Example link</a></p>';
    return Promise.resolve();
  }),
}));

describe('NoteRevisions', () => {
  const note = {
    content: '# Heading\n\n\ue000 first task\n\nKeep **markdown** source.',
    creationDate: 1,
    deleted: false,
    modificationDate: 2,
    systemTags: ['markdown'],
    tags: [],
  };

  const renderNoteRevisions = (
    props: Partial<React.ComponentProps<typeof NoteRevisions>> = {}
  ) => {
    const cancelRevision = jest.fn();
    const toggleEditMode = jest.fn();

    return {
      cancelRevision,
      toggleEditMode,
      ...render(
        <NoteRevisions
          cancelRevision={cancelRevision}
          editMode={true}
          keyboardShortcuts={true}
          markdownEnabled={true}
          note={note}
          noteId={'note-id'}
          searchQuery=""
          tags={[]}
          toggleEditMode={toggleEditMode}
          {...props}
        />
      ),
    };
  };

  it('renders revision source as read-only selectable text', () => {
    const { container, getByLabelText, getByTestId } = renderNoteRevisions();

    const source = getByLabelText('Revision source') as HTMLTextAreaElement;

    expect(source.readOnly).toBe(true);
    expect(source.value).toContain('# Heading');
    expect(source.value).toContain('- [ ] first task');
    expect(source.value).not.toContain('\ue000');
    expect(source.value).toContain('Keep **markdown** source.');
    source.focus();
    expect(document.activeElement).toBe(source);
    source.setSelectionRange(11, 27);
    expect(source.value.slice(source.selectionStart, source.selectionEnd)).toBe(
      '- [ ] first task'
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBe(null);
    expect(getByTestId('revision-selector')).toBeTruthy();
  });

  it('keeps History open for source clicks and closes on Escape', () => {
    const { cancelRevision, container, getByLabelText } = renderNoteRevisions();

    const source = getByLabelText('Revision source') as HTMLTextAreaElement;

    fireEvent.click(source);
    expect(cancelRevision).not.toHaveBeenCalled();

    source.focus();
    source.setSelectionRange(0, 9);
    expect(source.value.slice(source.selectionStart, source.selectionEnd)).toBe(
      '# Heading'
    );

    fireEvent.keyDown(container.querySelector('.note-revisions')!, {
      key: 'Escape',
    });

    expect(cancelRevision).toHaveBeenCalledTimes(1);
  });

  it('copies selected revision source without private checkbox glyphs', () => {
    const { getByLabelText } = renderNoteRevisions();
    const source = getByLabelText('Revision source') as HTMLTextAreaElement;
    const clipboardData = {
      clearData: jest.fn(),
      setData: jest.fn(),
    };

    source.focus();
    source.setSelectionRange(11, 27);
    fireEvent.copy(source, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      '- [ ] first task'
    );
  });

  it('uses the existing preview shortcut while History is focused', () => {
    const { container, toggleEditMode } = renderNoteRevisions();

    fireEvent.keyDown(container.querySelector('.note-revisions')!, {
      ctrlKey: true,
      key: 'p',
      shiftKey: true,
    });

    expect(toggleEditMode).toHaveBeenCalledTimes(1);
  });

  it('renders a markdown revision preview when preview mode is active', async () => {
    const { getByLabelText, queryByLabelText } = renderNoteRevisions({
      editMode: false,
    });

    const preview = getByLabelText('Revision preview');

    await waitFor(() => {
      expect(preview.querySelector('h1')?.textContent).toBe('Heading');
    });

    expect(queryByLabelText('Revision source')).toBe(null);
    expect(renderToNode).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      '# Heading\n\n- [ ] first task\n\nKeep **markdown** source.',
      ''
    );
  });

  it('keeps plain-text revisions in source mode even when preview is active', () => {
    const plainTextNote = { ...note, systemTags: [] };
    const { getByLabelText, queryByLabelText } = renderNoteRevisions({
      editMode: false,
      markdownEnabled: false,
      note: plainTextNote,
    });

    expect(getByLabelText('Revision source')).toBeTruthy();
    expect(queryByLabelText('Revision preview')).toBe(null);
  });

  it('switches from revision preview back to selectable source', async () => {
    const { getByLabelText, rerender } = renderNoteRevisions({
      editMode: false,
    });

    await waitFor(() => {
      expect(
        getByLabelText('Revision preview').querySelector('h1')
      ).toBeTruthy();
    });

    rerender(
      <NoteRevisions
        cancelRevision={jest.fn()}
        editMode={true}
        keyboardShortcuts={true}
        markdownEnabled={true}
        note={note}
        noteId={'note-id'}
        searchQuery=""
        tags={[]}
        toggleEditMode={jest.fn()}
      />
    );

    const source = getByLabelText('Revision source') as HTMLTextAreaElement;
    source.setSelectionRange(0, 9);

    expect(source.value.slice(source.selectionStart, source.selectionEnd)).toBe(
      '# Heading'
    );
  });

  it('keeps rendered revision preview controls inert', async () => {
    const { cancelRevision, getByLabelText } = renderNoteRevisions({
      editMode: false,
    });
    const preview = getByLabelText('Revision preview');

    await waitFor(() => {
      expect(preview.querySelector('input')?.disabled).toBe(true);
    });

    const link = preview.querySelector('a')!;
    const checkbox = preview.querySelector('input')!;

    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(checkbox.tabIndex).toBe(-1);

    fireEvent.click(link);
    fireEvent.click(checkbox);

    expect(cancelRevision).not.toHaveBeenCalled();
  });
});
