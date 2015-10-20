var React = require('react');
var NoteDisplayMixin = require('./note_display_mixin.js');
var classnames = require('classnames');

module.exports = React.createClass({

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
    var cls = "source-list-item";

		var classes = classnames('source-list-item', {
			'selected': this.props.selected,
			'pinned': this.props.note.pinned
		} );
		
    return (
      <div className={classes}
        onClick={this.onClickNote}>
        <div></div>
        <div className="note-preview">
          <div className="title">{content.title}</div>
          <div className="preview">{content.preview}</div>
        </div>
      </div>
    )
  }
});