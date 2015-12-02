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

	onViewRevision: function( revision ) {
		this.setState( { revision: revision } );
	},

	onSelectRevision: function( revision ) {
		console.log( 'Accept revision: ', revision );
	},

	render: function() {
		var { note, revisions } = this.props;
		var revision = this.state.revision || note;
		var tags = revision && revision.data && revision.data.tags || [];

		return (
			<div className="note-editor">
				<NoteToolbar
					note={note}
					onTrashNote={this.props.onTrashNote}
					onRestoreNote={this.props.onRestoreNote}
					onRevisions={this.props.onRevisions}
					onSignOut={this.props.onSignOut}
					onCloseNote={this.props.onCloseNote}
					onNoteInfo={this.props.onNoteInfo} />
				<TagField
					tags={tags}
					onUpdateNoteTags={this.props.onUpdateNoteTags.bind( null, note ) } />
				<div className="note-editor-detail">
					<NoteDetail
						note={revision}
						onChangeContent={this.props.onUpdateContent} />
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
