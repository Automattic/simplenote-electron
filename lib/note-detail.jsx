import React from 'react'

export default React.createClass( {

	getDefaultProps: function() {
		return {
			note: {},
			onChangeContent: function() {}
		};
	},

	getInitialState: function() {
		return {
			content: this.noteContent( this.props.note )
		};
	},

	componentWillReceiveProps: function( nextProps ) {
		this.setState( {
			content: this.noteContent( nextProps.note )
		} );
	},

	noteContent: function( note ) {
		if ( !note ) {
			return '';
		}
		let data = note.data;
		return data ? data.content : null;
	},

	onChangeContent: function() {
		var v = this.refs.content.value;
		this.props.onChangeContent( v );
	},

	render: function() {
		var disabled = this.props.note && this.props.note.data.deleted;
		return (
			<div className="note-detail">
				<textarea ref="content" disabled={disabled} className="note-detail-textarea" value={this.state.content} onChange={this.onChangeContent}/>
			</div>
		)
	}

} )
