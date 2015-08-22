var simperium = require('simperium').Client,
    React = require('react'),
    App = require('./app.jsx');

// TODO: authentication
// Provide a user token for loading notes
var token = "";
var appId = "chalk-bump-f49";

var client = new simperium(appId, token);
client.connect();

client.on('message', function(data) {
  console.log("<=", data.slice(0, 80));
});

client.on('send', function(message) {
  console.log("=>", message.slice(0, 80));
});

client.on('connect', function() {
  console.log("LOL");
});

var notes = client.bucket('note');
var tags = client.bucket('tag');

React.render(
  React.createElement(App, {client: client, notes: notes, tags: tags}),
  document.body
);
