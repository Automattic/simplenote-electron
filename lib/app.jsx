var React = require('react');
var NoteList = require('./note_list.jsx');
var NoteDetail = require('./note_detail.jsx');


module.exports = React.createClass({

  getInitialState: function() {
    return {
      notes: []
    };
  },

  componentDidMount: function() {

    this.props.notes.on('index', this.onNotesIndex);
    this.props.tags.on('index', this.onTagsIndex);
    
  },

  onSelectNote: function(note) {
    this.setState({note: note});
  },

  onNotesIndex: function() {
    this.props.notes.find(null, this.onFindNotes);
  },

  onFindNotes: function(e, notes) {
    this.setState({notes: notes});
  },

  onTagsIndex: function() {
    console.log("Tags!");
  },

  render: function() {
    return (
      <div className="simplenote-app">
        <div className="source-list">
          <NoteList ref="list" notes={this.state.notes || []} onSelectNote={this.onSelectNote} />
        </div>
        <div className="detail">
          <NoteDetail ref="detail" note={this.state.note} />
        </div>
      </div>
    )
  }
});