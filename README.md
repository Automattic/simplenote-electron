# Simplenote for Electron

A Simplenote client packaged in [Electron][].

## Developing

1. Clone the repo
2. Add the Simplenote application id and token to `config.js`
3. npm start
4. Open http://localhost:4000/

## Building

1. Clone the repo
2. First time install dependencies `npm install`
3. Install electron (e.g. `npm install -g electron`)
4. Set a user token in [app.js](https://github.com/Simperium/simplenote-electron/blob/master/lib/app.js#L7)
5. `gulp && electron .`

## Dependenies

- [node-simperium](https://github.com/automattic/node-simperium) for Simperium syncing.
- ReactJS for UI

[Electron]: http://electron.atom.io