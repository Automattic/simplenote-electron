var React            = require('react');
var NoteDetail       = require('./note_detail.jsx');
var TagField         = require('./tag_field.jsx');
var NoteToolbar      = require('./note_toolbar.jsx');


module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {
        data: {
          tags: []
        }
      },
      onUpdateContent: function() {},
      onUpdateTags: function() {},
      onTrashNote: function() {},
      onRestoreNote: function() {}
    };
  },

  onTrash: function() {
    
  },

  onRestore: function() {
    
  },

  onChangeContent: function() {
    
  },

  isTrashed: function(fn) {
    var note = this.props.note;
    if (note && note.deleted) {
      return fn.call(this, note);
    }
  },

  isNotTrashed: function(fn) {
    var note = this.props.note;
    if (note && !note.deleted) {
      return fn.call(this, note);
    }
  },

  withNote: function(fn) {
    var note = this.props.note;
    return function() {
      var args = [note].concat([].slice.call(arguments));
      fn.apply(null, args);
    };
  },

  render: function() {
    return (
      <div className="detail">
        <NoteToolbar
          note={this.props.note}
          onTrashNote={this.props.onTrashNote}
          onRestoreNote={this.props.onRestoreNote}
          onRevisions={this.props.onRevisions} />
        <div className="toolbar-compact">
          <TagField ref="tags" tags={this.props.note.data.tags} onUpdateTags={this.withNote(this.props.onUpdateTags)} />
        </div>
        <div className="panel">
          <NoteDetail ref="detail" note={this.props.note} onChangeContent={this.withNote(this.props.onUpdateContent)} />
        </div>
      </div>
    )
  }
});