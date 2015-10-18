var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {},
      onSelectNote: function() {},
      selected: false
    };
  },

  onClickNote: function(e) {
    this.props.onSelectNote(this.props.note);
  },

  render: function() {
    var content = (this.props.note.data.content || "").trim();
    var firstLineBreak = content.indexOf("\n");

    if (firstLineBreak == -1) firstLineBreak = content.length;
    var title = content.slice(0, Math.min(200, firstLineBreak));

    if (firstLineBreak >= 0) {
      var preview = content.slice(firstLineBreak+1, firstLineBreak + 100);      
    }
    var cls = "source-list-item";
    if (this.props.selected) cls += " selected";
    if (this.props.note.pinned) cls += " pinned";
    return (
      <div className={cls}
        onClick={this.onClickNote}>
        <div></div>
        <div className="note-preview">
          <div className="title">{title}</div>
          <div className="preview">{preview}</div>
        </div>
      </div>
    )
  }
});