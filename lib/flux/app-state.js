import { partition } from 'lodash';
import update from 'react-addons-update'
import ActionMap from './action-map'
import throttle from '../utils/throttle'
import analytics from '../analytics'
import { util as simperiumUtil } from 'simperium'

const typingThrottle = 3000;

var actionMap = new ActionMap( {
	namespace: 'App',

	initialState: {
		editorMode: 'edit',
		selectedNoteId: null,
		previousIndex: -1,
		notes: [],
		tags: [],
		showTrash: false,
		listTitle: 'All Notes',
		showNavigation: false,
		showNoteInfo: false,
		editingTags: false,
		dialogs: [],
		nextDialogKey: 0,
		shouldPrint: false,
		searchFocus: false
	},

	handlers: {
		authChanged( state ) {
			return update( state, {
				notes: { $set: [] },
				tags: { $set: [] },
				dialogs: { $set: [] }
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
				tag: { $set: null },
				note: { $set: null },
				selectedNoteId: { $set: null },
				previousIndex: { $set: -1 }
			} );
		},

		selectTrash( state ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				showTrash: { $set: true },
				listTitle: { $set: 'Trash' },
				tag: { $set: null },
				note: { $set: null },
				selectedNoteId: { $set: null },
				previousIndex: { $set: -1 }
			} );
		},

		selectTag( state, { tag } ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				showTrash: { $set: false },
				listTitle: { $set: tag.data.name },
				tag: { $set: tag },
				note: { $set: null },
				selectedNoteId: { $set: null },
				previousIndex: { $set: -1 }
			} );
		},

		setEditorMode( state, { mode } ) {
			return update( state, {
				editorMode: { $set: mode }
			} );
		},

		showDialog( state, { dialog, params } ) {
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
				dialogs: { $push: [{ ...dialog, params, key: state.nextDialogKey }] },
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
					const state = getState().appState;
					const settings = getState().settings;
					const timestamp = ( new Date() ).getTime() / 1000;

					if ( state.showTrash ) {
						dispatch( this.action( 'selectAllNotes' ) );
					}

					// insert a new note into the store and select it
					noteBucket.add( {
						content: '',
						deleted: false,
						systemTags: settings.markdownEnabled ? [ 'markdown' ] : [],
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
				return ( dispatch, getState ) => {
					const settings = getState().settings;
					const { sortType, sortReversed } = settings;
					var sortOrder;

					if ( sortType === 'alphabetical' ) {
						sortOrder = sortReversed ? 'prev' : 'next';
					} else {
						sortOrder = sortReversed ? 'next' : 'prev';
					}

					noteBucket.query( db => {
						var notes = [];
						db.transaction( 'note' ).objectStore( 'note' ).index( sortType ).openCursor( null, sortOrder ).onsuccess = ( e ) => {
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
			const [ pinned, notPinned ] = partition( notes, note => note.pinned );

			return update( state, {
				notes: { $set: [ ...pinned, ...notPinned ] }
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

		setShouldPrintNote( state, { shouldPrint = true } ) {
			return update( state, {
				shouldPrint: { $set: shouldPrint }
			} );
		},

		setSearchFocus( state, { searchFocus = true } ) {
			return update( state, {
				searchFocus: { $set: searchFocus }
			} );
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

		publishNote: {
			creator( { noteBucket, note, publish } ) {
				return dispatch => {
					let systemTags = note.data.systemTags || [];
					let tagIndex = systemTags.indexOf( 'published' );

					if ( publish && tagIndex === -1 ) {
						note.data.systemTags.push( 'published' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
						analytics.tracks.recordEvent( 'editor_note_published' );
					} else if ( !publish && tagIndex !== -1 ) {
						note.data.systemTags = systemTags.filter( tag => tag !== 'published' );
						noteBucket.update( note.id, note.data );
						dispatch( this.action( 'noteLoaded', { note } ) );
						analytics.tracks.recordEvent( 'editor_note_unpublished' );
					}
				};
			}
		},

		selectNote( state, { noteId } ) {
			return update( state, {
				showNavigation: { $set: false },
				editingTags: { $set: false },
				selectedNoteId: { $set: noteId },
				revisions: { $set: null }
			} );
		},

		noteLoaded( state, { note } ) {
			return update( state, {
				note: { $set: note },
				selectedNoteId: { $set: note.id },
				revisions: { $set: null }
			} );
		},

		closeNote( state, { previousIndex = -1 } ) {
			return update( state, {
				note: { $set: null },
				selectedNoteId: { $set: null },
				previousIndex: { $set: previousIndex }
			} );
		},

		noteUpdated: {
			creator( { noteBucket, noteId, original, data, patch, isIndexing } ) {
				return ( dispatch, getState ) => {
					var state = getState().appState;

					if ( isIndexing ) {
						// Increase index counter
						this.indexCtr++;
					} else if ( this.indexCtr > 0 ) {
						// completed indexing, reset counter
						this.indexCtr = 0;
					}

					// Refresh the notes list. Rate limit if indexing
					if ( !isIndexing || ( isIndexing && this.indexCtr % 30 === 0 ) ) {
						dispatch( this.action( 'loadNotes', { noteBucket } ) );
					}

					if ( state.selectedNoteId !== noteId || !patch ) {
						return;
					}

					// working is the state of the note in the editor
					const note = state.notes.find( n => n.id === noteId );

					if ( ! note ) {
						console.error( `Cannot find note (id=${noteId})!` );
						return;
					}

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
						note.data.modificationDate = Math.floor( Date.now() / 1000 );

						// update the bucket and sync
						noteBucket.update( note.id, note.data );

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
							let tag = tags[i];

							if ( currentTagNames.indexOf( tag ) !== -1 ) {
								continue;
							}

							if ( tag.indexOf( '@' ) !== -1 ) {
								continue;
							}

							dispatch( this.action( 'newTag', {
								tagBucket,
								name: tag
							} ) );
						}
					}
				}
			}
		},

		trashNote: {
			creator( { noteBucket, note, previousIndex } ) {
				return dispatch => {
					if ( note ) {
						note.data.deleted = true;
						noteBucket.update( note.id, note.data );

						dispatch( this.action( 'closeNote', { previousIndex } ) );
					}
				};
			}
		},

		restoreNote: {
			creator( { noteBucket, note, previousIndex } ) {
				return dispatch => {
					if ( note ) {
						note.data.deleted = false;
						noteBucket.update( note.id, note.data );

						dispatch( this.action( 'closeNote', { previousIndex } ) );
					}
				};
			}
		},

		deleteNoteForever: {
			creator( { noteBucket, note, previousIndex } ) {
				return dispatch => {
					noteBucket.remove( note.id );

					dispatch( this.action( 'closeNote', { previousIndex } ) );
					dispatch( this.action( 'loadNotes', { noteBucket } ) );
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

		emptyTrash: {
			creator( { noteBucket } ) {
				return ( dispatch, getState ) => {
					const state = getState().appState;
					const [ deleted, notes ] = partition( state.notes, note => note.data.deleted );

					dispatch( this.action( 'closeNote' ) );
					deleted.forEach( note => noteBucket.remove( note.id ) );
					dispatch( this.action( 'notesLoaded', { notes } ) );
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
			}

			return update( state, {
				showNoteInfo: { $set: true },
				showNavigation: { $set: false },
				editingTags: { $set: false }
			} );
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

actionMap.indexCtr = 0;

export default actionMap;
