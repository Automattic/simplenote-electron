import React, { PropTypes } from 'react';
import marked from 'marked';
import { get, debounce } from 'lodash';
import { Editor, EditorState, ContentState } from 'draft-js';
import analytics from './analytics';
import { viewExternalUrl } from './utils/url-utils';

const saveDelay = 2000;

export default React.createClass( {

	getInitialState: function() {
		return {
			editorState: EditorState.createEmpty(),
		}
	},

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired
	},

	componentWillMount: function() {
		this.queueNoteSave = debounce( this.saveNote, saveDelay );
		this.focus = () => this.refs.editor.focus();
	},

	componentDidMount: function() {
		// Ensures note gets saved if user abruptly quits the app
		window.addEventListener( 'beforeunload', this.queueNoteSave.flush );
		this.readNoteFromProps( this.props );
	},

	isValidNote: function( note ) {
		return note && note.id;
	},

	hasContentChanged( editorState, note ) {
		return get( note, 'data.content', '' )
			!== editorState.getCurrentContent().getPlainText( '\n' )
	},

	handleEditorStateChange( editorState ) {
		this.setState( { editorState } );
		// only queue note save if it was the content that changed
		if ( this.hasContentChanged( editorState, this.props.note ) ) {
			this.queueNoteSave();
		}
	},

	readNoteFromProps( props ) {
		const { note } = props;
		const { editorState } = this.state;
		if (
			this.isValidNote( note )
			&& this.hasContentChanged( editorState, note )
		) {
			const content = get( note, 'data.content', '' );
			const contentState = ContentState.createFromText( content, '\n' )
			this.setState( {
				editorState: EditorState.createWithContent( contentState )
			} )
		}
	},

	componentWillReceiveProps: function( nextProps ) {
		this.queueNoteSave.flush();
		this.readNoteFromProps( nextProps );
	},

	componentDidUpdate: function() {
		const { note } = this.props;
		const content = get( note, 'data.content', '' );
		if ( this.isValidNote( note ) && content === '' ) {
			// Let's focus the editor for new and empty notes
			this.focus();
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
		const { editorState } = this.state;

		if ( ! this.isValidNote( note ) ) return;

		const content = editorState.getCurrentContent().getPlainText( '\n' );
		this.props.onChangeContent( note, content );
		analytics.tracks.recordEvent( 'editor_note_edited' );
	},

	render: function() {
		var { previewingMarkdown, fontSize } = this.props;

		var divStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className="note-detail" onClick={this.focus}>
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
		return (
			<div
				className="note-detail-textarea theme-color-bg theme-color-fg"
				style={ divStyle }>
				<Editor
					textAlignment='left'
					spellCheck
					stripPastedStyles
					ref='editor'
					onChange={this.handleEditorStateChange}
					editorState={this.state.editorState} />
			</div>
		);
	}

} )
