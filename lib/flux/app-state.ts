import { get, partition, some } from 'lodash';
import update from 'react-addons-update';
import Debug from 'debug';
import ActionMap from './action-map';
import analytics from '../analytics';
import actions from '../state/actions';

import { AppState, State } from '../state';
import * as T from '../types';

const debug = Debug('appState');

const toggleSystemTag = (
  note: T.NoteEntity,
  systemTag: T.SystemTag,
  shouldHaveTag: boolean
) => {
  const {
    data: { systemTags = [] },
  } = note;
  const hasTagAlready = systemTags.includes(systemTag);

  return hasTagAlready !== shouldHaveTag
    ? {
        ...note,
        data: {
          ...note.data,
          systemTags: shouldHaveTag
            ? [...systemTags, systemTag]
            : systemTags.filter(tag => tag !== systemTag),
        },
      }
    : note;
};

const initialState: AppState = {
  notes: null,
  tags: [],
  dialogs: [],
  nextDialogKey: 0,
  unsyncedNoteIds: [], // note bucket only
};

export const actionMap = new ActionMap({
  namespace: 'App',
  initialState,
  handlers: {
    authChanged(state: AppState) {
      return update(state, {
        notes: { $set: null },
        tags: { $set: [] },
        dialogs: { $set: [] },
      });
    },

    showAllNotesAndSelectFirst: {
      creator() {
        return (dispatch, getState) => {
          dispatch(this.action('showAllNotes'));
          dispatch(
            this.action('notesLoaded', {
              notes: getState().appState.notes,
            })
          );
        };
      },
    },

    showAllNotes(state: AppState) {
      return update(state, {});
    },

    selectTrash(state: AppState) {
      return update(state, {});
    },

    showDialog(state: AppState, { dialog }) {
      const { type, multiple = false, title, ...dialogProps } = dialog;

      // If there should only be one instance of the dialog in the stack
      if (!multiple && some(state.dialogs, { type })) {
        return;
      }

      const updateCommands = {
        dialogs: {
          $push: [
            {
              type,
              multiple,
              title,
              key: state.nextDialogKey,
              ...dialogProps,
            },
          ],
        },
        nextDialogKey: { $set: state.nextDialogKey + 1 },
      };

      return update(state, updateCommands);
    },

    closeDialog(state: AppState, { key }) {
      var dialogs = state.dialogs;

      for (let i = 0; i < dialogs.length; i++) {
        if (dialogs[i].key === key) {
          return update(state, {
            dialogs: { $splice: [[i, 1]] },
          });
        }
      }
    },

    newNote: {
      creator({
        noteBucket,
        content = '',
      }: {
        noteBucket: T.Bucket<T.Note>;
        content: string;
      }) {
        return (dispatch, getState: () => State) => {
          const {
            settings,
            ui: { openedTag },
          } = getState();
          const timestamp = new Date().getTime() / 1000;

          // insert a new note into the store and select it
          noteBucket.add(
            {
              content,
              deleted: false,
              systemTags: settings.markdownEnabled ? ['markdown'] : [],
              creationDate: timestamp,
              modificationDate: timestamp,
              shareURL: '',
              publishURL: '',
              tags: openedTag ? [openedTag.data.name] : [],
            },
            (e, note) => {
              if (e) {
                return debug(`newNote: could not create note - ${e.message}`);
              }
              dispatch(
                this.action('loadAndSelectNote', {
                  noteBucket,
                  noteId: note.id,
                })
              );
            }
          );
        };
      },
    },

    loadNotes: {
      creator({ noteBucket }: { noteBucket: T.Bucket<T.Note> }) {
        return (dispatch, getState: () => State) => {
          const settings = getState().settings;
          const { sortType, sortReversed } = settings;
          var sortOrder: 'prev' | 'next';
          debug('loadNotes');

          if (sortType === 'alphabetical') {
            sortOrder = sortReversed ? 'prev' : 'next';
          } else {
            sortOrder = sortReversed ? 'next' : 'prev';
          }

          noteBucket.query(db => {
            var notes: T.NoteEntity[] = [];
            db
              .transaction('note')
              .objectStore('note')
              .index(sortType)
              .openCursor(null, sortOrder).onsuccess = e => {
              var cursor = e.target.result;
              if (cursor) {
                notes.push(cursor.value);
                cursor.continue();
              } else {
                debug(`noteCount: ${notes.length}`);
                if (notes.length) {
                  dispatch(this.action('notesLoaded', { notes: notes }));
                }
              }
            };
          });
        };
      },
    },

    notesLoaded(state: AppState, { notes }: { notes: T.NoteEntity[] }) {
      const [pinned, notPinned] = partition(notes, note =>
        note.data.systemTags.includes('pinned')
      );
      const pinSortedNotes = [...pinned, ...notPinned];
      return update(state, {
        notes: { $set: pinSortedNotes },
      });
    },

    loadAndSelectNote: {
      creator({ noteBucket, noteId, hasRemoteUpdate = false }) {
        return dispatch => {
          noteBucket.get(noteId, (e, note) => {
            dispatch(actions.ui.selectNote(note, { hasRemoteUpdate }));
          });
        };
      },
    },

    pinNote: {
      creator({ noteBucket, note, pin: shouldPin }) {
        const updated = toggleSystemTag(note, 'pinned', shouldPin);

        if (note !== updated) {
          noteBucket.update(note.id, updated.data);
        }

        return actions.ui.selectNote(updated);
      },
    },

    markdownNote: {
      creator({ noteBucket, note, markdown: shouldEnableMarkdown }) {
        const updated = toggleSystemTag(note, 'markdown', shouldEnableMarkdown);

        if (updated !== note) {
          noteBucket.update(note.id, updated.data);
        }

        return actions.ui.selectNote(updated);
      },
    },

    publishNote: {
      creator({ noteBucket, note, publish: shouldPublish }) {
        const updated = toggleSystemTag(note, 'published', shouldPublish);

        if (updated !== note) {
          noteBucket.update(note.id, updated.data);

          if (shouldPublish) {
            analytics.tracks.recordEvent('editor_note_published');
          } else {
            analytics.tracks.recordEvent('editor_note_unpublished');
          }
        }

        return actions.ui.selectNote(updated);
      },
    },

    /**
     * A note is being changed from somewhere else! If the same
     * note is also open and being edited, we need to make sure
     * any in-memory changes don't get blown away. This is our
     * chance to tell node-simperium what we want the note to
     * be.
     *
     * node-simperium will compare these changes with the changes
     * from the server and merge them together.
     */
    onNoteBeforeRemoteUpdate: {
      creator({ noteId }: { noteId: T.EntityId }) {
        return (dispatch, getState: () => State) => {
          const {
            appState: { note, notes },
          } = getState();

          if (note && note.id === noteId) {
            return note.data;
          }

          const match = (notes || []).find(({ id }) => noteId === id);

          if (match) {
            return match.data;
          }

          return null;
        };
      },
    },

    trashNote: {
      creator({
        noteBucket,
        note,
        previousIndex,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = true;
            noteBucket.update(note.id, note.data);
            dispatch(actions.ui.trashNote(previousIndex));
          }
        };
      },
    },

    restoreNote: {
      creator({
        noteBucket,
        note,
        previousIndex,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = false;
            noteBucket.update(note.id, note.data);
            dispatch(actions.ui.restoreNote(previousIndex));
          }
        };
      },
    },

    deleteNoteForever: {
      creator({
        noteBucket,
        note,
        previousIndex,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          noteBucket.remove(note.id);
          dispatch(this.action('loadNotes', { noteBucket }));
          dispatch(actions.ui.deleteNoteForever(previousIndex));
        };
      },
    },

    emptyTrash: {
      creator({ noteBucket }: { noteBucket: T.Bucket<T.Note> }) {
        return (dispatch, getState: () => State) => {
          const state = getState().appState;
          const [deleted, notes] = partition(
            state.notes,
            note => note.data.deleted
          );
          deleted.forEach(note => noteBucket.remove(note.id));
          dispatch(this.action('notesLoaded', { notes }));
        };
      },
    },

    tagsLoaded(
      state: AppState,
      { tags, sortTagsAlpha }: { tags: T.TagEntity[]; sortTagsAlpha: boolean }
    ) {
      tags = tags.slice();
      if (sortTagsAlpha) {
        // Sort tags alphabetically by 'name' value
        tags.sort((a, b) => {
          return get(a, 'data.name', '')
            .toLowerCase()
            .localeCompare(get(b, 'data.name', '').toLowerCase());
        });
      } else {
        // Sort the tags by their 'index' value
        tags.sort((a, b) => (a.data.index | 0) - (b.data.index | 0));
      }

      return update(state, {
        tags: { $set: tags },
      });
    },

    loadPreferences: {
      creator({
        callback,
        preferencesBucket,
      }: {
        callback?: Function;
        preferencesBucket: T.Bucket<T.Preferences>;
      }) {
        return dispatch => {
          const objectKey = 'preferences-key';

          preferencesBucket.get(objectKey, (e, preferences) => {
            let analyticsEnabled = get(
              preferences,
              'data.analytics_enabled',
              true
            );

            // Necessary for legacy compatibility with the iOS version
            analyticsEnabled = Boolean(analyticsEnabled);

            // Create empty preferences object in the bucket if not yet there
            if (preferences === undefined) {
              preferencesBucket.update(objectKey, {});
            }

            // Global to be checked in analytics.tracks.recordEvent()
            window.analyticsEnabled = analyticsEnabled;

            // By deferring recordEvent() to this callback, we can make sure
            // that tracking starts only after preferences are loaded
            if (typeof callback === 'function') callback();

            dispatch(
              this.action('preferencesLoaded', {
                analyticsEnabled: analyticsEnabled,
              })
            );
          });
        };
      },
    },

    preferencesLoaded(
      state: AppState,
      { analyticsEnabled }: { analyticsEnabled: boolean }
    ) {
      return update(state, {
        preferences: {
          $set: {
            analyticsEnabled,
          },
        },
      });
    },

    setPreference<K extends keyof T.Preferences>(
      state: AppState,
      {
        key,
        value,
        preferencesBucket,
      }: {
        key: K;
        value: T.Preferences[K];
        preferencesBucket: T.Bucket<T.Preferences>;
      }
    ) {
      const objectKey = 'preferences-key';

      preferencesBucket.get(objectKey, (e, preferences) => {
        preferencesBucket.update(objectKey, {
          ...preferences.data,
          [key]: value,
        });
      });
    },

    toggleShareAnalyticsPreference: {
      creator({
        preferencesBucket,
      }: {
        preferencesBucket: T.Bucket<T.Preferences>;
      }) {
        return (dispatch, getState: () => State) => {
          const {
            appState: {
              preferences: { analyticsEnabled },
            },
          } = getState();

          dispatch(
            this.action('setPreference', {
              key: 'analytics_enabled',
              value: !analyticsEnabled,
              preferencesBucket,
            })
          );
        };
      },
    },
  },
});

export default actionMap;
