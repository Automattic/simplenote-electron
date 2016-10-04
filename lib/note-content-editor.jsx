import React, { PropTypes } from 'react';
import { Editor, EditorState, ContentState } from 'draft-js';
import { invoke } from 'lodash';

function plainTextContent( editorState ) {
	return editorState.getCurrentContent().getPlainText( '\n' )
}

export default React.createClass( {

	propTypes: {
		content: PropTypes.string.isRequired,
		onChangeContent: PropTypes.func.isRequired
	},

	getInitialState() {
		const { content } = this.props;
		const contentState = ContentState.createFromText( content, '\n' );
		return {
			editorState: EditorState.createWithContent( contentState )
		}
	},

	saveEditorRef( ref ) {
		this.editor = ref
	},

	handleEditorStateChange( editorState ) {
		const contentHasChanged = plainTextContent( editorState )
			!== plainTextContent( this.state.editorState )

		this.setState( { editorState }, () => {
			if ( contentHasChanged ) {
				this.props.onChangeContent( plainTextContent( editorState ) );
			}
		} );
	},

	componentWillReceiveProps( { content: newContent } ) {
		const { content: oldContent } = this.props;
		const { editorState: oldEditorState } = this.state;

		if ( newContent === oldContent ) {
			return; // identical to previous `content` prop
		}

		if ( newContent === plainTextContent( oldEditorState ) ) {
			return; // identical to rendered content
		}

		let newEditorState = EditorState.createWithContent(
			ContentState.createFromText( newContent, '\n' )
		)

		// avoids weird caret position if content is changed
		// while the editor had focus (see
		// https://github.com/facebook/draft-js/issues/410#issuecomment-223408160)
		if ( oldEditorState.getSelection().getHasFocus() ) {
			newEditorState = EditorState.moveFocusToEnd( newEditorState )
		}

		this.setState( { editorState: newEditorState } );
	},

	focus() {
		invoke( this, 'editor.focus' );
	},

	render() {
		return (
			<Editor
				ref={this.saveEditorRef}
				spellCheck
				stripPastedStyles
				onChange={this.handleEditorStateChange}
				editorState={this.state.editorState} />
		);
	},

} )
