const express = require('express');
const app = express();
const { server } = require('@automattic/vip-go');

const port = process.env.PORT || 4000;

app.use(express.static('dist'));

server(app, { PORT: port }).listen();
