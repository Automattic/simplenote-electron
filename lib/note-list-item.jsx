import React from 'react'
import NoteDisplayMixin from './note-display-mixin'
import classnames from 'classnames'

export default React.createClass({

	mixins: [NoteDisplayMixin],

	getDefaultProps: function() {
		return {
			note: {},
			onSelectNote: function() {},
			selected: false
		};
	},

	onClickNote: function(e) {
		this.props.onSelectNote(this.props.note.id);
	},

	render: function() {
		var content = this.noteTitleAndPreview(this.props.note);
		var cls = "note-list-item";

		var classes = classnames('note-list-item', {
			'selected': this.props.selected,
			'pinned': this.props.note.pinned
		} );
		
		return (
			<div className={classes}
				onClick={this.onClickNote}>
				<div className="note-list-item-meta">
					<div className="pin-icon"></div>
					<div className="note-excerpt">
						<div className="title">{content.title}</div>
						<div className="excerpt">{content.preview}</div>
					</div>
				</div>
			</div>
		)
	}
});