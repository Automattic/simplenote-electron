var React = require('react');
var NoteListItem = require('./note_list_item.jsx');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      notes: [],
      onSelectNote: function() {}
    };
  },

  getInitialState: function() {
    return {
      selected: null
    };
  },

  onSelectNote: function(note) {
    this.setState({selected: note});
    this.props.onSelectNote(note);
  },

  render: function() {
    var selected = this.state.selected;
    var onSelect = this.onSelectNote;
    return (
      <div className="note-list" tabIndex="1">
      {this.props.notes.map(function(note) {
        var isSelected = note == selected;
        return (
          <NoteListItem selected={isSelected} key={note.id} note={note} onSelectNote={onSelect} />
        )
      })}
      </div>
    );
  }

});
