import simperium from 'simperium'
import ActionMap from './action-map'
import throttle from '../utils/throttle'

export default new ActionMap( {
	namespace: 'App',

	initialState: {
		authorized: false,
		selectedNoteId: null,
		notes: [],
		tags: [],
		showTrash: false,
		listTitle: 'All Notes',
		showNavigation: false,
		showNoteInfo: false,
		editingTags: false
	},

	handlers: {

		authChanged( state, { authorized } ) {
			if ( authorized ) {
				return Object.assign( {}, state, {
					authorized: true
				} );
			}
			else {
				return Object.assign( {}, state, {
					authorized: false,
					notes: [], tags: []
				} );
			}
		},

		toggleNavigation( state ) {
			if ( state.showNavigation ) {
				return Object.assign( {}, state, {
					showNavigation: false, editingTags: false
				} );
			}
			else {
				return Object.assign( {}, state, {
					showNavigation: true, showNoteInfo: false
				} );
			}
		},

		selectAllNotes( state ) {
			return Object.assign( {}, state, {
				showNavigation: false, editingTags: false,
				tag: null, showTrash: false, listTitle: "All Notes"
			} );
		},

		selectTrash( state ) {
			return Object.assign( {}, state, {
				showNavigation: false, editingTags: false,
				tag: null, showTrash: true, listTitle: "Trash"
			} );
		},

		selectTag( state, { tag } ) {
			return Object.assign( {}, state, {
				showNavigation: false, editingTags: false, showTrash: false,
				tag: tag, listTitle: tag.data.name
			} );
		},

		editTags( state ) {
			return Object.assign( {}, state, {
				editingTags: !state.editingTags
			} );
		},

		search( state, { filter } ) {
			return Object.assign( {}, state, { filter } );
		},

		newNote: {
			creator( { noteBucket } ) {
				return ( dispatch, getState ) => {
					var state = getState().appState;
					var timestamp = (new Date()).getTime() / 1000;

					if ( state.showTrash ) {
						dispatch( this.action( 'selectAllNotes' ) );
					}

					// insert a new note into the store and select it
					noteBucket.add( {
						content: '',
						deleted: false,
						systemTags: [],
						creationDate: timestamp,
						modificationDate: timestamp,
						shareURL: '',
						publishURL: '',
						tags: [].concat(state.tag ? state.tag.data.name : [])
					}, ( e, note ) => {
						dispatch( this.action( 'loadNotes', { noteBucket } ) );
						dispatch( this.action( 'loadAndSelectNote', { noteBucket, noteId: note.id } ) );
					} );
				};
			}
		},

		loadNotes: {
			creator( { noteBucket } ) {
				return dispatch => {
					noteBucket.query( db => {
						var notes = [];
						db.transaction('note').objectStore('note').index('pinned-sort').openCursor(null, 'prev').onsuccess = (e) => {
							var cursor = e.target.result;
							if ( cursor ) {
								notes.push(cursor.value);
								cursor.continue();
							} else {
								dispatch( this.action( 'notesLoaded', { notes: notes } ) );
							}
						};
					});
				};
			}
		},

		notesLoaded( state, { notes } ) {
			return Object.assign( {}, state, { notes } );
		},

		loadAndSelectNote: {
			creator( { noteBucket, noteId } ) {
				return dispatch => {
					dispatch( this.action( 'selectNote', { noteId } ) );

					noteBucket.get(noteId, (e, note) => {
						dispatch( this.action( 'noteLoaded', { note } ) );
					});
				};
			}
		},

		pinNote: {
			creator( { noteBucket, note, pin } ) {
				return dispatch => {
					let systemTags = note.data.systemTags || [];
					let pinnedTagIndex = systemTags.indexOf('pinned');

					if ( pin && pinnedTagIndex === -1 ) {
						note.data.systemTags.push( 'pinned' );
						noteBucket.update( note.id, note.data );
					} else if ( !pin && pinnedTagIndex !== -1 ) {
						note.data.systemTags = systemTags.filter( tag => tag !== 'pinned' );
						noteBucket.update( note.id, note.data );
					} else {
						return;
					}

					dispatch( this.action( 'selectNote', {
						noteId: note.id
					} ) );
				};
			}
		},

		selectNote( state, { noteId } ) {
			return Object.assign( {}, state, {
				showNavigation: false, editingTags: false,
				selectedNoteId: noteId
			} );
		},

		noteLoaded( state, { note } ) {
			return Object.assign( {}, state, {
				note: note, selectedNoteId: note.id, revisions: null
			});
		},

		closeNote( state ) {
			return Object.assign( {}, state, {
				note: null, selectedNoteId: null
			} );
		},

		noteUpdated: {
			creator( { noteBucket, noteId, original, data, patch } ) {
				return ( dispatch, getState ) => {
					var state = getState().appState;

					// refresh the notes list
					dispatch( this.action( 'loadNotes', { noteBucket } ) );

					if (state.selectedNoteId !== noteId || !patch) {
						return;
					}

					// working is the state of the note in the editor
					var working = state.note.data;

					// diff of working and original will produce the modifications the client has currently made
					var working_diff = simperium.util.change.diff(original, working);
					// generate a patch that composes both the working changes and upstream changes
					var patch = simperium.util.change.transform(working_diff, patch, original);
					// apply the new patch to the upstream data
					var rebased = simperium.util.change.apply(patch, data);

					// TODO: determine where the cursor is and put it in the correct place
					// when applying the rebased content

					state.note.data = rebased;

					dispatch( this.action( 'updateNoteContent', {
						noteBucket, note, content: note.data.content
					} ) );
				};
			}
		},

		updateNoteContent: {
			creator( { noteBucket, note, content } ) {
				return dispatch => {
					if (note) {
						note.data.content = content;

						// update the bucket but don't fire a sync immediately
						noteBucket.update( note.id, note.data, { sync: false } );

						throttle( note.id, 3000, () => {
							noteBucket.touch( note.id );
						} );

						dispatch( this.action( 'selectNote', {
							noteId: note.id
						} ) );
					}
				};
			}
		},

		updateNoteTags: {
			creator( { noteBucket, note } ) {
				return dispatch => {
					if (note) {
						note.data.tags = tags;
						noteBucket.update(note.id, note.data);

						dispatch( this.action( 'selectNote', {
							noteId: note.id
						} ) );
					}
				}
			}
		},

		trashNote: {
			creator( { noteBucket, note } ) {
				return dispatch => {
					if (note) {
						note.data.deleted = true;
						noteBucket.update(note.id, note.data);

						dispatch( this.action( 'closeNote', {
							noteId: note.id
						} ) );
					}
				};
			}
		},

		restoreNote: {
			creator( { noteBucket, note } ) {
				return dispatch => {
					if (note) {
						note.data.deleted = false;
						noteBucket.update(note.id, note.data);

						dispatch( this.action( 'selectNote', {
							noteId: null
						} ) );
					}
				};
			}
		},

		noteRevisions: {
			creator( { noteBucket, note } ) {
				return dispatch => {
					noteBucket.getRevisions(note.id, (e, revisions) => {
						if (e) {
							return console.warn("Failed to load revisions", e);
						}

						dispatch( this.action( 'noteRevisionsLoaded', { revisions } ) );
					});
				};
			}
		},

		noteRevisionsLoaded( state, { revisions } ) {
			return Object.assign( {}, state, { revisions } );
		},

		showNoteInfo( state, { context } ) {
			if ( state.note ) {
				return Object.assign( {}, state, {
					showNavigation: false, editingTags: false,
					showNoteInfo: { context }
				} );
			}
		},

		hideNoteInfo( state ) {
			return Object.assign( {}, state, {
				showNoteInfo: false
			} );
		},

		loadTags: {
			creator( { tagBucket } ) {
				return dispatch => {
					tagBucket.query( db => {
						var tags = [];
						db.transaction('tag').objectStore('tag').openCursor(null, 'prev').onsuccess = (e) => {
							var cursor = e.target.result;
							if (cursor) {
								tags.push(cursor.value);
								cursor.continue();
							} else {
								dispatch( this.action( 'tagsLoaded', { tags: tags } ) );
							}
						}
					} );
				};
			}
		},

		tagsLoaded( state, { tags } ) {
			return Object.assign( {}, state, { tags } );
		}
	}
} );
