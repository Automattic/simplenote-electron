import { get, partition, some } from 'lodash';
import update from 'react-addons-update';
import Debug from 'debug';
import ActionMap from './action-map';
import filterNotes from '../utils/filter-notes';
import analytics from '../analytics';

const debug = Debug('appState');

const toggleSystemTag = (note, systemTag, shouldHaveTag) => {
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

export const actionMap = new ActionMap({
  namespace: 'App',

  initialState: {
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
  },

  handlers: {
    authChanged(state) {
      return update(state, {
        notes: { $set: null },
        tags: { $set: [] },
        dialogs: { $set: [] },
      });
    },

    toggleNavigation(state) {
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

    showAllNotes(state) {
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

    selectTrash(state) {
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
      creator({ tag }) {
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

    selectTag(state: State, { tag }) {
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

    setEditorMode(state, { mode }) {
      return update(state, {
        editorMode: { $set: mode },
      });
    },

    showDialog(state, { dialog }) {
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

    closeDialog(state, { key }) {
      var dialogs = state.dialogs;

      for (let i = 0; i < dialogs.length; i++) {
        if (dialogs[i].key === key) {
          return update(state, {
            dialogs: { $splice: [[i, 1]] },
          });
        }
      }
    },

    editTags(state) {
      return update(state, {
        editingTags: { $set: !state.editingTags },
      });
    },

    search(state, { filter }) {
      return update(state, {
        filter: { $set: filter },
      });
    },

    newNote: {
      creator({ noteBucket, content = '' }) {
        return (dispatch, getState) => {
          const state = getState().appState;
          const settings = getState().settings;
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
              tags: [].concat(state.tag ? state.tag.data.name : []),
            },
            (e, note) => {
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
      creator({ noteBucket }) {
        return (dispatch, getState) => {
          const settings = getState().settings;
          const { sortType, sortReversed } = settings;
          var sortOrder;
          debug('loadNotes');

          if (sortType === 'alphabetical') {
            sortOrder = sortReversed ? 'prev' : 'next';
          } else {
            sortOrder = sortReversed ? 'next' : 'prev';
          }

          noteBucket.query(db => {
            var notes = [];
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

    notesLoaded(state, { notes }) {
      const [pinned, notPinned] = partition(notes, note => note.pinned);
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

    setRevision(state, { revision }) {
      return update(state, {
        revision: { $set: revision },
      });
    },

    setIsViewingRevisions(state, { isViewingRevisions }) {
      return update(state, {
        isViewingRevisions: { $set: isViewingRevisions },
      });
    },

    setShouldPrintNote(state, { shouldPrint = true }) {
      return update(state, {
        shouldPrint: { $set: shouldPrint },
      });
    },

    setSearchFocus(state, { searchFocus = true }) {
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

    selectNote(state, { note, hasRemoteUpdate }) {
      return update(state, {
        editingTags: { $set: false },
        note: { $set: { ...note, hasRemoteUpdate } },
        selectedNoteId: { $set: note.id },
        revision: { $set: null },
        revisions: { $set: null },
      });
    },

    closeNote(state, { previousIndex = -1 }) {
      return update(state, {
        note: { $set: null },
        selectedNoteId: { $set: null },
        previousIndex: { $set: previousIndex },
      });
    },

    noteUpdatedRemotely: {
      creator({ noteBucket, noteId, data, remoteUpdateInfo = {} }) {
        return (dispatch, getState) => {
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
      creator({ noteId }) {
        return (dispatch, getState) => {
          const {
            appState: { selectedNoteId, note, notes },
          } = getState();

          if (selectedNoteId === noteId) {
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
      creator({ noteBucket, note, previousIndex }) {
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
      creator({ noteBucket, note, previousIndex }) {
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
      creator({ noteBucket, note, previousIndex }) {
        return dispatch => {
          noteBucket.remove(note.id);

          dispatch(this.action('closeNote', { previousIndex }));
          dispatch(this.action('loadNotes', { noteBucket }));
        };
      },
    },

    noteRevisions: {
      creator({ noteBucket, note }) {
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
      creator({ noteBucket }) {
        return (dispatch, getState) => {
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

    noteRevisionsLoaded(state, { revisions }) {
      return update(state, {
        revisions: { $set: revisions },
      });
    },

    toggleNoteInfo(state) {
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

    tagsLoaded(state, { tags, sortTagsAlpha }) {
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
      creator({ callback, preferencesBucket }) {
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

    preferencesLoaded(state, { analyticsEnabled }) {
      return update(state, {
        preferences: {
          $set: {
            analyticsEnabled,
          },
        },
      });
    },

    setPreference(state, { key, value, preferencesBucket }) {
      const objectKey = 'preferences-key';

      preferencesBucket.get(objectKey, (e, preferences) => {
        preferencesBucket.update(objectKey, {
          ...preferences.data,
          [key]: value,
        });
      });
    },

    toggleShareAnalyticsPreference: {
      creator({ preferencesBucket }) {
        return (dispatch, getState) => {
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

    setUnsyncedNoteIds(state, { noteIds }) {
      return update(state, {
        unsyncedNoteIds: { $set: noteIds },
      });
    },

    setConnectionStatus(state, { isOffline }) {
      return update(state, {
        isOffline: { $set: isOffline },
      });
    },
  },
});

actionMap.indexCtr = 0;

export default actionMap;
