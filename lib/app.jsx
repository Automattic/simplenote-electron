var React         = require('react');
var NoteList      = require('./note_list.jsx');
var NoteEditor    = require('./note_editor.jsx');
var TagMenu       = require('./tag_menu.jsx');
var SearchField   = require('./search_field.jsx');
var NavigationBar = require('./navigation_bar.jsx');

module.exports = React.createClass({

  getInitialState: function() {
    return {
      notes: [],
      tags: [],
      showTrash: false,
      listTitle: "All Notes"
    };
  },

  componentDidMount: function() {

    this.props.notes
      .on('index', this.onNotesIndex)
      .on('update', this.onNoteUpdate)
      .on('remove', this.onNoteRemoved);

    this.props.tags
      .on('index', this.onTagsIndex)
      .on('update', this.onTagsIndex);

    this.onNotesIndex();
    
  },

  onSelectNote: function(note) {
    this.setState({note: note});
  },

  onNotesIndex: function() {
    var done = this.onFindNotes;
    this.props.notes.query(function(db) {
      var notes = [];
      db.transaction('note').objectStore('note').index('pinned-sort').openCursor(null, 'prev').onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          notes.push(cursor.value);
          cursor.continue();
        } else {
          done(null, notes);
        }
      };
    });
  },

  onNoteRemoved: function() {
    this.onNotesIndex();
  },

  onNoteUpdate: function(id, data, original, patch) {

    this.onNotesIndex();
    if (this.state.note && id == this.state.note.id) {
      var note = this.state.note;

      console.log("Update cursor location and do conflict resolution?");

      // TODO: conflict resolution of the note and update the correct
      // cursor location.
      note.data = data;
      this.setState({note: note, patch: patch});
    }
  },

  onFindNotes: function(e, notes) {
    this.setState({notes: notes});
  },

  onTagsIndex: function() {
  },

  onClickTagFilter: function(tag) {
    console.log("Filter", tag);
  },

  onSearch: function(v) {
    this.setState({filter: v});
  },

  filterNotes: function() {
    var query = this.state.filter,
        trash = this.state.showTrash,
        notes = this.state.notes || [];
        filter = function(note) {
          return trash || !note.data.deleted;
        };

    if (query) {
      var reg = new RegExp(query, 'gi');
      filter = and(filter, function(note){
        if (note.data && note.data.content) return reg.test(note.data.content);
        return false;
      });
    }

    return notes.filter(filter);
  },

  onUpdateContent: function(note, content) {
    if (note) {
      note.data.content = content;
      this.setState({note: note});

      var commit = (function() {
        this.props.notes.update(note.id, note.data);
      }).bind(this);

      throttle(note.id, commit);
    }
  },

  onUpdateTags: function(note, tags) {
    console.log("Updating tags");
    if (note) {
      note.data.tags = tags;
      this.props.notes.update(note.id, note.data);
      this.setState({note: note});
    }
  },

  onTrashNote: function(note) {
    if (note) {
      note.data.deleted = true;
      this.props.notes.update(note.id, note.data);
      this.setState({note: null});
    }
  },

  onRestoreNote: function(note) {
    if (note) {
      note.data.deleted = false;
      this.props.notes.update(note.id, note.data);
      this.setState({note: null});
    }
  },

  render: function() {

    var notes = this.filterNotes();
    var note = this.state.note;
    var self = this;

    return (
      <div className="simplenote-app">
        <div className="source-list">
          <div className="toolbar">
            <NavigationBar title={this.state.listTitle} />
          </div>
          <div className="toolbar-compact">
            <SearchField onSearch={this.onSearch} />
          </div>
          <div className="panel">
            <NoteList ref="list" notes={notes} onSelectNote={this.onSelectNote} />
          </div>
        </div>
        <NoteEditor note={note} onUpdateContent={this.onUpdateContent} onUpdateTags={this.onUpdateTags} onTrashNote={this.onTrashNote} onRestoreNote={this.onRestoreNote} />
      </div>
    )
  }
});

var timers = {};

function timer(id) {
  var t = timers[id];
  if (!t) timers[id] = { start: (new Date()).getTime(), id: -1 }; 
  return timers[id];
};

function clearTimer(id) {
  delete timers[id];
}

var maxTime = 3000;

function throttle(id, cb) {
  var t = timer(id),
      now = (new Date()).getTime(),
      ellapsed = now - t.start,
      perform = function() {
        var t = timer(id),
            now = (new Date()).getTime(),
            ellapsed = now - t.start;

        cb();
        clearTimer(id);
        console.log(id, "Fired after", ellapsed);
      };

  clearTimeout(timer.id);

  if (ellapsed > maxTime) return perform();

  timer.id = setTimeout(perform, maxTime);
}

function and(fn, fn2) {
  return function(o) {
    if (!fn(o)) return false;
    return fn2(o);
  };
}