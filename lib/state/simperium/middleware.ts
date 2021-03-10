import { default as createClient } from 'simperium';

import debugFactory from 'debug';
import actions from '../actions';
import getConfig from '../../../get-config';
import { BucketQueue } from './functions/bucket-queue';
import { InMemoryBucket } from './functions/in-memory-bucket';
import { InMemoryGhost } from './functions/in-memory-ghost';
import { NoteBucket } from './functions/note-bucket';
// import { NoteDoctor } from './functions/note-doctor';
import { PreferencesBucket } from './functions/preferences-bucket';
import { ReduxGhost } from './functions/redux-ghost';
import { TagBucket } from './functions/tag-bucket';
import { getUnconfirmedChanges } from './functions/unconfirmed-changes';
import { start as startConnectionMonitor } from './functions/connection-monitor';
import { confirmBeforeClosingTab } from './functions/tab-close-confirmation';
import { getAccountName } from './functions/username-monitor';
import { isElectron } from '../../utils/platform';
import { tagHashOf as t } from '../../utils/tag-hash';
import { stopSyncing } from '../persistence';

import type * as A from '../action-types';
import type * as S from '../';
import type * as T from '../../types';

const debug = debugFactory('simperium-middleware');

type Buckets = {
  account: T.JSONSerializable;
  note: T.Note;
  preferences: T.Preferences;
  tag: T.Tag;
};

export const initSimperium = (
  logout: () => any,
  token: string,
  username: string | null
): S.Middleware => (store) => {
  const { dispatch, getState } = store;

  const client = createClient<Buckets>(getConfig().app_id, token, {
    objectStoreProvider: (bucket) => {
      switch (bucket.name) {
        case 'account':
          return new InMemoryBucket();

        case 'note':
          return new NoteBucket(store);

        case 'preferences':
          return new PreferencesBucket(store);

        case 'tag':
          return new TagBucket(store);
      }
    },

    ghostStoreProvider: (bucket) => {
      switch (bucket.name) {
        case 'account':
          return new InMemoryGhost();

        default:
          return new ReduxGhost(bucket.name, store);
      }
    },
  });
  client.on('unauthorized', () => logout());

  getAccountName(client).then((accountName) => {
    debug(`authenticated: ${accountName}`);
    dispatch(actions.settings.setAccountName(accountName));
  });

  startConnectionMonitor(client, store);
  if (!isElectron) {
    confirmBeforeClosingTab(store);
  }

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

  if ('Notification' in window) {
    import(
      /* webpackChunkName: 'change-announcer' */ './functions/change-announcer'
    ).then(({ announceNoteUpdates }) =>
      noteBucket.channel.on('update', announceNoteUpdates(store))
    );
  }

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

  const parseVerificationToken = (token: unknown) => {
    try {
      const { username, verified_at: verifiedAt } = JSON.parse(token as string);
      return { username, verifiedAt };
    } catch (e) {
      return null;
    }
  };

  const updateVerificationState = (entity: T.JSONSerializable) => {
    const { token, sent_to } = entity;

    const parsedToken = parseVerificationToken(token);
    const hasValidToken = parsedToken && parsedToken.username === username;
    const hasPendingEmail = sent_to === username;

    const state = hasValidToken
      ? 'verified'
      : hasPendingEmail
      ? 'pending'
      : 'unverified';

    return dispatch({
      type: 'UPDATE_ACCOUNT_VERIFICATION',
      state,
    });
  };

  const accountBucket = client.bucket('account');
  accountBucket.on('update', (entityId, entity) => {
    if ('email-verification' === entityId) {
      updateVerificationState(entity);
    }
  });
  accountBucket.channel.on('ready', () => {
    if ('unknown' === getState().data.accountVerification) {
      dispatch({
        type: 'UPDATE_ACCOUNT_VERIFICATION',
        state: 'unverified',
      });
    }
  });

  const preferencesBucket = client.bucket('preferences');
  preferencesBucket.channel.on('update', (entityId, updatedEntity) => {
    if ('preferences-key' !== entityId) {
      return;
    }

    if (
      !!updatedEntity.analytics_enabled !== getState().data.analyticsAllowed
    ) {
      dispatch({
        type: 'REMOTE_ANALYTICS_UPDATE',
        allowAnalytics: !!updatedEntity.analytics_enabled,
      });
    }
  });
  preferencesBucket.channel.once('ready', async () => {
    const preferences = await preferencesBucket.get('preferences-key');
    dispatch({
      type: 'REMOTE_ANALYTICS_UPDATE',
      allowAnalytics: !!preferences?.data?.analytics_enabled,
    });
  });

  const noteQueue = new BucketQueue(noteBucket);
  const queueNoteUpdate = (noteId: T.EntityId, delay = 2000) =>
    noteQueue.add(noteId, Date.now() + delay);

  const hasRequestedRevisions = new Set<T.EntityId>();

  const tagQueue = new BucketQueue(tagBucket);
  const queueTagUpdate = (tagHash: T.TagHash, delay = 20) =>
    tagQueue.add(tagHash, Date.now() + delay);

  const preferencesQueue = new BucketQueue(preferencesBucket);
  const queuePreferencesUpdate = (entityId: T.EntityId, delay = 20) =>
    preferencesQueue.add(entityId, Date.now() + delay);

  if ('production' !== process.env.NODE_ENV) {
    window.account = accountBucket;
    // window.preferencesBucket = preferencesBucket;
    window.noteBucket = noteBucket;
    window.tagBucket = tagBucket;
    window.noteQueue = noteQueue;
    window.tagQueue = tagQueue;
  }

  // walk notes and queue any for sync which have discrepancies with their ghost
  // new NoteDoctor(store, noteQueue);

  window.addEventListener('storage', (event) => {
    if (event.key === 'simplenote_logout') {
      stopSyncing();
      client.end();
      logout();
    }
  });

  return (next) => (action: A.ActionType) => {
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'ADD_COLLABORATOR':
      case 'ADD_NOTE_TAG': {
        const tagHash = t(
          action.type === 'ADD_COLLABORATOR'
            ? action.collaboratorAccount
            : action.tagName
        );

        if (!prevState.data.tags.has(tagHash)) {
          queueTagUpdate(tagHash);
        }

        queueNoteUpdate(action.noteId);
        return result;
      }

      case 'REMOVE_COLLABORATOR':
      case 'REMOVE_NOTE_TAG':
        queueNoteUpdate(action.noteId);
        return result;

      case 'CREATE_NOTE_WITH_ID':
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

        //  Preload the revisions when opening a note but only do it if no revisions are in memory
        if (
          noteId &&
          !nextState.data.noteRevisions.get(noteId)?.size &&
          !hasRequestedRevisions.has(noteId)
        ) {
          hasRequestedRevisions.add(noteId);
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

      case 'REVISIONS_TOGGLE': {
        const showRevisions = nextState.ui.showRevisions;
        const noteId = nextState.ui.openedNote;

        if (noteId && showRevisions) {
          noteBucket.getRevisions(noteId).then((revisions) => {
            dispatch({
              type: 'LOAD_REVISIONS',
              noteId: noteId,
              revisions: revisions
                .map(({ data, version }): [number, T.Note] => [version, data])
                .sort((a, b) => a[0] - b[0]),
            });
          });
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

        nextState.data.notes.forEach((note, noteId) => {
          if (prevState.data.notes.get(noteId) !== note) {
            queueNoteUpdate(noteId);
          }
        });

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
        queuePreferencesUpdate('preferences-key' as T.EntityId);
        return result;

      case 'TRASH_TAG': {
        tagBucket.remove(t(action.tagName));
        nextState.data.notes.forEach((note, noteId) => {
          if (prevState.data.notes.get(noteId) !== note) {
            queueNoteUpdate(noteId);
          }
        });
        return result;
      }

      case 'CLOSE_WINDOW': {
        const changes = getUnconfirmedChanges(nextState);
        changes.notes.forEach((noteId) => noteQueue.add(noteId, Date.now()));

        if (changes.notes.length > 0) {
          store.dispatch({
            type: 'SHOW_DIALOG',
            dialog: 'CLOSE-WINDOW-CONFIRMATION',
          });
          return result;
        }

        store.dispatch({
          type: 'REALLY_CLOSE_WINDOW',
        });
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
