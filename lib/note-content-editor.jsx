import React, { PropTypes } from 'react';
import {
	Editor, EditorState, ContentState, SelectionState, Modifier
} from 'draft-js';
import { invoke, noop } from 'lodash';

function plainTextContent( editorState ) {
	return editorState.getCurrentContent().getPlainText( '\n' )
}

const EditorStateModifier = {
	insertText( editorState, selection, characters ) {
		return EditorState.push(
			editorState,
			Modifier.insertText(
				editorState.getCurrentContent(), selection, characters
			),
			'insert-characters'
		);
	},

	removeRange( editorState, selection = editorState.getSelection() ) {
		return EditorState.push(
			editorState,
			Modifier.removeRange( editorState.getCurrentContent(), selection ),
			'remove-range'
		);
	},
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

	onTab = ( e ) => {
		// prevent moving focus to next input
		e.preventDefault()

		let editorState = this.state.editorState;
		const selection = editorState.getSelection();

		if ( !selection.isCollapsed() ) {
			return
		}

		const content = editorState.getCurrentContent();
		const selectionStart = selection.getStartOffset();
		const block = content.getBlockForKey( selection.getFocusKey() );
		const line = block.getText();

		const atStart = line.trim() === '-' || line.trim() === '*';

		if ( !e.shiftKey ) {
			// inserting a tab character

			const offset = atStart ? 0 : selectionStart

			// add tab
			editorState = EditorStateModifier.insertText(
				editorState,
				SelectionState.createEmpty( block.getKey() ).merge( {
					anchorOffset: offset,
					focusOffset: offset,
				} ),
				'\t'
			);

			// move selection to where it was
			editorState = EditorState.forceSelection(
				editorState,
				SelectionState.createEmpty( block.getKey() ).merge( {
					anchorOffset: selectionStart + 1, // +1 because 1 char was added
					focusOffset: selectionStart + 1,
				} )
			);
		} else {
			// outdenting

			const rangeStart = atStart ? 0 : selectionStart - 1;
			const rangeEnd = atStart ? 1 : selectionStart;
			const prevChar = block.getText().slice( rangeStart, rangeEnd );

			if ( prevChar === '\t' ) {
				// remove tab
				editorState = EditorStateModifier.removeRange(
					editorState,
					SelectionState.createEmpty( block.getKey() ).merge( {
						anchorOffset: rangeStart,
						focusOffset: rangeEnd,
					} )
				);

				// move selection to where it was
				editorState = EditorState.forceSelection(
					editorState,
					SelectionState.createEmpty( block.getKey() ).merge( {
						anchorOffset: selectionStart - 1, // -1 because 1 char was removed
						focusOffset: selectionStart - 1,
					} )
				);
			}
		}

		this.handleEditorStateChange( editorState );
	}

	render() {
		return (
			<Editor
				ref={this.saveEditorRef}
				spellCheck
				stripPastedStyles
				onChange={this.handleEditorStateChange}
				editorState={this.state.editorState}
				onTab={this.onTab}
			/>
		);
	}
}
