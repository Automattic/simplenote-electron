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
      const { container } = render(<NoteCell {...baseProps} />);

      expect(container.querySelector('.note-list-item-sync-error')).toBeNull();
    });

    it('renders a sync error icon with tooltip when syncErrorCode is set', () => {
      const { container } = render(
        <NoteCell {...baseProps} syncErrorCode={413} />
      );

      const syncError = container.querySelector('.note-list-item-sync-error');
      expect(syncError).not.toBeNull();
      expect(syncError?.getAttribute('title')).toBe(getSyncErrorMessage(413));
    });

    it('shows both pending and sync error icons during a retry', () => {
      const { container } = render(
        <NoteCell {...baseProps} showSyncSpinner syncErrorCode={413} />
      );

      expect(
        container.querySelector('.note-list-item-pending-changes')
      ).not.toBeNull();
      expect(
        container.querySelector('.note-list-item-sync-error')
      ).not.toBeNull();
    });

    it('shows only the sync error icon after a failed sync', () => {
      const { container } = render(
        <NoteCell {...baseProps} syncErrorCode={413} />
      );

      expect(
        container.querySelector('.note-list-item-pending-changes')
      ).toBeNull();
      expect(
        container.querySelector('.note-list-item-sync-error')
      ).not.toBeNull();
    });
  });

  describe('pending changes', () => {
    it('does not render a pending changes icon when showSyncSpinner is false', () => {
      const { container } = render(<NoteCell {...baseProps} />);

      expect(
        container.querySelector('.note-list-item-pending-changes')
      ).toBeNull();
    });

    it('renders a pending changes icon when showSyncSpinner is true', () => {
      const { container } = render(<NoteCell {...baseProps} showSyncSpinner />);

      expect(
        container.querySelector('.note-list-item-pending-changes')
      ).not.toBeNull();
    });

    it('marks pending changes as offline when isOffline is true', () => {
      const { container } = render(
        <NoteCell {...baseProps} showSyncSpinner isOffline />
      );

      expect(
        container
          .querySelector('.note-list-item-pending-changes')
          ?.classList.contains('is-offline')
      ).toBe(true);
    });
  });

  describe('published', () => {
    it('does not render a published icon when the note is not published', () => {
      const { container } = render(<NoteCell {...baseProps} />);

      expect(
        container.querySelector('.note-list-item-published-icon')
      ).toBeNull();
      expect(container.querySelector('.published-note')).toBeNull();
    });

    it('renders a published icon and row class when publishURL is set', () => {
      const { container } = render(
        <NoteCell
          {...baseProps}
          note={{
            ...minimalNote,
            publishURL: 'https://publish.simplenote.com/abc',
          }}
        />
      );

      expect(
        container.querySelector('.note-list-item-published-icon')
      ).not.toBeNull();
      expect(
        container
          .querySelector('.note-list-item')
          ?.classList.contains('published-note')
      ).toBe(true);
    });
  });
});
