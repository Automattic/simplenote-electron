var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {}
    }
  },

  render: function() {
    var data = this.props.note.data;
    var content = data ? data.content : null;
    return (
      <div>
        <pre>
          {content}
        </pre>
      </div>
    )
  }

})