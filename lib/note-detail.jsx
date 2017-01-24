import React, { PropTypes } from 'react';
import highlight from 'highlight.js';
import marked from 'marked';
import { get, debounce, invoke } from 'lodash';
import analytics from './analytics';
import { viewExternalUrl } from './utils/url-utils';
import NoteContentEditor from './note-content-editor';

const saveDelay = 2000;
const highlighter = code => highlight.highlightAuto( code ).value;

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
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
			previewingMarkdown,
		} = this.props;

		const content = get( this.props, 'note.data.content', '' );
		const divStyle = { fontSize: `${ fontSize }px` };

		return (
			<div className="note-detail">
				{ previewingMarkdown && (
					<div
						className="note-detail-markdown theme-color-bg theme-color-fg"
						dangerouslySetInnerHTML={ { __html: marked( content, { highlight: highlighter } ) } }
						onClick={ this.onPreviewClick }
						style={ divStyle }
					/>
				) }

				{ ! previewingMarkdown && (
					<div
						className="note-detail-textarea theme-color-bg theme-color-fg"
						style={ divStyle }
					>
						<NoteContentEditor
							ref={ this.saveEditorRef }
							content={ content }
							filter={ filter }
							onChangeContent={ this.queueNoteSave }
						/>
					</div>
				) }
			</div>
		);
	},
} );
