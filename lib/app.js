var React = require('react'),
    App = require('./app.jsx'),
    simperium = require('./simperium'),
    auth = new simperium.Auth(config.app_id, config.app_key);

// Provide a user token for loading notes
var token = localStorage.access_token;
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

var l = (msg) => {
  return function() {
    console.log.apply(console, [msg].concat([].slice.call(arguments)));
  }
}

client
  .on('connect', l("Connected"))
  .on('disconnect', l("Not connected"))
  .on('message', l("<="))
  .on('send', l("=>"))
  .on('unauthorized', l("Not authorized"));

client.on('unauthorized', () => {

  // if there is no token, drop data, if there is a token it could potentially just be
  // a password change or something similar so don't kill the data
  if (token) return;

  client.reset().then(() => { console.log("Reset complete")});

});

var notes = client.bucket('note');
var tags = client.bucket('tag');

React.render(
  React.createElement(App, {
    client: client,
    notes: notes,
    tags: tags,
    onAuthenticate: (username, password) => {
      auth.authorize(username, password).then((user) => {
        localStorage.access_token = user.access_token;
        client.setUser(user);
      });
    },
    onSignOut: () => {
      delete localStorage.access_token;
      client.deauthorize();
    }
  }),
  document.body
);

