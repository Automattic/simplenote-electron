import React from 'react';
import { render } from '@testing-library/react';

import { NoteCell } from './note-cell';
import { getSyncErrorMessage } from '../utils/sync-error-message';
import type * as T from '../types';

const noteId = 'note-1' as T.EntityId;

const minimalNote: T.Note = {
  content: 'Hello world',
  creationDate: 0,
  deleted: false,
  modificationDate: 0,
  systemTags: [],
  tags: [],
};

const baseProps = {
  displayMode: 'comfy' as T.ListDisplayMode,
  invalidateHeight: jest.fn(),
  isOffline: false,
  isOpened: false,
  lastUpdated: -Infinity,
  note: minimalNote,
  noteId,
  openNote: jest.fn(),
  pinNote: jest.fn(),
  searchQuery: '',
  showSyncSpinner: false,
  style: {},
  syncErrorCode: null as number | null,
};

describe('NoteCell status icons', () => {
  describe('sync error', () => {
    it('does not render a sync error icon when syncErrorCode is null', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Sync failed' })).toBeNull();
    });

    it('renders a sync error icon with tooltip when syncErrorCode is set', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} syncErrorCode={413} />
      );

      expect(
        getByRole('img', {
          name: 'Sync failed',
          description: getSyncErrorMessage(413),
        })
      ).not.toBeNull();
    });

    it('shows both pending and sync error icons during a retry', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} showSyncSpinner syncErrorCode={413} />
      );

      expect(getByRole('img', { name: 'Pending changes' })).not.toBeNull();
      expect(getByRole('img', { name: 'Sync failed' })).not.toBeNull();
    });

    it('shows only the sync error icon after a failed sync', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell {...baseProps} syncErrorCode={413} />
      );

      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
      expect(getByRole('img', { name: 'Sync failed' })).not.toBeNull();
    });
  });

  describe('pending changes', () => {
    it('does not render a pending changes icon when showSyncSpinner is false', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
    });

    it('renders a pending changes icon when showSyncSpinner is true', () => {
      const { getByRole } = render(<NoteCell {...baseProps} showSyncSpinner />);

      expect(getByRole('img', { name: 'Pending changes' })).not.toBeNull();
    });

    it('marks pending changes as offline when isOffline is true', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} showSyncSpinner isOffline />
      );

      expect(
        getByRole('img', { name: 'Pending changes while offline' })
      ).not.toBeNull();
    });
  });

  describe('published', () => {
    it('does not render a published icon when the note is not published', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Published note' })).toBeNull();
    });

    it('renders a published icon when publishURL is set', () => {
      const { getByRole } = render(
        <NoteCell
          {...baseProps}
          note={{
            ...minimalNote,
            publishURL: 'https://publish.simplenote.com/abc',
          }}
        />
      );

      expect(getByRole('img', { name: 'Published note' })).not.toBeNull();
    });
  });
});
