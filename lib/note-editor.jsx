import React, { PropTypes } from 'react'
import classNames from 'classnames'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'
import marked from 'marked'
import { unbold } from './note-display-mixin'
import { get } from 'lodash'

export default React.createClass( {

	propTypes: {
		editorMode: PropTypes.oneOf( [ 'edit', 'markdown' ] ),
		note: PropTypes.object,
		revisions: PropTypes.array,
		markdownEnabled: PropTypes.bool,
		fontSize: PropTypes.number,
		shouldPrint: PropTypes.bool,
		onSetEditorMode: PropTypes.func.isRequired,
		onUpdateContent: PropTypes.func.isRequired,
		onUpdateNoteTags: PropTypes.func.isRequired,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onShareNote: PropTypes.func.isRequired,
		onDeleteNoteForever: PropTypes.func.isRequired,
		onRevisions: PropTypes.func.isRequired,
		onCloseNote: PropTypes.func.isRequired,
		onNoteInfo: PropTypes.func.isRequired,
		onPrintNote: PropTypes.func
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
			revision: null,
			isViewingRevisions: false
		}
	},

	componentDidUpdate: function() {
		// Immediately print once `shouldPrint` has been set
		if ( this.props.shouldPrint ) {
			window.print();
			this.props.onNotePrinted();
		}
	},

	onViewRevision: function( revision ) {
		this.setState( { revision: revision } );
	},

	onSelectRevision: function( revision ) {
		if ( ! revision ) {
			return;
		}

		const { note, onUpdateContent } = this.props;
		const { data: { content } } = revision;

		onUpdateContent( note, content );
		this.setIsViewingRevisions( false );
	},

	onCancelRevision: function() {
		// clear out the revision
		this.setState( { revision: null } );
		this.setIsViewingRevisions( false );
	},

	setIsViewingRevisions: function( isViewing ) {
		this.setState( { isViewingRevisions: isViewing } );
	},

	render: function() {
		var { editorMode, note, revisions, markdownEnabled, fontSize, shouldPrint } = this.props;
		var noteContent = '';
		const revision = this.state.revision || note;
		const isViewingRevisions = this.state.isViewingRevisions;
		const tags = revision && revision.data && revision.data.tags || [];
		const isTrashed = !!( note && note.data.deleted );

		markdownEnabled = markdownEnabled && revision &&
			revision.data && revision.data.systemTags &&
			revision.data.systemTags.indexOf( 'markdown' ) !== -1;

		const classes = classNames( 'note-editor', 'theme-color-bg', 'theme-color-fg', {
			revisions: isViewingRevisions,
			markdown: markdownEnabled
		} );

		if ( shouldPrint ) {
			const content = get( revision, 'data.content', '' );
			noteContent = markdownEnabled ? marked( unbold( content ) ) : content;
		}

		const printStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className={classes}>
				<RevisionSelector
					revisions={revisions}
					onViewRevision={this.onViewRevision}
					onSelectRevision={this.onSelectRevision}
					onCancelRevision={this.onCancelRevision} />
				<div className="note-editor-controls theme-color-border">
					<NoteToolbar
						note={note}
						onTrashNote={this.props.onTrashNote}
						onRestoreNote={this.props.onRestoreNote}
						onShareNote={this.props.onShareNote}
						onDeleteNoteForever={this.props.onDeleteNoteForever}
						onRevisions={this.props.onRevisions}
						setIsViewingRevisions={this.setIsViewingRevisions}
						onCloseNote={this.props.onCloseNote}
						onNoteInfo={this.props.onNoteInfo} />
				</div>
				<div className="note-editor-content theme-color-border">
					{!!markdownEnabled && this.renderModeBar()}
					<div className="note-editor-detail">
						<NoteDetail
							note={revision}
							previewingMarkdown={markdownEnabled && editorMode === 'markdown'}
							onChangeContent={this.props.onUpdateContent}
							fontSize={fontSize} />
					</div>
				</div>
				{ shouldPrint &&
					<div style={printStyle} className="note-print note-detail-markdown"
					dangerouslySetInnerHTML={ { __html: noteContent } } />
				}
				{ ! isTrashed &&
					<TagField
						tags={tags}
						onUpdateNoteTags={this.props.onUpdateNoteTags.bind( null, note ) } />
				}
			</div>
		)
	},

	renderModeBar() {
		var { editorMode } = this.props;

		return (
			<div className="note-editor-mode-bar segmented-control">
				<button type="button"
					className={classNames( 'button button-segmented-control button-compact', { active: editorMode === 'edit' } )}
					onClick={this.props.onSetEditorMode.bind( null, 'edit' )}>Edit</button>
				<button type="button"
					className={classNames( 'button button-segmented-control button-compact', { active: editorMode === 'markdown' } )}
					onClick={this.props.onSetEditorMode.bind( null, 'markdown' )}>Preview</button>
			</div>
		);
	}
} );
