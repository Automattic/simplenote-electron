# Simplenote for Electron

![Screenshot](https://simplenoteblog.files.wordpress.com/2016/03/simplenote-linux.png)

A Simplenote [React](https://facebook.github.io/react/) client packaged in [Electron](http://electron.atom.io). Learn more about Simplenote at [Simplenote.com](https://simplenote.com).

## Development Requirements
* A Simperium account. [Sign up here](https://simperium.com/signup/)
* A Simperium Application ID and key. [Create a new app here](https://simperium.com/app/new/)

## Running

1. Clone the repo: `git clone https://github.com/Automattic/simplenote-electron.git`
2. Create a new file in the root directory, named `config.json`
3. Add the Simplenote application id and token to `config.json`

```json
{
  "app_id":     "your-app-id",
  "app_key":    "yourappkey"
}
```

4. `npm install` _or_ `docker-compose up install` (if Docker installed)
5. `npm start` _or_ `docker-compose up dev` (if Docker installed)
6. Open http://localhost:4000. You can sign in to the app with your Simperium credentials.

_Note: Simplenote API features such as sharing and publishing will not work with development builds._

## Electron

Install electron globally `npm install -g electron-prebuilt`, then:

1. Run `npm run build`
2. Run `electron .`

You can also pass along the `--devtools` option after `electron .` to open the developer tools

## Coding Guidelines

Please adhere to the same guidelines as found in [wp-calypso](https://github.com/Automattic/wp-calypso/blob/master/docs/coding-guidelines.md).

## Dependencies

- [node-simperium](https://github.com/automattic/node-simperium) for Simperium syncing.
- [ReactJS](https://facebook.github.io/react/) for UI.
- [Electron](http://electron.atom.io) for wrapping the JavaScript application.
