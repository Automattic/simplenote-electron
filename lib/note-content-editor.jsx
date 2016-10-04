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
		const { editorState } = this.state;

		if ( newContent === oldContent ) {
			return; // identical to previous `content` prop
		}

		if ( newContent === plainTextContent( editorState ) ) {
			return; // identical to rendered content
		}

		this.setState( {
			editorState: EditorState.createWithContent(
				ContentState.createFromText( newContent, '\n' )
			)
		} );
	},

	focus() {
		if ( !this.state.editorState.getSelection().getHasFocus() ) {
			invoke( this, 'editor.focus' );
		}
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
