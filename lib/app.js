var React = require('react'),
    App = require('./app.jsx'),
    simperium = require('./simperium');

// TODO: authentication
// Provide a user token for loading notes
var token = config.user_token;
var appId = config.app_id;


var client = simperium(appId, token, {
  'note' : function(objectStore) {
    objectStore.createIndex('modificationDate', 'data.modificationDate');
  },
  'tag' : function(objectStore) {
    console.log("Configure tag", objectStore);
  }
}, 'simplenote', 33);

var notes = client.bucket('note');
var tags = client.bucket('tag');

React.render(
  React.createElement(App, {client: client, notes: notes, tags: tags}),
  document.body
);

