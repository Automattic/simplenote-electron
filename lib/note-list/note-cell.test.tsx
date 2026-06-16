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
  isSyncing: false,
  lastUpdated: -Infinity,
  note: minimalNote,
  noteId,
  openNote: jest.fn(),
  pinNote: jest.fn(),
  searchQuery: '',
  hasPendingChanges: false,
  style: {},
  syncErrorCode: null as number | null,
};

describe('NoteCell status icons', () => {
  describe('sync error', () => {
    it('does not render a sync error icon when syncErrorCode is null', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Sync failed' })).toBeNull();
    });

    it('renders a red sync icon with tooltip when syncErrorCode is set', () => {
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

    it('shows a static red sync icon after a failed sync that is not retrying', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges syncErrorCode={413} />
      );

      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
      expect(getByRole('img', { name: 'Sync failed' })).not.toBeNull();
    });

    it('shows a spinning sync icon while retrying a failed sync', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell
          {...baseProps}
          hasPendingChanges
          isSyncing
          syncErrorCode={413}
        />
      );
      const pendingChanges = getByRole('img', { name: 'Pending changes' });

      expect(pendingChanges).not.toBeNull();
      expect(queryByRole('img', { name: 'Sync failed' })).toBeNull();
    });

    it('shows a static red sync icon after a failed sync', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell {...baseProps} syncErrorCode={413} />
      );

      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
      expect(getByRole('img', { name: 'Sync failed' })).not.toBeNull();
    });
  });

  describe('pending changes', () => {
    it('does not render a pending changes icon when hasPendingChanges is false', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
    });

    it('renders a pending changes icon when hasPendingChanges is true', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges />
      );
      const pendingChanges = getByRole('img', { name: 'Pending changes' });

      expect(pendingChanges).not.toBeNull();
    });

    it('renders a pending changes icon when isSyncing is true', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges isSyncing />
      );
      const pendingChanges = getByRole('img', { name: 'Pending changes' });

      expect(pendingChanges).not.toBeNull();
    });

    it('marks pending changes as waiting for a connection when isOffline is true', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges isOffline />
      );
      const pendingChanges = getByRole('img', {
        name: 'Pending changes (waiting for network connection)',
      });

      expect(pendingChanges).not.toBeNull();
    });

    it('does not announce syncing while waiting for a connection', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges isOffline isSyncing />
      );

      expect(
        getByRole('img', {
          name: 'Pending changes (waiting for network connection)',
        })
      ).not.toBeNull();
      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
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
