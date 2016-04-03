import React, { PropTypes } from 'react';
import marked from 'marked';
import Textarea from 'react-textarea-autosize';
import { noop, get, debounce } from 'lodash';
import analytics from './analytics';
import { viewExternalUrl } from './utils/url-utils';

const uninitializedNoteEditor = { focus: noop };
const saveDelay = 2000;

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired
	},

	componentWillMount: function() {
		this.queueNoteSave = debounce( this.saveNote, saveDelay );
		this.noteEditor = uninitializedNoteEditor;
	},

	componentDidMount: function() {
		// Ensures note gets saved if user abruptly quits the app
		window.addEventListener( 'beforeunload', this.queueNoteSave.flush );
	},

	initializeNoteEditor: function( noteEditor ) {
		this.noteEditor = noteEditor;
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
		if ( this.isValidNote( note ) && this.noteEditor ) {
			this.noteEditor.value = content;

			// Let's focus the editor for new and empty notes
			if ( content === '' ) {
				this.noteEditor.focus();
			}
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

	saveNote: function() {
		const { note } = this.props;

		if ( ! this.isValidNote( note ) ) return;

		this.props.onChangeContent( note, this.noteEditor.value );
		analytics.tracks.recordEvent( 'editor_note_edited' );
	},

	render: function() {
		var { previewingMarkdown, fontSize } = this.props;

		var divStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className="note-detail">
				{previewingMarkdown ?
					this.renderMarkdown( divStyle )
				:
					this.renderEditable( divStyle )
				}
			</div>
		);
	},

	renderMarkdown( divStyle ) {
		const { content = '' } = this.props.note.data;
		const markdownHTML = marked( content );

		return (
			<div className="note-detail-markdown theme-color-bg theme-color-fg"
				dangerouslySetInnerHTML={ { __html: markdownHTML } }
				onClick={ this.onPreviewClick }
				style={ divStyle } />
		);
	},

	renderEditable( divStyle ) {
		const note = this.props.note;

		return (
			<Textarea ref={ this.initializeNoteEditor } className="note-detail-textarea theme-color-bg theme-color-fg"
				disabled={ !!( note && note.data.deleted ) }
				onChange={ this.queueNoteSave }
				style={ divStyle } />
		);
	}

} )
