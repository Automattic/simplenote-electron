import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import highlight from 'highlight.js';
import marked from 'marked';
import { get, debounce, includes, invoke } from 'lodash';
import analytics from './analytics';
import { viewExternalUrl } from './utils/url-utils';
import NoteContentEditor from './note-content-editor';
import appState from './flux/app-state';
import getNote from './utils/get-note';

const { updateNoteContent } = appState.actionCreators;

const saveDelay = 2000;
const highlighter = code => highlight.highlightAuto( code ).value;

export const NoteDetail = React.createClass( {

	propTypes: {
		note: PropTypes.object,
		isPreviewing: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired
	},

	componentWillMount: function() {
		this.queueNoteSave = debounce( this.saveNote, saveDelay );
	},

	componentDidMount: function() {
		// Ensures note gets saved if user abruptly quits the app
		window.addEventListener( 'beforeunload', this.queueNoteSave.flush );
	},

	saveEditorRef( ref ) {
		this.editor = ref
	},

	isValidNote: function( note ) {
		return note && note.id;
	},

	componentWillReceiveProps: function() {
		this.queueNoteSave.flush();
	},

	componentDidUpdate: function() {
		const { note } = this.props;
		const content = get( note, 'data.content', '' );
		if ( this.isValidNote( note ) && content === '' ) {
			// Let's focus the editor for new and empty notes
			invoke( this, 'editor.focus' );
		}
	},

	componentWillUnmount: function() {
		window.removeEventListener( 'beforeunload', this.queueNoteSave.flush );
	},

	onPreviewClick: function( event ) {
		// open markdown preview links in a new window
		for ( let node = event.target; node != null; node = node.parentNode ) {
			if ( node.tagName === 'A' ) {
				event.preventDefault();
				viewExternalUrl( node.href );
				break;
			}
		}
	},

	saveNote: function( content ) {
		const { note } = this.props;

		if ( ! this.isValidNote( note ) ) return;

		this.props.onChangeContent( note, content );
		analytics.tracks.recordEvent( 'editor_note_edited' );
	},

	render: function() {
		const {
			filter,
			fontSize,
			isPreviewing,
		} = this.props;

		const content = get( this.props, 'note.data.content', '' );
		const divStyle = { fontSize: `${ fontSize }px` };

		return (
			<div className="note-detail">
				{ isPreviewing && (
					<div
						className="note-detail-markdown theme-color-bg theme-color-fg"
						dangerouslySetInnerHTML={ { __html: marked( content, { highlight: highlighter } ) } }
						onClick={ this.onPreviewClick }
						style={ divStyle }
					/>
				) }

				{ ! isPreviewing && (
					<div
						className="note-detail-textarea theme-color-bg theme-color-fg"
						style={ divStyle }
					>
						<NoteContentEditor
							content={ content }
							filter={ filter }
							onChangeContent={ this.queueNoteSave }
							ref={ this.saveEditorRef }
						/>
					</div>
				) }
			</div>
		);
	},
} );

const mapStateToProps = ( {
	appState: state,
	revision: { selectedRevision },
	settings: { fontSize },
} ) => {
	const revision = selectedRevision || getNote( state );
	const isMarkdown = includes( get( revision, 'data.systemTags', '' ), 'markdown' );
	const isPreviewing = isMarkdown && 'markdown' === state.editorMode;
	return {
		filter: state.filter,
		fontSize,
		note: revision,
		isPreviewing,
	};
};

const mapDispatchToProps = ( dispatch, { noteBucket } ) => ( {
	onChangeContent: ( note, content ) =>
		dispatch( updateNoteContent( { noteBucket, note, content } ) ),
} );
export default connect( mapStateToProps, mapDispatchToProps )( NoteDetail );
