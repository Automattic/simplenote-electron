import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'
import marked from 'marked'
import { get, property } from 'lodash'

export const NoteEditor = React.createClass( {
	propTypes: {
		editorMode: PropTypes.oneOf( [ 'edit', 'markdown' ] ),
		note: PropTypes.object,
		revisions: PropTypes.array,
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

	setEditorMode( event ) {
		const editorMode = get( event, 'target.dataset.editorMode' );

		if ( ! editorMode ) {
			return;
		}

		this.props.onSetEditorMode( editorMode );
	},

	setIsViewingRevisions: function( isViewing ) {
		this.setState( { isViewingRevisions: isViewing } );
	},

	render: function() {
		let noteContent = '';
		const { editorMode, note, revisions, fontSize, shouldPrint } = this.props;
		const revision = this.state.revision || note;
		const isViewingRevisions = this.state.isViewingRevisions;
		const tags = revision && revision.data && revision.data.tags || [];
		const isTrashed = !!( note && note.data.deleted );

		const markdownEnabled = revision &&
			revision.data && revision.data.systemTags &&
			revision.data.systemTags.indexOf( 'markdown' ) !== -1;

		const classes = classNames( 'note-editor', 'theme-color-bg', 'theme-color-fg', {
			revisions: isViewingRevisions,
			markdown: markdownEnabled
		} );

		if ( shouldPrint ) {
			const content = get( revision, 'data.content', '' );
			noteContent = markdownEnabled ? marked( content ) : content;
		}

		const printStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className={classes}>
				<RevisionSelector
					revisions={revisions || []}
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
							filter={this.props.filter}
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
						allTags={ this.props.allTags.map( property( 'data.name' ) ) }
						tags={tags}
						onUpdateNoteTags={this.props.onUpdateNoteTags.bind( null, note ) } />
				}
			</div>
		)
	},

	renderModeBar() {
		const { editorMode } = this.props;

		const isPreviewing = ( editorMode === 'markdown' );

		return (
			<div className="note-editor-mode-bar segmented-control">
				<button type="button"
					className={ classNames(
						'button button-segmented-control button-compact',
						{ active: ! isPreviewing },
					) }
					data-editor-mode="edit"
					onClick={ this.setEditorMode }
				>
					Edit
				</button>
				<button type="button"
					className={ classNames(
						'button button-segmented-control button-compact',
						{ active: isPreviewing },
					) }
					data-editor-mode="markdown"
					onClick={ this.setEditorMode }
				>
					Preview
				</button>
			</div>
		);
	}
} );

const mapStateToProps = ( { settings } ) => ( {
	fontSize: settings.fontSize,
	markdownEnabled: settings.markdownEnabled
} );

export default connect( mapStateToProps )( NoteEditor );
