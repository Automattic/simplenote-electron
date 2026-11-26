import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { NotePreview } from './';
import { copyCodeButtonClassName } from './code-copy-buttons';

import * as T from '../../types';

jest.mock('../../note-detail/render-to-node', () => ({
  __esModule: true,
  default: jest.fn((node: HTMLElement) => {
    node.innerHTML =
      '<p>Run <code>npm test</code> first.</p><pre><code class="language-sh">npm ci\nnpm test</code></pre>';
    return Promise.resolve();
  }),
}));

describe('NotePreview', () => {
  const noteId = 'note-id' as T.EntityId;
  const note = {
    content: 'Run `npm test` first.\n\n```sh\nnpm ci\nnpm test\n```',
    creationDate: 1,
    deleted: false,
    modificationDate: 2,
    systemTags: ['markdown'],
    tags: [],
  } as T.Note;

  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    delete (navigator as { clipboard?: Clipboard }).clipboard;
  });

  const renderNotePreview = (
    props: Partial<React.ComponentProps<typeof NotePreview>> = {}
  ) => {
    const editNote = jest.fn();
    const openNote = jest.fn();

    return {
      editNote,
      openNote,
      ...render(
        <NotePreview
          editNote={editNote}
          isFocused={true}
          note={note}
          noteId={noteId}
          notes={new Map([[noteId, note]])}
          openNote={openNote}
          searchQuery=""
          showRenderedView={true}
          {...props}
        />
      ),
    };
  };

  it('copies a rendered code block with its copy button', async () => {
    const { editNote, getByLabelText, getByRole, openNote } =
      renderNotePreview();

    const button = await waitFor(() =>
      getByRole('button', { name: 'Copy code to clipboard' })
    );

    expect(
      getByLabelText('Note preview').querySelectorAll(
        `.${copyCodeButtonClassName}`
      )
    ).toHaveLength(1);

    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith('npm ci\nnpm test');
    await waitFor(() => expect(button.textContent).toBe('Copied!'));
    expect(editNote).not.toHaveBeenCalled();
    expect(openNote).not.toHaveBeenCalled();
  });

  it('does not add copy buttons when showing the plain text note', () => {
    const { getByLabelText } = renderNotePreview({ showRenderedView: false });

    expect(
      getByLabelText('Note preview').querySelector(
        `.${copyCodeButtonClassName}`
      )
    ).toBe(null);
  });
});
