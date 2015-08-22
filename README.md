# Simplenote for Electron

A Simplenote client packaged in [Electron][].

## Building

1. Clone the repo
2. First time install dependencies `npm install`
3. Install electron (e.g. `npm install -g electron`)
4. Set a user token in [app.js](./blog/master/lib/app.js#L7)
5. `gulp && electron .`

## Development

- [node-simperium](https://github.com/automattic/node-simperium) for Simperium syncing.
- ReactJS for UI

[Electron]: http://electron.atom.io