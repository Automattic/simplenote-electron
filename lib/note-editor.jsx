import React, { PropTypes } from 'react'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		revisions: PropTypes.array,
		onUpdateContent: PropTypes.func.isRequired,
		onUpdateNoteTags: PropTypes.func.isRequired,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onRevisions: PropTypes.func.isRequired,
		onSignOut: PropTypes.func.isRequired,
		onCloseNote: PropTypes.func.isRequired,
		onNoteInfo: PropTypes.func.isRequired
	},

	getDefaultProps: function() {
		return {
			note: {
				data: {
					tags: []
				}
			}
		};
	},

	componentWillReceiveProps: function() {
		this.setState( { revision: null } );
	},

	getInitialState: function() {
		return {
			revision: null
		}
	},

	withNote: function( fn ) {
		var note = this.props.note;
		return function() {
			var args = [note].concat( [].slice.call( arguments ) );
			fn.apply( null, args );
		};
	},

	onViewRevision: function( revision ) {
		this.setState( { revision: revision } );
	},

	onSelectRevision: function( revision ) {
		console.log( 'Accept revision: ', revision );
	},

	render: function() {
		var revisions = this.props.revisions;
		var note = this.state.revision ? this.state.revision : this.props.note;
		var tags = note && note.data && note.data.tags ? note.data.tags : [];
		return (
			<div className="note-editor">
				<NoteToolbar
					note={this.props.note}
					onTrashNote={this.props.onTrashNote}
					onRestoreNote={this.props.onRestoreNote}
					onRevisions={this.props.onRevisions}
					onSignOut={this.props.onSignOut}
					onCloseNote={this.props.onCloseNote}
					onNoteInfo={this.props.onNoteInfo} />
				<TagField ref="tags"
					tags={tags}
					onUpdateNoteTags={this.withNote( this.props.onUpdateNoteTags ) } />
				<div className="note-editor-detail">
					<NoteDetail ref="detail"
						note={note}
						onChangeContent={this.withNote( this.props.onUpdateContent ) } />
				</div>
				{!!revisions &&
					<RevisionSelector
						revisions={revisions}
						onViewRevision={this.onViewRevision}
						onSelectRevision={this.onSelectRevision} />
				}
			</div>
		)
	}
} );
