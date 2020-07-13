import { default as createClient } from 'simperium';

import debugFactory from 'debug';
import actions from '../actions';
import { BucketQueue } from './functions/bucket-queue';
import { InMemoryBucket } from './functions/in-memory-bucket';
import { NoteBucket } from './functions/note-bucket';
import { NoteDoctor } from './functions/note-doctor';
import { ReduxGhost } from './functions/redux-ghost';
import { TagBucket } from './functions/tag-bucket';
import { announceNoteUpdates } from './functions/change-announcer';
import { getUnconfirmedChanges } from './functions/unconfirmed-changes';
import { start as startConnectionMonitor } from './functions/connection-monitor';
import { getAccountName } from './functions/username-monitor';
import { tagHashOf as t } from '../../utils/tag-hash';
import { stopSyncing } from '../persistence';

import type * as A from '../action-types';
import type * as S from '../';
import type * as T from '../../types';

const debug = debugFactory('simperium-middleware');

type Buckets = {
  note: T.Note;
  preferences: T.Preferences;
  tag: T.Tag;
};

export const initSimperium = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
): S.Middleware => (store) => {
  const { dispatch, getState } = store;

  const client = createClient<Buckets>('chalk-bump-f49', token, {
    objectStoreProvider: (bucket) => {
      switch (bucket.name) {
        case 'note':
          return new NoteBucket(store);

        case 'preferences':
          return new InMemoryBucket();

        case 'tag':
          return new TagBucket(store);
      }
    },
    ghostStoreProvider: (bucket) => new ReduxGhost(bucket.name, store),
  });
  client.on('unauthorized', () => logout());

  getAccountName(client).then((accountName) => {
    debug(`authenticated: ${accountName}`);
    dispatch(actions.settings.setAccountName(accountName));
  });

  startConnectionMonitor(client, store);

  const noteBucket = client.bucket('note');
  noteBucket.channel.on(
    'update',
    (entityId, updatedEntity, original, patch, isIndexing) => {
      if (original && patch && 'undefined' !== typeof isIndexing) {
        dispatch({
          type: 'REMOTE_NOTE_UPDATE',
          noteId: entityId as T.EntityId,
          note: updatedEntity,
          remoteInfo: {
            original,
            patch,
            isIndexing,
          },
        });
      } else {
        dispatch({
          type: 'REMOTE_NOTE_UPDATE',
          noteId: entityId as T.EntityId,
          note: updatedEntity,
        });
      }
    }
  );
  noteBucket.channel.on('remove', (noteId) =>
    dispatch({
      type: 'REMOTE_NOTE_DELETE_FOREVER',
      noteId,
    })
  );

  noteBucket.channel.on('update', announceNoteUpdates(store));

  noteBucket.channel.localQueue.on('send', (change) => {
    dispatch({
      type: 'SUBMIT_PENDING_CHANGE',
      entityId: change.id as T.EntityId,
      ccid: change.ccid,
    });
  });

  noteBucket.channel.on('acknowledge', (entityId, change) => {
    dispatch({
      type: 'ACKNOWLEDGE_PENDING_CHANGE',
      entityId: entityId as T.EntityId,
      ccid: change.ccid,
    });
  });

  const tagBucket = client.bucket('tag');
  tagBucket.channel.on(
    'update',
    (entityId, updatedEntity, original, patch, isIndexing) => {
      if (original && patch && 'undefined' !== typeof isIndexing) {
        dispatch({
          type: 'REMOTE_TAG_UPDATE',
          tagHash: (entityId as string) as T.TagHash,
          tag: updatedEntity,
          remoteInfo: {
            original,
            patch,
            isIndexing,
          },
        });
      } else {
        dispatch({
          type: 'REMOTE_TAG_UPDATE',
          tagHash: (entityId as string) as T.TagHash,
          tag: updatedEntity,
        });
      }
    }
  );
  tagBucket.channel.on('remove', (tagId) =>
    dispatch({
      type: 'REMOTE_TAG_DELETE',
      tagHash: (tagId as string) as T.TagHash,
    })
  );

  const preferencesBucket = client.bucket('preferences');
  preferencesBucket.channel.on('update', (entityId, updatedEntity) => {
    if ('preferences-key' !== entityId) {
      return;
    }

    dispatch({
      type: 'SET_ANALYTICS',
      allowAnalytics: !!updatedEntity.analytics_enabled,
    });
  });

  if (createWelcomeNote) {
    import(
      /* webpackChunkName: 'welcome-message' */ '../../welcome-message'
    ).then(({ content }) => {
      const now = Date.now() / 1000;
      noteBucket.add({
        content,
        deleted: false,
        systemTags: [],
        creationDate: now,
        modificationDate: now,
        shareURL: '',
        publishURL: '',
        tags: [],
      });
    });
  }

  const noteQueue = new BucketQueue(noteBucket);
  const queueNoteUpdate = (noteId: T.EntityId, delay = 2000) =>
    noteQueue.add(noteId, Date.now() + delay);

  const tagQueue = new BucketQueue(tagBucket);
  const queueTagUpdate = (tagHash: T.TagHash, delay = 20) =>
    tagQueue.add(tagHash, Date.now() + delay);

  if ('production' !== process.env.NODE_ENV) {
    window.noteBucket = noteBucket;
    window.tagBucket = tagBucket;
    window.noteQueue = noteQueue;
    window.tagQueue = tagQueue;
  }

  // walk notes and queue any for sync which have discrepancies with their ghost
  new NoteDoctor(store, noteQueue);

  window.addEventListener('storage', (event) => {
    if (event.key === 'simplenote_logout') {
      stopSyncing();
      client.end();
      logout();
    }
  });

  return (next) => (action: A.ActionType) => {
    console.log(action);
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'ADD_NOTE_TAG':
        if (!prevState.data.tags.has(t(action.tagName))) {
          queueTagUpdate(t(action.tagName));
        }
        queueNoteUpdate(action.noteId);
        return result;

      case 'REMOVE_NOTE_TAG':
        queueNoteUpdate(action.noteId);
        return result;

      // while editing we should debounce
      // updates to prevent thrashing
      case 'CREATE_NOTE_WITH_ID':
        noteBucket
          .add({
            content: '',
            tags: [],
            creationDate: Date.now() / 1000,
            modificationDate: Date.now() / 1000,
            deleted: false,
            systemTags: [],
            shareURL: '',
            publishURL: '',
            ...action.note,
          })
          .then((note) =>
            dispatch({
              type: 'CONFIRM_NEW_NOTE',
              originalNoteId: action.noteId,
              newNoteId: note.id as T.EntityId,
              note: note.data,
            })
          );
        return result;

      case 'INSERT_TASK_INTO_NOTE':
      case 'EDIT_NOTE':
        queueNoteUpdate(action.noteId);
        return result;

      case 'FILTER_NOTES':
      case 'OPEN_NOTE':
      case 'SELECT_NOTE': {
        const noteId =
          action.noteId ??
          action.meta?.nextNoteToOpen ??
          getState().ui.openedNote;

        if (noteId) {
          setTimeout(() => {
            if (getState().ui.openedNote === noteId) {
              noteBucket.getRevisions(noteId).then((revisions) => {
                dispatch({
                  type: 'LOAD_REVISIONS',
                  noteId: noteId,
                  revisions: revisions
                    .map(({ data, version }): [number, T.Note] => [
                      version,
                      data,
                    ])
                    .sort((a, b) => a[0] - b[0]),
                });
              });
            }
          }, 250);
        }

        return result;
      }

      // other note editing actions however
      // should trigger an immediate sync
      case 'IMPORT_NOTE_WITH_ID':
      case 'MARKDOWN_NOTE':
      case 'PIN_NOTE':
      case 'PUBLISH_NOTE':
      case 'RESTORE_NOTE':
      case 'RESTORE_NOTE_REVISION':
      case 'TRASH_NOTE':
        queueNoteUpdate(action.noteId, 10);
        return result;

      case 'DELETE_NOTE_FOREVER':
        setTimeout(() => noteBucket.remove(action.noteId), 10);
        return result;

      case 'RENAME_TAG': {
        const oldHash = t(action.oldTagName);
        const newHash = t(action.newTagName);

        if (newHash !== oldHash) {
          // only remove the old tag if its tag hash changed
          // and we had to create a new one
          setTimeout(() => tagBucket.remove(oldHash), 10);
        }

        queueTagUpdate(newHash);
        return result;
      }

      case 'REORDER_TAG':
        // if one tag changes order we likely have to synchronize all tags…
        nextState.data.tags.forEach((tag, tagHash) => {
          queueTagUpdate(tagHash);
        });
        return result;

      case 'SET_ANALYTICS':
        preferencesBucket.get('preferences-key').then((preferences) => {
          preferencesBucket.update(
            'preferences-key',
            {
              ...preferences.data,
              analytics_enabled: action.allowAnalytics,
            },
            { sync: true }
          );
        });
        return result;

      case 'TOGGLE_ANALYTICS':
        preferencesBucket.get('preferences-key').then((preferences) => {
          preferencesBucket.update(
            'preferences-key',
            {
              ...preferences.data,
              analytics_enabled: !preferences.data.analytics_enabled,
            },
            { sync: true }
          );
        });
        return result;

      case 'TRASH_TAG': {
        tagBucket.remove(t(action.tagName));
        return result;
      }

      case 'LOGOUT': {
        const changes = getUnconfirmedChanges(nextState);
        changes.notes.forEach((noteId) => noteQueue.add(noteId, Date.now()));

        if (changes.notes.length > 0) {
          store.dispatch({
            type: 'SHOW_DIALOG',
            dialog: 'LOGOUT-CONFIRMATION',
          });
          return result;
        }

        stopSyncing();
        localStorage.setItem('simplenote_logout', Math.random().toString());
        client.end();
        logout();
        return result;
      }

      case 'REALLY_LOGOUT':
        stopSyncing();
        localStorage.setItem('simplenote_logout', Math.random().toString());
        client.end();
        logout();
        return result;
    }

    return result;
  };
};
