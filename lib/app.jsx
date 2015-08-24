var React      = require('react');
var NoteList   = require('./note_list.jsx');
var NoteDetail = require('./note_detail.jsx');
var TagField   = require('./tag_field.jsx');
var TagMenu    = require('./tag_menu.jsx');

module.exports = React.createClass({

  getInitialState: function() {
    return {
      notes: [],
      tags: ['Stuff', 'Things', 'Recipes', 'Journal']
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

  onClickTagFilter: function(tag) {
    console.log("Filter", tag);
  },

  render: function() {
    return (
      <div className="simplenote-app">
        <div className="source-list">
          <div className="toolbar">
          </div>
          <div className="toolbar-compact">
              <TagMenu>
                <div key="trash" className="tag-trash-option">
                  <span>Trash</span>
                  <span className="trash-count">5</span>
                </div>
                {this.state.tags.map((function(tag) {
                  var onClickTagFilter = this.onClickTagFilter;
                  var onClick = function() {
                    onClickTagFilter(tag);
                  };
                  return (
                    <div key={tag} className="tag-filter-option" onClick={onClick}>{tag}</div>
                  )
                }).bind(this))}
              </TagMenu>
          </div>
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