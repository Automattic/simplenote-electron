import React, { PropTypes } from 'react';
import { Editor, EditorState, ContentState } from 'draft-js';

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

	handleEditorStateChange( editorState ) {
		const contentHasChanged = plainTextContent( editorState )
			!== plainTextContent( this.state.editorState )

		this.setState( { editorState }, () => {
			if ( contentHasChanged ) {
				this.props.onChangeContent( plainTextContent( editorState ) );
			}
		} );
	},

	componentWillReceiveProps( nextProps ) {
		if (
			// if we've received this content before there's nothing to do now
			nextProps.content !== this.props.content
			// if the new content isn't different from what's rendered
			// don't change it because we'd lose the SelectionState
			&& plainTextContent( this.state.editorState ) !== nextProps.content
		) {
			const contentState = ContentState.createFromText( nextProps.content, '\n' );
			this.setState( {
				editorState: EditorState.createWithContent( contentState )
			} );
		}
	},

	focus() {
		if ( !this.state.editorState.getSelection().getHasFocus() ) {
			this.refs.editor.focus();
		}
	},

	render() {
		return (
			<Editor
				ref='editor'
				spellCheck
				stripPastedStyles
				textAlignment='left'
				onChange={this.handleEditorStateChange}
				editorState={this.state.editorState} />
		);
	},

} )
