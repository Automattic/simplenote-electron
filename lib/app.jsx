var React = require('react');
var NoteList = require('./note_list.jsx');
var NoteDetail = require('./note_detail.jsx');
var TagField = require('./tag_field.jsx');

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
  },

  render: function() {
    return (
      <div className="simplenote-app">
        <div className="source-list">
          <div className="toolbar"></div>
          <div className="toolbar-compact"></div>
          <div className="panel">
            <NoteList ref="list" notes={this.state.notes || []} onSelectNote={this.onSelectNote} />
          </div>
        </div>
        <div className="detail">
          <div className="toolbar"></div>
          <div className="toolbar-compact">
            <TagField ref="tags" note={this.state.note} />
          </div>
          <div className="panel">
            <NoteDetail ref="detail" note={this.state.note} />
          </div>
        </div>
      </div>
    )
  }
});