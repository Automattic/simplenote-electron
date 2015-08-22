var simperium = require('simperium'),
    Client = simperium.Client,
    Auth = simperium.Auth,
    React = require('react'),
    App = require('./app.jsx');

// TODO: authentication
// Provide a user token for loading notes
var token = "539ab4104cc14f6493a330dffc7fbf20";
var appId = "chalk-bump-f49";

var client = new simperium(appId, token);
client.connect();

var notes = client.bucket('note');
var tags = client.bucket('tag');

var lorem = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

var data = [
  { id: "one",   data: {content: lorem }},
  { id: "two",   data: {content: lorem.slice(200, 400)}},
  { id: "three", data: {content: lorem.slice(45, 200) + lorem.slice(0, 100)}},
  { id: "four",  data: {content: "Hello there, this is a note"}},
  { id: "five",  data: {content: "Hello there, this is a note"}},
  { id: "six",   data: {content: "Hello there, this is a note"}},
  { id: "seven", data: {content: "Hello there, this is a note"}},
  { id: "eight", data: {content: "Hello there, this is a note"}},
  { id: "nine",  data: {content: "Hello there, this is a note"}}
];

notes.find = function(query, callback) {
  callback(null, data);
};

setTimeout(function() {
  notes.emit('index');
}, 200);

React.render(
  React.createElement(App, {client: client, notes: notes, tags: tags}),
  document.body
);
