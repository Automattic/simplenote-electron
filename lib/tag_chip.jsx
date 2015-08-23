var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      tag: '',
      selected: false,
      onSelectTag: function() {}
    };
  },

  render: function() {
    var className = 'tag-chip' + (this.props.selected ? ' selected' : '');
    return (
      <div className={className} onClick={this.props.onSelect}>{this.props.tag}</div>
    )
  }
});