var React       = require('react');
var NoteList    = require('./note_list.jsx');
var NoteDetail  = require('./note_detail.jsx');
var TagField    = require('./tag_field.jsx');
var TagMenu     = require('./tag_menu.jsx');
var SearchField = require('./search_field.jsx');

module.exports = React.createClass({

  getInitialState: function() {
    return {
      notes: [],
      tags: [],
      showTrash: false
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

  onNoteUpdate: function(id, data) {
    this.onNotesIndex();
    if (this.state.note && id == this.state.note.id) {
      var note = this.state.note;
      note.data = data;
      this.setState({note: note});
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

  onChangeContent: function(value) {
    var note = this.state.note;
    if (note) {
      note.data.content = value;
      this.setState({note: note});
      // TODO, delay updates so not sent per keystroke
      var commit = (function() {
        this.props.notes.update(note.id, note.data);
      }).bind(this);

      throttle(note.id, commit);
    }
  },

  onChangeTags: function(tags) {
    var note = this.state.note;
    if (note) {
      note.data.tags = tags;
      this.props.notes.update(note.id, note.data);
      this.setState({note: note});
    }
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

  render: function() {

    var notes = this.filterNotes();
    
    return (
      <div className="simplenote-app">
        <div className="source-list">
          <div className="toolbar">
            <SearchField onSearch={this.onSearch} />
          </div>
          <div className="toolbar-compact">
              <TagMenu>
              </TagMenu>
          </div>
          <div className="panel">
            <NoteList ref="list" notes={notes} onSelectNote={this.onSelectNote} />
          </div>
        </div>
        <div className="detail">
          <div className="toolbar"></div>
          <div className="toolbar-compact">
            <TagField ref="tags" note={this.state.note} onUpdateTags={this.onChangeTags} />
          </div>
          <div className="panel">
            <NoteDetail ref="detail" note={this.state.note} bucket={this.props.notes} onChangeContent={this.onChangeContent} />
          </div>
        </div>
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