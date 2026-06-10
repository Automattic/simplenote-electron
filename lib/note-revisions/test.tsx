import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { NoteRevisions } from './';

jest.mock('../revision-selector', () => {
  const ReactForMock = require('react');

  return function MockRevisionSelector() {
    return ReactForMock.createElement('div', {
      'data-testid': 'revision-selector',
    });
  };
});

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

    return {
      cancelRevision,
      ...render(
        <NoteRevisions
          cancelRevision={cancelRevision}
          markdownEnabled={true}
          note={note}
          noteId={'note-id'}
          tags={[]}
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
});
