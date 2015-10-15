var React      = require('react');
var NoteDetail = require('./note_detail.jsx');
var TagField   = require('./tag_field.jsx');

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
        <div className="toolbar detail-toolbar">
          <div ref="info" tabIndex="-1" className="infoButton">Info</div>
          <div ref="revisions" tabIndex="-1" className="revisionsButton">Revisions</div>
          { this.isNotTrashed(function() {
            return (
              <div ref="trash" tabIndex="-1" className="trashButton" onClick={this.withNote(this.props.onTrashNote)}>Delete</div>
            )
          })}
          { this.isTrashed(function() {
            return (
              <div ref="trash" tabIndex="-1" className="trashButton" onClick={this.withNote(this.props.onRestoreNote)}>Restore</div>
            )
          })}
        </div>
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