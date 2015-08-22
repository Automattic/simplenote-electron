var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {}
    };
  },

  noteContent: function(note) {
    var data = note.data;
    return data ? data.content : null;
  },

  componentWillReceiveProps: function (nextProps, context){
    this.setState({content: this.noteContent(nextProps.note)});
  },

  componentDidMount: function() {
  },

  getInitialState: function() {
    return {
      content: this.noteContent(this.props.note)
    };
  },

  onChangeContent: function(e) {
    this.setState({content: this.refs.content.getDOMNode().value});
  },

  render: function() {
    return (
      <div className="editor-wrapper">
        <textarea ref="content" className="editor" value={this.state.content} onChange={this.onChangeContent}/>
      </div>
    )
  }

})