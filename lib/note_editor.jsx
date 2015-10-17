var React            = require('react');
var NoteDetail       = require('./note_detail.jsx');
var TagField         = require('./tag_field.jsx');
var NoteToolbar      = require('./note_toolbar.jsx');
var RevisionSelector = require('./revision_selector.jsx');


module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      note: {
        data: {
          tags: []
        }
      },
      revisions: null,
      onUpdateContent: function() {},
      onUpdateTags: function() {},
      onTrashNote: function() {},
      onRestoreNote: function() {},
      onRevisions: function() {},
      onSignOut: function() {}
    };
  },

  componentWillReceiveProps: function() {
    this.setState({revision: null});
  },

  getInitialState: function() {
    return {
      revision: null
    }
  },

  withNote: function(fn) {
    var note = this.props.note;
    return function() {
      var args = [note].concat([].slice.call(arguments));
      fn.apply(null, args);
    };
  },

  onViewRevision: function(revision) {
    this.setState({revision: revision});
  },

  onSelectRevision: function(revision) {
    console.log("Accept revision: ", revision);
  },

  render: function() {
    var revisions = this.props.revisions;
    var revision = this.state.revision;
    var note = this.state.revision ? this.state.revision : this.props.note;
    return (
      <div className="detail">
        <NoteToolbar
          note={this.props.note}
          onTrashNote={this.props.onTrashNote}
          onRestoreNote={this.props.onRestoreNote}
          onRevisions={this.props.onRevisions}
          onSignOut={this.props.onSignOut} />
        <div className="toolbar-compact">
          <TagField ref="tags"
            tags={this.props.note.data.tags}
            onUpdateTags={this.withNote(this.props.onUpdateTags)} />
        </div>
        <div className="panel">
          <NoteDetail ref="detail"
            note={note}
            onChangeContent={this.withNote(this.props.onUpdateContent)} />
        </div>
        {when(revisions, function() {
          return (
            <RevisionSelector
              revisions={revisions}
              onViewRevision={this.onViewRevision}
              onSelectRevision={this.onSelectRevision} />
          )
        }, this)}
      </div>
    )
  }
});

function when(test, func, ctx) {
  if (typeof test == 'function') {
    test = test();
  }
  if (test) {
    return func.apply(ctx);
  }
}
