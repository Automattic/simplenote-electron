import { default as createClient } from 'simperium';

import debugFactory from 'debug';
import actions from '../actions';
import { BucketQueue } from './functions/bucket-queue';
import { InMemoryBucket } from './functions/in-memory-bucket';
import { NoteBucket } from './functions/note-bucket';
import { NoteDoctor } from './functions/note-doctor';
import { ReduxGhost } from './functions/redux-ghost';
import { TagBucket } from './functions/tag-bucket';
import { getUnconfirmedChanges } from './functions/unconfirmed-changes';
import { start as startConnectionMonitor } from './functions/connection-monitor';
import { getAccountName } from './functions/username-monitor';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

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
  noteBucket.on('update', (entityId, updatedEntity, remoteInfo) => {
    dispatch({
      type: 'REMOTE_NOTE_UPDATE',
      noteId: entityId,
      note: updatedEntity,
      remoteInfo,
    });
  });

  noteBucket.channel.on('update', (noteId) => {
    const content = store.getState().data.notes.get(noteId)?.content;

    if (!content) {
      return;
    }

    const notification = new Notification('Note Updated!', {
      body: content,
    });

    notification.onclick = () => dispatch(actions.ui.openNote(noteId));
  });

  noteBucket.channel.localQueue.on('send', (change) => {
    dispatch({
      type: 'SUBMIT_PENDING_CHANGE',
      entityId: change.id,
      ccid: change.ccid,
    });
  });

  noteBucket.channel.on('acknowledge', (entityId, change) => {
    dispatch({
      type: 'ACKNOWLEDGE_PENDING_CHANGE',
      entityId: entityId,
      ccid: change.ccid,
    });
  });

  const tagBucket = client.bucket('tag');
  tagBucket.on('update', (entityId, updatedEntity, remoteInfo) => {
    dispatch({
      type: 'REMOTE_TAG_UPDATE',
      tagId: entityId,
      tag: updatedEntity,
      remoteInfo,
    });
  });

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
  const queueTagUpdate = (tagId: T.EntityId, delay = 20) =>
    tagQueue.add(tagId, Date.now() + delay);

  if ('production' !== process.env.NODE_ENV) {
    window.noteQueue = noteQueue;
    window.tagQueue = tagQueue;
  }

  // walk notes and queue any for sync which have discrepancies with their ghost
  new NoteDoctor(store, noteQueue);

  return (next) => (action: A.ActionType) => {
    console.log(action);
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'ADD_NOTE_TAG':
        if (prevState.data.tags[1].has(action.tagName.toLocaleLowerCase())) {
          queueTagUpdate(
            nextState.data.tags[1].get(action.tagName.toLocaleLowerCase())
          );
        } else {
          tagBucket.add({ name: action.tagName }).then((tag) =>
            dispatch({
              type: 'CONFIRM_NEW_TAG',
              tagName: action.tagName,
              originalTagId: nextState.data.tags[1].get(
                action.tagName.toLocaleLowerCase()
              ),
              newTagId: tag.id,
              tag: tag.data,
            })
          );
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
              newNoteId: note.id,
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
                    .map(({ data, version }) => [version, data])
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
        const tagId = prevState.data.tags[1].get(
          action.oldTagName.toLocaleLowerCase()
        );
        if (tagId) {
          queueTagUpdate(tagId);
        }
        return result;
      }

      case 'REORDER_TAG':
        // if one tag changes order we likely have to synchronize all tags…
        nextState.data.tags[0].forEach((tag, tagId) => {
          queueTagUpdate(tagId);
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
        const tagId = prevState.data.tags[1].get(
          action.tagName.toLocaleLowerCase()
        );

        if (tagId) {
          tagBucket.remove(tagId);
        }

        return result;
      }

      case 'LOGOUT': {
        const changes = getUnconfirmedChanges(nextState);
        changes.notes.forEach((noteId) => noteQueue.add(noteId, Date.now()));
        const changesString =
          changes.notes.length < 4
            ? changes.notes
                .map((noteId) => {
                  const hasGhost = nextState.simperium.ghosts[1]
                    .get('note')
                    ?.get(noteId);

                  const note = nextState.data.notes.get(noteId);
                  const content = note?.content ?? '';
                  const newlineAt = content.indexOf('\n');
                  const length = newlineAt >= 0 ? Math.min(newlineAt, 60) : 60;

                  const prefix = !hasGhost
                    ? 'new'
                    : note?.deleted
                    ? 'trashed'
                    : 'changed';

                  const preview = content.slice(0, length) || '(Blank note)';

                  return `(${prefix}) ${preview}`;
                })
                .join('\n')
            : `${changes.notes.length} notes may not be synchronized`;

        if (changes && !window.electron?.confirmLogout(changesString)) {
          return result;
        }

        client.end();
        logout();
        return result;
      }
    }

    return result;
  };
};
