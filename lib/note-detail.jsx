import React, { PropTypes } from 'react';
import marked from 'marked';
import Textarea from 'react-textarea-autosize';

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
		fontSize: PropTypes.number,
		onChangeContent: PropTypes.func.isRequired
	},

	getInitialState: function() {
		var note = this.props.note;

		return {
			content: note ? note.data.content : ''
		};
	},

	componentWillReceiveProps: function( nextProps ) {
		var note = nextProps.note;

		this.setState( {
			content: note ? note.data.content : ''
		} );
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
			<Textarea className="note-detail-textarea theme-color-bg theme-color-fg"
				disabled={ !!( note && note.data.deleted ) }
				valueLink={ valueLink }
				style={ divStyle } />
		);
	}

} )
