import React, { Component, PropTypes } from 'react';
import Textarea from 'react-textarea-autosize';
import analytics from './analytics';
import marked from 'marked';
import { get, debounce, invoke } from 'lodash';
import { viewExternalUrl } from './utils/url-utils';

const saveDelay = 2000;

const isValidNote = note => note && note.id;
const prependTab = l => `\t${ l }`;
const removeLeadingTab = l => l[0] === '\t' ? l.substring( 1 ) : l;

export default class NoteDetail extends Component {
	static propTypes = {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired
	};

	constructor( props ) {
		super( props );

		this.storeNoteEditor = r => this.noteEditor = r;
		this.queueNoteSave = debounce( this.saveNote, saveDelay );
	}

	componentDidMount = () => {
		// Ensures note gets saved if user abruptly quits the app
		window.addEventListener( 'beforeunload', this.queueNoteSave.flush );
		window.addEventListener( 'keydown', this.interceptTabPresses );
	};

	componentWillReceiveProps = () => {
		this.queueNoteSave.flush();
	};

	componentDidUpdate = () => {
		const { note } = this.props;
		const content = get( note, 'data.content', '' );
		if ( isValidNote( note ) && this.noteEditor ) {
			this.noteEditor.value = content;

			// Let's focus the editor for new and empty notes
			if ( content === '' ) {
				invoke( this.noteEditor, 'focus' );
			}
		}
	};

	componentWillUnmount = () => {
		window.removeEventListener( 'beforeunload', this.queueNoteSave.flush );
		window.removeEventListener( 'keydown', this.interceptTabPresses );
	};

	interceptTabPresses = event => {
		if (
			'Tab' !== event.code ||
			! this.noteEditor ||
			'TEXTAREA' !== event.target.nodeName ||
			this.props.previewingMarkdown ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const {
			selectionStart,
			selectionEnd,
			value,
		} = this.noteEditor;

		// if inserting at a cursor position
		if ( ! event.shiftKey && selectionStart === selectionEnd ) {
			return document.execCommand( 'insertText', false, '\t' );
		}

		return event.shiftKey
			? this.transformSelectedLines( removeLeadingTab )
			: this.transformSelectedLines( prependTab );
	};

	onPreviewClick = event => {
		// open markdown preview links in a new window
		for ( let node = event.target; node != null; node = node.parentNode ) {
			if ( node.tagName === 'A' ) {
				event.preventDefault();
				viewExternalUrl( node.href );
				break;
			}
		}
	};

	saveNote = () => {
		const {
			note,
			onChangeContent,
		} = this.props;

		if ( ! isValidNote( note ) ) {
			return;
		}

		onChangeContent( note, this.noteEditor.value );
		analytics.tracks.recordEvent( 'editor_note_edited' );
	};

	transformSelectedLines = transform => {
		const {
			selectionStart,
			selectionEnd,
			value,
		} = this.noteEditor;

		const firstLineStart = value.lastIndexOf( '\n', selectionStart ) + 1;
		const lastLineEnd = Math.max( value.indexOf( '\n', selectionEnd ), 0 ) || value.length;

		this.noteEditor.selectionStart = firstLineStart;
		this.noteEditor.selectionEnd = lastLineEnd;

		const indented = this
			.noteEditor
			.value
			.substring( firstLineStart, lastLineEnd )
			.split( '\n' )
			.map( transform )
			.join( '\n' );

		document.execCommand( 'insertText', false, indented );

		this.noteEditor.selectionStart = firstLineStart;
	};

	render = () => {
		var {
			fontSize,
			note,
			previewingMarkdown,
		} = this.props;

		const divStyle = { fontSize: fontSize + 'px' };

		return (
			<div className="note-detail">
				{ previewingMarkdown &&
					<div
						className="note-detail-markdown theme-color-bg theme-color-fg"
						dangerouslySetInnerHTML={ { __html: marked( get( note, 'data.content', '' ) ) } }
						onClick={ this.onPreviewClick }
						style={ divStyle }
					/>
				}
				{ ! previewingMarkdown &&
					<Textarea
						ref={ this.storeNoteEditor }
						className="note-detail-textarea theme-color-bg theme-color-fg"
						disabled={ !! ( note && note.data.deleted ) }
						onChange={ this.queueNoteSave }
						style={ divStyle }
					/>
				}
			</div>
		);
	};
};
