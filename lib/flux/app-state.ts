import { get, partition, some } from 'lodash';
import update from 'react-addons-update';
import Debug from 'debug';
import ActionMap from './action-map';
import filterNotes from '../utils/filter-notes';
import analytics from '../analytics';

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
  editorMode: 'edit',
  filter: '',
  selectedNoteId: null,
  previousIndex: -1,
  notes: null,
  tags: [],
  revision: null,
  showTrash: false,
  listTitle: 'All Notes',
  showNavigation: false,
  showNoteInfo: false,
  isViewingRevisions: false,
  editingTags: false,
  dialogs: [],
  nextDialogKey: 0,
  shouldPrint: false,
  searchFocus: false,
  unsyncedNoteIds: [], // note bucket only
  isOffline: true, // disconnected from Simperium server
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

    toggleNavigation(state: AppState) {
      if (state.showNavigation) {
        return update(state, {
          showNavigation: { $set: false },
          editingTags: { $set: false },
        });
      }

      return update(state, {
        showNavigation: { $set: true },
        showNoteInfo: { $set: false },
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
      return update(state, {
        showNavigation: { $set: false },
        editingTags: { $set: false },
        showTrash: { $set: false },
        listTitle: { $set: 'All Notes' },
        tag: { $set: null },
        note: { $set: null },
        selectedNoteId: { $set: null },
        previousIndex: { $set: -1 },
      });
    },

    selectTrash(state: AppState) {
      return update(state, {
        showNavigation: { $set: false },
        editingTags: { $set: false },
        showTrash: { $set: true },
        listTitle: { $set: 'Trash' },
        tag: { $set: null },
        note: { $set: null },
        selectedNoteId: { $set: null },
        previousIndex: { $set: -1 },
      });
    },

    selectTagAndSelectFirstNote: {
      creator({ tag }: { tag: T.TagEntity }) {
        return (dispatch, getState) => {
          dispatch(this.action('selectTag', { tag }));
          dispatch(
            this.action('notesLoaded', {
              notes: getState().appState.notes,
            })
          );
        };
      },
    },

    selectTag(state: AppState, { tag }: { tag: T.TagEntity }) {
      return update(state, {
        showNavigation: { $set: false },
        editingTags: { $set: false },
        showTrash: { $set: false },
        listTitle: { $set: tag.data.name },
        tag: { $set: tag },
        note: { $set: null },
        selectedNoteId: { $set: null },
        previousIndex: { $set: -1 },
      });
    },

    setEditorMode(state: AppState, { mode }: { mode: T.EditorMode }) {
      return update(state, {
        editorMode: { $set: mode },
      });
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

      if (type === 'Settings') {
        updateCommands.showNavigation = { $set: false };
      }

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

    editTags(state: AppState) {
      return update(state, {
        editingTags: { $set: !state.editingTags },
      });
    },

    search(state: AppState, { filter }: { filter: string }) {
      return update(state, {
        filter: { $set: filter },
      });
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
          const { appState: state, settings } = getState();
          const timestamp = new Date().getTime() / 1000;

          if (state.showTrash) {
            dispatch(this.action('showAllNotes'));
          }

          if (settings.markdownEnabled) {
            dispatch(this.action('setEditorMode', { mode: 'edit' }));
          }

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
              tags: ([] as T.TagName[]).concat(
                state.tag ? state.tag.data.name : []
              ),
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

      let selectedNote = null;

      if (state.note) {
        // Load the newest version of the selected note
        selectedNote = notes.find(note => note.id === state.note.id);
      } else {
        // If no note is selected, select either the first note
        // or the previous note in the list
        const filteredNotes = filterNotes(state, pinSortedNotes);
        if (filteredNotes.length > 0) {
          selectedNote = filteredNotes[Math.max(state.previousIndex, 0)];
        }
      }

      return update(state, {
        notes: { $set: pinSortedNotes },
        note: { $set: selectedNote },
        selectedNoteId: { $set: get(selectedNote, 'id', null) },
      });
    },

    loadAndSelectNote: {
      creator({ noteBucket, noteId, hasRemoteUpdate = false }) {
        return dispatch => {
          noteBucket.get(noteId, (e, note) => {
            dispatch(this.action('selectNote', { note, hasRemoteUpdate }));
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

        return this.action('selectNote', { note: updated });
      },
    },

    setRevision(state: AppState, { revision }) {
      return update(state, {
        revision: { $set: revision },
      });
    },

    setIsViewingRevisions(state: AppState, { isViewingRevisions }) {
      return update(state, {
        isViewingRevisions: { $set: isViewingRevisions },
      });
    },

    setShouldPrintNote(state: AppState, { shouldPrint = true }) {
      return update(state, {
        shouldPrint: { $set: shouldPrint },
      });
    },

    setSearchFocus(state: AppState, { searchFocus = true }) {
      return update(state, {
        searchFocus: { $set: searchFocus },
      });
    },

    markdownNote: {
      creator({ noteBucket, note, markdown: shouldEnableMarkdown }) {
        const updated = toggleSystemTag(note, 'markdown', shouldEnableMarkdown);

        if (updated !== note) {
          noteBucket.update(note.id, updated.data);
        }

        return this.action('selectNote', { note: updated });
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

        return this.action('selectNote', { note: updated });
      },
    },

    selectNote(state: AppState, { note, hasRemoteUpdate }) {
      return update(state, {
        editingTags: { $set: false },
        note: { $set: { ...note, hasRemoteUpdate } },
        selectedNoteId: { $set: note.id },
        revision: { $set: null },
        revisions: { $set: null },
      });
    },

    closeNote(state: AppState, { previousIndex = -1 }) {
      return update(state, {
        note: { $set: null },
        selectedNoteId: { $set: null },
        previousIndex: { $set: previousIndex },
      });
    },

    noteUpdatedRemotely: {
      creator({ noteBucket, noteId, data, remoteUpdateInfo = {} }) {
        return (dispatch, getState: () => State) => {
          const state = getState().appState;
          const { patch } = remoteUpdateInfo;

          debug('noteUpdatedRemotely: %O', data);

          if (state.selectedNoteId !== noteId || !patch) {
            return;
          }

          dispatch(
            this.action('loadAndSelectNote', {
              noteBucket,
              noteId,
              hasRemoteUpdate: true,
            })
          );
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
        previousIndex: number;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = true;
            noteBucket.update(note.id, note.data);

            dispatch(this.action('closeNote', { previousIndex }));
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
        previousIndex: number;
      }) {
        return dispatch => {
          if (note) {
            note.data.deleted = false;
            noteBucket.update(note.id, note.data);

            dispatch(this.action('closeNote', { previousIndex }));
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
        previousIndex: number;
      }) {
        return dispatch => {
          noteBucket.remove(note.id);

          dispatch(this.action('closeNote', { previousIndex }));
          dispatch(this.action('loadNotes', { noteBucket }));
        };
      },
    },

    noteRevisions: {
      creator({
        noteBucket,
        note,
      }: {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
      }) {
        return dispatch => {
          noteBucket.getRevisions(note.id, (e, revisions) => {
            if (e) {
              return console.warn('Failed to load revisions', e); // eslint-disable-line no-console
            }

            dispatch(this.action('noteRevisionsLoaded', { revisions }));
          });
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

          dispatch(this.action('closeNote'));
          deleted.forEach(note => noteBucket.remove(note.id));
          dispatch(this.action('notesLoaded', { notes }));
        };
      },
    },

    noteRevisionsLoaded(state: AppState, { revisions }) {
      return update(state, {
        revisions: { $set: revisions },
      });
    },

    toggleNoteInfo(state: AppState) {
      if (state.showNoteInfo) {
        return update(state, {
          showNoteInfo: { $set: false },
        });
      }

      return update(state, {
        showNoteInfo: { $set: true },
        showNavigation: { $set: false },
        editingTags: { $set: false },
      });
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

    setUnsyncedNoteIds(
      state: AppState,
      { noteIds }: { noteIds: T.EntityId[] }
    ) {
      return update(state, {
        unsyncedNoteIds: { $set: noteIds },
      });
    },

    setConnectionStatus(
      state: AppState,
      { isOffline }: { isOffline: boolean }
    ) {
      return update(state, {
        isOffline: { $set: isOffline },
      });
    },
  },
});

export default actionMap;
