import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'
import marked from 'marked'
import { get, property } from 'lodash'
import appState from './flux/app-state';
import { tracks } from './analytics'
import filterNotes from './utils/filter-notes';

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
		onRevisions: PropTypes.func.isRequired,
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
		const { editorMode, note, revisions, fontSize, shouldPrint, noteBucket } = this.props;
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
						noteBucket={ noteBucket }
						setIsViewingRevisions={this.setIsViewingRevisions}
					/>
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

const {
	noteRevisions,
	setEditorMode,
	setShouldPrintNote,
	updateNoteContent,
	updateNoteTags,
} = appState.actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ( {
	appState: state,
	settings: { fontSize, markdownEnabled },
} ) => {
	const { editorMode, revisions, shouldPrint } = state;
	const filteredNotes = filterNotes( state );
	const noteIndex = Math.max( state.previousIndex, 0 );
	const note = state.note ? state.note : filteredNotes[ noteIndex ];
	return {
		editorMode,
		fontSize,
		markdownEnabled,
		note,
		revisions,
		shouldPrint,
	};
};

const mapDispatchToProps = ( dispatch, { noteBucket, tagBucket } ) => ( {
	onNotePrinted: () =>
		dispatch( setShouldPrintNote( { shouldPrint: false } ) ),
	onRevisions: note => {
		dispatch( noteRevisions( { noteBucket, note } ) );
		recordEvent( 'editor_versions_accessed' );
	},
	onSetEditorMode: mode =>
		dispatch( setEditorMode( { mode } ) ),
	onUpdateContent: ( note, content ) =>
		dispatch( updateNoteContent( { noteBucket, note, content } ) ),
	onUpdateNoteTags: ( note, tags ) =>
		dispatch( updateNoteTags( { noteBucket, tagBucket, note, tags } ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteEditor );
