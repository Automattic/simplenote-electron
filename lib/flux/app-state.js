import update from 'react-addons-update'
import ActionMap from './action-map'
import throttle from '../utils/throttle'
import { util as simperiumUtil } from 'simperium'

const typingThrottle = 3000;

export default new ActionMap( {
	namespace: 'App',

	initialState: {
		authorized: false,
		accountName: null,
		editorMode: 'edit',
		selectedNoteId: null,
		notes: [],
		tags: [],
		showTrash: false,
		listTitle: 'All Notes',
		showNavigation: false,
		showNoteInfo: false,
		editingTags: false,
		dialogs: [],
		nextDialogKey: 0
	},

	handlers: {

		authChanged( state, { authorized } ) {
			if ( authorized ) {
				return update( state, {
					authorized: { $set: true }
				} );
			}

			return update( state, {
				authorized: { $set: false },
				notes: { $set: [] },
				tags: { $set: [] },
				dialogs: { $set: [] }
			} );
		},

		setAccountName( state, { accountName } ) {
			return update( state, {
				accountName: { $set: accountName }
			} );
		},

		toggleNavigation( state ) {
			if ( state.showNavigation ) {
				return update( state, {
					showNavigation: { $set: false },
					editingTags: { $set: false }
				} );
			}

			return update( state, {
				showNavigation: { $set: true },
				showNoteInfo: { $set: false }
			} );
		},

		selectAllNotes( state ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				showTrash: { $set: false },
				listTitle: { $set: 'All Notes' },
				tag: { $set: null }
			} );
		},

		selectTrash( state ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				showTrash: { $set: true },
				listTitle: { $set: 'Trash' },
				tag: { $set: null },
			} );
		},

		selectTag( state, { tag } ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				showTrash: { $set: false },
				listTitle: { $set: tag.data.name },
				tag: { $set: tag }
			} );
		},

		setEditorMode( state, { mode } ) {
			return update( state, {
				editorMode: { $set: mode }
			} );
		},

		showDialog( state, { dialog } ) {
			var dialogs = state.dialogs;
			var { type } = dialog;

			if ( dialog.single ) {
				for ( let i = 0; i < dialogs.length; i++ ) {
					if ( dialogs[i].type === type ) {
						return;
					}
				}
			}

			return update( state, {
				dialogs: { $push: [{ ...dialog, key: state.nextDialogKey }] },
				nextDialogKey: { $set: state.nextDialogKey + 1 },
			} );
		},

		closeDialog( state, { key } ) {
			var dialogs = state.dialogs;

			for ( let i = 0; i < dialogs.length; i++ ) {
				if ( dialogs[i].key === key ) {
					return update( state, {
						dialogs: { $splice: [[i, 1]] },
					} );
				}
			}
		},

		editTags( state ) {
			return update( state, {
				editingTags: { $set: !state.editingTags }
			} );
		},

		newTag: {
			creator( { tagBucket, name } ) {
				return () => {
					tagBucket.add( { name }, () => {
						// dispatch( this.action( 'loadTags', { tagBucket } ) );
					} );
				}
			}
		},

		renameTag: {
			creator( { tagBucket, noteBucket, tag, name } ) {
				return ( dispatch, getState ) => {
					let oldTagName = tag.data.name;
					if ( oldTagName === name ) {
						return;
					}

					let { notes } = getState().appState;
					let changedNoteIds = [];

					tag.data.name = name;

					// update the tag bucket but don't fire a sync immediately
					tagBucket.update( tag.id, tag.data, { sync: false } );

					// similarly, update the note bucket
					for ( let i = 0; i < notes.length; i++ ) {
						let note = notes[i];
						let noteTags = note.data.tags || [];
						let tagIndex = noteTags.indexOf( oldTagName );

						if ( tagIndex !== -1 ) {
							noteTags.splice( tagIndex, 1, name );
							note.data.tags = noteTags.filter( noteTag => noteTag !== oldTagName );
							noteBucket.update( note.id, note.data, { sync: false } );
							changedNoteIds.push( note.id );
						}
					}

					throttle( tag.id, typingThrottle, () => {
						tagBucket.touch( tag.id, () => {
							dispatch( this.action( 'loadTags', { tagBucket } ) );

							for ( let i = 0; i < changedNoteIds.length; i++ ) {
								noteBucket.touch( changedNoteIds[i] );
							}
						} );
					} );
				}
			}
		},

		trashTag: {
			creator( { tagBucket, noteBucket, tag } ) {
				return ( dispatch, getState ) => {
					var { notes } = getState().appState;
					var tagName = tag.data.name;

					for ( let i = 0; i < notes.length; i++ ) {
						let note = notes[i];
						let noteTags = note.data.tags || [];
						let newTags = noteTags.filter( noteTag => noteTag !== tagName );

						if ( newTags.length !== noteTags.length ) {
							note.data.tags = newTags;
							noteBucket.update( note.id, note.data );
						}
					}

					tagBucket.remove( tag.id, () => {
						dispatch( this.action( 'loadTags', { tagBucket } ) );
					} );
				};
			}
		},

		reorderTags: {
			creator( { tagBucket, tags } ) {
				return () => {
					for ( let i = 0; i < tags.length; i++ ) {
						let tag = tags[i];
						tag.data.index = i;
						tagBucket.update( tag.id, tag.data );
					}
				};
			}
		},

		search( state, { filter } ) {
			return update( state, {
				filter: { $set: filter }
			} );
		},

		newNote: {
			creator( { noteBucket } ) {
				return ( dispatch, getState ) => {
					var state = getState().appState;
					var timestamp = ( new Date() ).getTime() / 1000;

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
						tags: [].concat( state.tag ? state.tag.data.name : [] )
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
						db.transaction( 'note' ).objectStore( 'note' ).index( 'pinned-sort' ).openCursor( null, 'prev' ).onsuccess = ( e ) => {
							var cursor = e.target.result;
							if ( cursor ) {
								notes.push( cursor.value );
								cursor.continue();
							} else {
								dispatch( this.action( 'notesLoaded', { notes: notes } ) );
							}
						};
					} );
				};
			}
		},

		notesLoaded( state, { notes } ) {
			return update( state, {
				notes: { $set: notes }
			} );
		},

		loadAndSelectNote: {
			creator( { noteBucket, noteId } ) {
				return dispatch => {
					dispatch( this.action( 'selectNote', { noteId } ) );

					noteBucket.get( noteId, ( e, note ) => {
						dispatch( this.action( 'noteLoaded', { note } ) );
					} );
				};
			}
		},

		pinNote: {
			creator( { noteBucket, note, pin } ) {
				return dispatch => {
					let systemTags = note.data.systemTags || [];
					let pinnedTagIndex = systemTags.indexOf( 'pinned' );

					if ( pin && pinnedTagIndex === -1 ) {
						note.data.systemTags.push( 'pinned' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
					} else if ( !pin && pinnedTagIndex !== -1 ) {
						note.data.systemTags = systemTags.filter( tag => tag !== 'pinned' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
					}
				};
			}
		},

		markdownNote: {
			creator( { noteBucket, note, markdown } ) {
				return dispatch => {
					let systemTags = note.data.systemTags || [];
					let markdownTagIndex = systemTags.indexOf( 'markdown' );

					if ( markdown && markdownTagIndex === -1 ) {
						note.data.systemTags.push( 'markdown' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
					} else if ( !markdown && markdownTagIndex !== -1 ) {
						note.data.systemTags = systemTags.filter( tag => tag !== 'markdown' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
					}
				};
			}
		},

		selectNote( state, { noteId } ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				selectedNoteId: { $set: noteId }
			} );
		},

		noteLoaded( state, { note } ) {
			return update( state, {
				note: { $set: note },
				selectedNoteId: { $set: note.id },
				revisions: { $set: null }
			} );
		},

		closeNote( state ) {
			return update( state, {
				note: { $set: null },
				selectedNoteId: { $set: null }
			} );
		},

		noteUpdated: {
			creator( { noteBucket, noteId, original, data, patch } ) {
				return ( dispatch, getState ) => {
					var state = getState().appState;

					// refresh the notes list
					dispatch( this.action( 'loadNotes', { noteBucket } ) );

					if ( state.selectedNoteId !== noteId || !patch ) {
						return;
					}

					// working is the state of the note in the editor
					let working = state.note.data;

					// diff of working and original will produce the modifications the client has currently made
					let working_diff = simperiumUtil.change.diff( original, working );
					// generate a patch that composes both the working changes and upstream changes
					patch = simperiumUtil.change.transform( working_diff, patch, original );
					// apply the new patch to the upstream data
					let rebased = simperiumUtil.change.apply( patch, data );

					// TODO: determine where the cursor is and put it in the correct place
					// when applying the rebased content

					state.note.data = rebased;
					
					var note = state.note;
					dispatch( this.action( 'updateNoteContent', {
						noteBucket, note, content: note.data.content
					} ) );
				};
			}
		},

		updateNoteContent: {
			creator( { noteBucket, note, content } ) {
				return dispatch => {
					if ( note ) {
						note.data.content = content;

						// update the bucket but don't fire a sync immediately
						noteBucket.update( note.id, note.data, { sync: false } );

						throttle( note.id, typingThrottle, () => {
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
			creator( { noteBucket, tagBucket, note, tags } ) {
				return ( dispatch, getState ) => {
					if ( note ) {
						let state = getState().appState;

						note.data.tags = tags;
						noteBucket.update( note.id, note.data );

						dispatch( this.action( 'selectNote', {
							noteId: note.id
						} ) );

						let currentTagNames = state.tags.map( tag => tag.data.name );
						for ( let i = 0; i < tags.length; i++ ) {
							if ( currentTagNames.indexOf( tags[i] ) === -1 ) {
								dispatch( this.action( 'newTag', {
									tagBucket,
									name: tags[i]
								} ) );
							}
						}
					}
				}
			}
		},

		trashNote: {
			creator( { noteBucket, note } ) {
				return dispatch => {
					if ( note ) {
						note.data.deleted = true;
						noteBucket.update( note.id, note.data );

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
					if ( note ) {
						note.data.deleted = false;
						noteBucket.update( note.id, note.data );

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
					noteBucket.getRevisions( note.id, ( e, revisions ) => {
						if ( e ) {
							return console.warn( 'Failed to load revisions', e );
						}

						dispatch( this.action( 'noteRevisionsLoaded', { revisions } ) );
					} );
				};
			}
		},

		noteRevisionsLoaded( state, { revisions } ) {
			return update( state, {
				revisions: { $set: revisions }
			} );
		},

		toggleNoteInfo( state ) {
			if ( state.showNoteInfo ) {
				return update( state, {
					showNoteInfo: { $set: false }
				} );
			} else if ( state.note != null ) {
				return update( state, {
					showNoteInfo: { $set: true },
					showNavigation: { $set: false },
					editingTags: { $set: false }
				} );
			}
		},

		loadTags: {
			creator( { tagBucket } ) {
				return dispatch => {
					tagBucket.query( db => {
						var tags = [];
						db.transaction( 'tag' ).objectStore( 'tag' ).openCursor( null, 'prev' ).onsuccess = ( e ) => {
							var cursor = e.target.result;
							if ( cursor ) {
								tags.push( cursor.value );
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
			tags = tags.slice();
			tags.sort( ( a, b ) => ( a.data.index | 0 ) - ( b.data.index | 0 ) );

			return update( state, {
				tags: { $set: tags }
			} );
		}
	}
} );
