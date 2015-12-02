import React, { PropTypes } from 'react';

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
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

	render: function() {
		var { note } = this.props;
		var valueLink = {
			value: this.state.content,
			requestChange: this.props.onChangeContent.bind( null, note )
		};

		return (
			<div className="note-detail">
				<textarea className="note-detail-textarea"
					disabled={!!( note && note.data.deleted )}
					valueLink={valueLink} />
			</div>
		);
	}

} )
