import { get, partition, some } from 'lodash';
import update from 'react-addons-update';
import Debug from 'debug';
import ActionMap from './action-map';
import filterNotes from '../utils/filter-notes';
import analytics from '../analytics';
import { util as simperiumUtil } from 'simperium';

const debug = Debug('appState');

export const actionMap = new ActionMap({
  namespace: 'App',

  initialState: {
    editorMode: 'edit',
    filter: '',
    selectedNoteId: null,
    previousIndex: -1,
    notes: [],
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
  },

  handlers: {
    authChanged(state) {
      return update(state, {
        notes: { $set: [] },
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

    selectTag(state, { tag }) {
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
              dispatch(this.action('loadNotes', { noteBucket }));
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
                dispatch(this.action('notesLoaded', { notes: notes }));
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
      creator({ noteBucket, note, pin }) {
        return dispatch => {
          let systemTags = note.data.systemTags || [];
          let pinnedTagIndex = systemTags.indexOf('pinned');

          if (pin && pinnedTagIndex === -1) {
            note.data.systemTags.push('pinned');
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
          } else if (!pin && pinnedTagIndex !== -1) {
            note.data.systemTags = systemTags.filter(tag => tag !== 'pinned');
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
          }
        };
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
      creator({ noteBucket, note, markdown }) {
        return dispatch => {
          let systemTags = note.data.systemTags || [];
          let markdownTagIndex = systemTags.indexOf('markdown');

          if (markdown && markdownTagIndex === -1) {
            note.data.systemTags.push('markdown');
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
          } else if (!markdown && markdownTagIndex !== -1) {
            note.data.systemTags = systemTags.filter(tag => tag !== 'markdown');
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
          }
        };
      },
    },

    publishNote: {
      creator({ noteBucket, note, publish }) {
        return dispatch => {
          let systemTags = note.data.systemTags || [];
          let tagIndex = systemTags.indexOf('published');

          if (publish && tagIndex === -1) {
            note.data.systemTags.push('published');
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
            analytics.tracks.recordEvent('editor_note_published');
          } else if (!publish && tagIndex !== -1) {
            note.data.systemTags = systemTags.filter(
              tag => tag !== 'published'
            );
            noteBucket.update(note.id, note.data);
            dispatch(this.action('selectNote', { note }));
            analytics.tracks.recordEvent('editor_note_unpublished');
          }
        };
      },
    },

    selectNote(state, { note, hasRemoteUpdate }) {
      return update(state, {
        editingTags: { $set: false },
        note: { $set: { ...note, hasRemoteUpdate } },
        selectedNoteId: { $set: note.id },
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

    noteUpdated: {
      creator({ noteBucket, noteId, data, remoteUpdateInfo = {} }) {
        return (dispatch, getState) => {
          var state = getState().appState;
          const { original, patch } = remoteUpdateInfo;

          debug('noteUpdated: %O', data);

          if (state.selectedNoteId !== noteId || !patch) {
            return;
          }

          // working is the state of the note in the editor
          const note = state.notes.find(n => n.id === noteId);

          if (!note) {
            console.error(`Cannot find note (id=${noteId})!`); // eslint-disable-line no-console
            return;
          }

          let working = note.data;

          // diff of working and original will produce the modifications the client has currently made
          let working_diff = simperiumUtil.change.diff(original, working);

          // Check for equal diffs so we don't duplicate changes
          const diffsAreEqual =
            get(working_diff, 'content.v', '') === get(patch, 'content.v', '');

          if (!diffsAreEqual) {
            // generate a patch that composes both the working changes and upstream changes
            const newPatch = simperiumUtil.change.transform(
              working_diff,
              patch,
              original
            );
            // apply the new patch to the upstream data
            let rebased = simperiumUtil.change.apply(newPatch, data);

            // TODO: determine where the cursor is and put it in the correct place
            // when applying the rebased content

            state.note.data = rebased;

            // update the bucket and sync
            noteBucket.update(noteId, rebased);
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

    updateNoteContent: {
      creator({ noteBucket, note, content }) {
        return (dispatch, getState) => {
          if (note) {
            note.data.content = content;
            note.data.modificationDate = Math.floor(Date.now() / 1000);

            // update the bucket and sync
            noteBucket.update(note.id, note.data);

            // Check if note is still selected (to avoid race conditions)
            if (get(getState().appState, 'note.id') === note.id) {
              dispatch(this.action('selectNote', { note }));
            }
          }
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
            appState: { preferences: { analyticsEnabled } },
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

actionMap.indexCtr = 0;

export default actionMap;
