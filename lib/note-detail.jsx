import React, { PropTypes } from 'react';
import marked from 'marked';

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		previewingMarkdown: PropTypes.bool,
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
		var { previewingMarkdown } = this.props;

		return (
			<div className="note-detail">
				{previewingMarkdown ?
					this.renderMarkdown()
				:
					this.renderEditable()
				}
			</div>
		);
	},

	renderMarkdown() {
		var markdownHTML = marked( this.state.content );

		return (
			<div className="note-detail-markdown"
				dangerouslySetInnerHTML={{__html: markdownHTML}}
				onClick={this.onPreviewClick} />
		);
	},

	renderEditable() {
		var { note } = this.props;
		var valueLink = {
			value: this.state.content,
			requestChange: this.props.onChangeContent.bind( null, note )
		};

		return (
			<textarea className="note-detail-textarea color-bg color-fg"
				disabled={!!( note && note.data.deleted )}
				valueLink={valueLink} />
		);
	}

} )
