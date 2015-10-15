var React = require('react'),
    App = require('./app.jsx'),
    simperium = require('./simperium');

// TODO: authentication
// Provide a user token for loading notes
var token = config.user_token;
var appId = config.app_id;


var client = simperium(appId, token, {
  'note' : {
    beforeIndex: function(note) {
      note.pinned = note.data.systemTags.indexOf('pinned') !== -1 ? 1 : 0;
      return note;
    },
    configure: function(objectStore) {
      objectStore.createIndex('modificationDate', 'data.modificationDate');
      objectStore.createIndex('pinned-sort', ['pinned', 'data.modificationDate']);
    }
  },
  'tag' : function(objectStore) {
    console.log("Configure tag", objectStore);
  }
}, 'simplenote', 40);

client.on('connect', function() {
  console.log("Connected");
});

client.on('disconnect', function() {
  console.log("Not connected");
});

client.on('message', function(message) {
  if (window.log) {
    console.log('<=', message);
  }
});

client.on('send', function(message) {
  if (window.log) {
    console.log('=>', message); 
  }
});

var notes = client.bucket('note');
var tags = client.bucket('tag');

React.render(
  React.createElement(App, {client: client, notes: notes, tags: tags}),
  document.body
);

