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

const expectSpinning = (icon: HTMLElement, spinning: boolean) => {
  expect(icon.classList.contains('is-syncing')).toBe(spinning);
};

const expectOfflineStyle = (icon: HTMLElement, offline: boolean) => {
  expect(icon.classList.contains('is-offline')).toBe(offline);
};

const expectErrorStyle = (icon: HTMLElement, errored: boolean) => {
  expect(icon.classList.contains('has-sync-error')).toBe(errored);
};

describe('NoteCell status icons', () => {
  describe('pending sync icon appearance', () => {
    it('spinning spinner shows when pending changes regardless of syncing state', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges />
      );
      const icon = getByRole('img', { name: 'Pending changes' });

      expectSpinning(icon, true);
      expectOfflineStyle(icon, false);
      expectErrorStyle(icon, false);
    });

    it('non-spinning spinner shows when pending changes and offline', () => {
      const { getByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges isOffline />
      );
      const icon = getByRole('img', {
        name: 'Pending changes (waiting for network connection)',
      });

      expectSpinning(icon, false);
      expectOfflineStyle(icon, true);
      expectErrorStyle(icon, false);
    });

    it('non-spinning spinner shows when we have a sync error and we are not actively syncing', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell {...baseProps} hasPendingChanges syncErrorCode={413} />
      );
      const icon = getByRole('img', {
        name: 'Sync failed',
        description: getSyncErrorMessage(413),
      });

      expectSpinning(icon, false);
      expectErrorStyle(icon, true);
      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
    });

    it('spinning spinner shows when we are actively syncing and have a sync error', () => {
      const { getByRole, queryByRole } = render(
        <NoteCell
          {...baseProps}
          hasPendingChanges
          isSyncing
          syncErrorCode={413}
        />
      );
      const icon = getByRole('img', { name: 'Pending changes' });

      expectSpinning(icon, true);
      expectErrorStyle(icon, false);
      expect(queryByRole('img', { name: 'Sync failed' })).toBeNull();
    });
  });

  describe('when the note is not pending', () => {
    it('does not render a sync icon', () => {
      const { queryByRole } = render(<NoteCell {...baseProps} />);

      expect(queryByRole('img', { name: 'Sync failed' })).toBeNull();
      expect(queryByRole('img', { name: 'Pending changes' })).toBeNull();
    });

    it('still renders a sync error icon when syncErrorCode is set', () => {
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
