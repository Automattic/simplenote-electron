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
import filterNotes from './utils/filter-notes';
import ModeBar from './mode-bar';
import { selectRevision } from './state/revision/actions';

const {
	setShouldPrintNote,
	updateNoteContent,
	updateNoteTags,
} = appState.actionCreators;

export const NoteEditor = React.createClass( {
	propTypes: {
		editorMode: PropTypes.oneOf( [ 'edit', 'markdown' ] ),
		note: PropTypes.object,
		fontSize: PropTypes.number,
		shouldPrint: PropTypes.bool,
		onUpdateContent: PropTypes.func.isRequired,
		onUpdateNoteTags: PropTypes.func.isRequired,
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

	componentWillMount: function() {
		this.props.onCancelRevision();
	},

	componentDidUpdate: function() {
		// Immediately print once `shouldPrint` has been set
		if ( this.props.shouldPrint ) {
			window.print();
			this.props.onNotePrinted();
		}
	},

	render: function() {
		let noteContent = '';
		const {
			editorMode,
			fontSize,
			note,
			noteBucket,
			selectedRevision,
			shouldPrint,
		} = this.props;

		const revision = selectedRevision || note;
		const tags = revision && revision.data && revision.data.tags || [];
		const isTrashed = !!( note && note.data.deleted );

		const markdownEnabled = revision &&
			revision.data && revision.data.systemTags &&
			revision.data.systemTags.indexOf( 'markdown' ) !== -1;

		const classes = classNames( 'note-editor', 'theme-color-bg', 'theme-color-fg', {
			revisions: selectedRevision,
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
				<RevisionSelector noteBucket={ noteBucket } />
				<div className="note-editor-controls theme-color-border">
					<NoteToolbar noteBucket={ noteBucket } />
				</div>
				<div className="note-editor-content theme-color-border">
					{ !! markdownEnabled &&
						<ModeBar />
					}
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
} );

const mapStateToProps = ( {
	appState: state,
	revision: { selectedRevision },
	settings: { fontSize, markdownEnabled },
} ) => {
	const { editorMode, shouldPrint } = state;
	const filteredNotes = filterNotes( state );
	const noteIndex = Math.max( state.previousIndex, 0 );
	const note = state.note ? state.note : filteredNotes[ noteIndex ];
	return {
		editorMode,
		fontSize,
		markdownEnabled,
		note,
		selectedRevision,
		shouldPrint,
	};
};

const mapDispatchToProps = ( dispatch, { noteBucket, tagBucket } ) => ( {
	onCancelRevision: () => dispatch( selectRevision( null ) ),
	onNotePrinted: () =>
		dispatch( setShouldPrintNote( { shouldPrint: false } ) ),
	onUpdateContent: ( note, content ) =>
		dispatch( updateNoteContent( { noteBucket, note, content } ) ),
	onUpdateNoteTags: ( note, tags ) =>
		dispatch( updateNoteTags( { noteBucket, tagBucket, note, tags } ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteEditor );
