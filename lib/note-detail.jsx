import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import marked from 'marked';
import Textarea from 'react-textarea-autosize';
import { noop, get } from 'lodash';

const uninitializedNoteEditor = { focus: noop };

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired,
		onScrollToBottom: PropTypes.func.isRequired
	},

	getInitialState: function() {
		var note = this.props.note;

		return {
			content: get( note, 'data.content', '' )
		};
	},

	componentWillMount: function() {
		this.noteEditor = uninitializedNoteEditor;
	},

	componentDidMount: function() {
		this.noteDetailNode = ReactDOM.findDOMNode( this.refs.noteDetail );
	},

	initializeNoteEditor: function( noteEditor ) {
		this.noteEditor = noteEditor;
	},

	handleScroll: function() {
		const noteDetailNode = this.noteDetailNode;
		if ( ! noteDetailNode ) {
			return;
		}

		this.toggleScrollState( noteDetailNode.scrollTop + noteDetailNode.clientHeight >= noteDetailNode.scrollHeight )
	},

	toggleScrollState: function( isBottom ) {
		const { onScrollToBottom } = this.props;
		if ( this.isScrolledToBottom !== isBottom ) {
			this.isScrolledToBottom = isBottom;

			onScrollToBottom( isBottom );
		}
	},

	componentWillReceiveProps: function( nextProps ) {
		const note = nextProps.note;
		const noteContent = get( note, 'data.content', '' );

		this.setState( {
			content: noteContent
		} );

		// Let's focus the editor for new/blank notes
		if ( noteContent === '' ) {
			this.noteEditor.focus();
		}
	},

	onPreviewClick( event ) {
		// open markdown preview links in a new window
		for ( let node = event.target; node != null; node = node.parentNode ) {
			if ( node.tagName === 'A' ) {
				event.preventDefault();
				window.open( node.href );
				break;
			}
		}
	},

	render: function() {
		const { previewingMarkdown, fontSize } = this.props;

		const divStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div onScroll={this.handleScroll} ref="noteDetail" className="note-detail">
				{previewingMarkdown ?
					this.renderMarkdown( divStyle )
				:
					this.renderEditable( divStyle )
				}
			</div>
		);
	},

	renderMarkdown( divStyle ) {
		var markdownHTML = marked( this.state.content );

		return (
			<div className="note-detail-markdown theme-color-bg theme-color-fg"
				dangerouslySetInnerHTML={ { __html: markdownHTML } }
				onClick={ this.onPreviewClick }
				style={ divStyle } />
		);
	},

	renderEditable( divStyle ) {
		var { note } = this.props;
		var valueLink = {
			value: this.state.content,
			requestChange: this.props.onChangeContent.bind( null, note )
		};

		return (
			<Textarea ref={ this.initializeNoteEditor } className="note-detail-textarea theme-color-bg theme-color-fg"
				disabled={ !!( note && note.data.deleted ) }
				valueLink={ valueLink }
				style={ divStyle } />
		);
	}

} )
