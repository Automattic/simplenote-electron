var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {},
      onSelectNote: function() {},
      selected: false
    }
  },

  onClickNote: function(e) {
    this.props.onSelectNote(this.props.note);
  },

  render: function() {
    var content = this.props.note.data.content;
    var title = content.replace(/\n/, '').slice(0, 50);
    var cls = "source-list-item";
    if (this.props.selected) cls += " selected";
    return (
      <div className={cls} onClick={this.onClickNote}>
        <div>{title}</div>
      </div>
    )
  }
});