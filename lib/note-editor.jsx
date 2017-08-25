import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames'
import showdown from 'showdown';
import xssFilter from 'showdown-xss-filter';
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'
import { get, property } from 'lodash'
import getActiveNote from './utils/get-active-note';

const markdownConverter = new showdown.Converter( { extensions: [ xssFilter ] } );
markdownConverter.setFlavor( 'github' );

export const NoteEditor = React.createClass( {
	propTypes: {
		editorMode: PropTypes.oneOf( [ 'edit', 'markdown' ] ),
		note: PropTypes.object,
		fontSize: PropTypes.number,
		shouldPrint: PropTypes.bool,
		onSetEditorMode: PropTypes.func.isRequired,
		onUpdateContent: PropTypes.func.isRequired,
		onUpdateNoteTags: PropTypes.func.isRequired,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onShareNote: PropTypes.func.isRequired,
		onDeleteNoteForever: PropTypes.func.isRequired,
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

	componentDidUpdate: function() {
		// Immediately print once `shouldPrint` has been set
		if ( this.props.shouldPrint ) {
			window.print();
			this.props.onNotePrinted();
		}
	},

	setEditorMode( event ) {
		const editorMode = get( event, 'target.dataset.editorMode' );

		if ( ! editorMode ) {
			return;
		}

		this.props.onSetEditorMode( editorMode );
	},

	render: function() {
		let noteContent = '';
		const {
			editorMode,
			note,
			selectedRevision,
			fontSize,
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
			noteContent = markdownEnabled ? markdownConverter.makeHtml( content ) : content;
		}

		const printStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className={classes}>
				<RevisionSelector
					onUpdateContent={this.props.onUpdateContent}
				/>
				<div className="note-editor-controls theme-color-border">
					<NoteToolbar
						noteBucket={ this.props.noteBucket }
						onTrashNote={this.props.onTrashNote}
						onRestoreNote={this.props.onRestoreNote}
						onShareNote={this.props.onShareNote}
						onDeleteNoteForever={this.props.onDeleteNoteForever}
						onCloseNote={this.props.onCloseNote}
						onNoteInfo={this.props.onNoteInfo} />
				</div>
				<div className="note-editor-content theme-color-border">
					{!!markdownEnabled && this.renderModeBar()}
					<div className="note-editor-detail">
						<NoteDetail
							filter={this.props.filter}
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

const mapStateToProps = ( {
	appState: state,
	revision: { selectedRevision },
	settings,
} ) => {
	const revision = selectedRevision || getActiveNote( state );
	return {
		fontSize: settings.fontSize,
		markdownEnabled: settings.markdownEnabled,
		note: revision,
		selectedRevision,
	};
};

export default connect( mapStateToProps )( NoteEditor );
