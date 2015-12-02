import React, { PropTypes } from 'react'
import classNames from 'classnames'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'

export default React.createClass( {

	propTypes: {
		editorMode: PropTypes.oneOf( [ 'edit', 'markdown' ] ),
		note: PropTypes.object,
		revisions: PropTypes.array,
		markdownEnabled: PropTypes.bool,
		onSetEditorMode: PropTypes.func.isRequired,
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
			editorMode: 'edit',
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
		var { note, revisions, markdownEnabled } = this.props;
		var revision = this.state.revision || note;
		var tags = revision && revision.data && revision.data.tags || [];

		markdownEnabled = markdownEnabled && revision &&
			revision.data && revision.data.systemTags &&
			revision.data.systemTags.indexOf( 'markdown' ) !== -1;

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
				{!!markdownEnabled && this.renderModeBar()}
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
	},

	renderModeBar() {
		var { editorMode } = this.props;

		return (
			<div className="note-editor-mode-bar pill-buttons">
				<button type="button"
					className={classNames( 'pill-button', { active: editorMode === 'edit' } )}
					onClick={this.props.onSetEditorMode.bind( null, 'edit' )}>Edit</button>
				<button type="button"
					className={classNames( 'pill-button', { active: editorMode === 'markdown' } )}
					onClick={this.props.onSetEditorMode.bind( null, 'markdown' )}>Preview</button>
			</div>
		);
	}
} );
