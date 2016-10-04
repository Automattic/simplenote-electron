import React, { PropTypes } from 'react';
import { Editor, EditorState, ContentState } from 'draft-js';
import { invoke, noop } from 'lodash';

function plainTextContent( editorState ) {
	return editorState.getCurrentContent().getPlainText( '\n' )
}

export default class NoteContentEditor extends React.Component {
	static propTypes = {
		content: PropTypes.string.isRequired,
		onChangeContent: PropTypes.func.isRequired
	}

	state = {
		editorState: EditorState.createWithContent(
			ContentState.createFromText( this.props.content, '\n' )
		)
	}

	saveEditorRef = ( ref ) => {
		this.editor = ref
	}

	handleEditorStateChange = ( editorState ) => {
		const nextContent = plainTextContent( editorState );
		const prevContent = plainTextContent( this.state.editorState );

		const announceChanges = nextContent !== prevContent
			? () => this.props.onChangeContent( nextContent )
			: noop;

		this.setState( { editorState }, announceChanges );
	}

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
		// while the editor had focus, see
		// https://github.com/facebook/draft-js/issues/410#issuecomment-223408160
		if ( oldEditorState.getSelection().getHasFocus() ) {
			newEditorState = EditorState.moveFocusToEnd( newEditorState )
		}

		this.setState( { editorState: newEditorState } );
	}

	focus = () => {
		invoke( this, 'editor.focus' );
	}

	render() {
		return (
			<Editor
				ref={this.saveEditorRef}
				spellCheck
				stripPastedStyles
				onChange={this.handleEditorStateChange}
				editorState={this.state.editorState}
			/>
		);
	}
}
