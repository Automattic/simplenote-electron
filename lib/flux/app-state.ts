import { get, partition } from 'lodash';
import update from 'react-addons-update';
import Debug from 'debug';
import ActionMap from './action-map';
import actions from '../state/actions';

import { AppState, State } from '../state';
import * as T from '../types';

const debug = Debug('appState');

const initialState: AppState = {
  notes: null,
  tags: [],
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
      });
    },

    showAllNotesAndSelectFirst: {
      creator() {
        return (dispatch, getState) => {
          dispatch(actions.ui.showAllNotes());
          dispatch(actions.notes.notesLoaded(getState().notes));
        };
      },
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
              dispatch(actions.ui.createNote());
              setTimeout(() => dispatch(actions.ui.selectNote(note)), 500);
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
                  dispatch(actions.notes.notesLoaded(notes));
                }
              }
            };
          });
        };
      },
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
            notes,
            ui: { note },
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
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = true;
            noteBucket.update(note.id, note.data);
            dispatch(actions.ui.trashNote());
          }
        };
      },
    },

    restoreNote: {
      creator({
        noteBucket,
        note,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = false;
            noteBucket.update(note.id, note.data);
            dispatch(actions.ui.restoreNote());
          }
        };
      },
    },

    deleteNoteForever: {
      creator({
        noteBucket,
        note,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          noteBucket.remove(note.id);
          dispatch(this.action('loadNotes', { noteBucket }));
          dispatch(actions.ui.deleteNoteForever());
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
          dispatch(actions.notes.notesLoaded(notes));
        };
      },
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
