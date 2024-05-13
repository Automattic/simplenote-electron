# Simplenote for Electron

![Screenshot](https://en-blog.files.wordpress.com/2018/09/screenshot-1.png)

A Simplenote [React](https://reactjs.org/) client packaged in [Electron](https://electronjs.org/). Learn more about Simplenote at [Simplenote.com](https://simplenote.com).

## Running

**Read this first!!**: Local development is currently not supported if you don't have an existing account on the test server or access to the production credentials. This is because the move to an email-first signup flow has made it impossible to create accounts in the test database. We hope to be able to support an open-source development workflow again in the future.

1. Clone the repo: `git clone https://github.com/Automattic/simplenote-electron.git`
2. `cd simplenote-electron`
3. `npm install --legacy-peer-deps` (This flag is necessary because `react-monaco-editor` is pinned to a specific `monaco-editor` dependency, but `npm` [considers minor versions to be breaking changes for sub-1.0.0 apps](https://stackoverflow.com/questions/62629878/why-doesnt-npm-upgrade-install-my-0-0-1-dep-with-a-dependency-on-0-0-0))
4. Decrypt the config file using `make decrypt_conf`.
5. `npm run dev`
6. The dev server will start on [http://localhost:4000](http://localhost:4000), and the Electron app will launch automatically.
7. For all logging from Electron to be printed to the terminal (e.g. `console.log` statements within `app.js`), you might need to set `env ELECTRON_ENABLE_LOGGING=1`.

_Note: Simplenote API features such as sharing and publishing will not work with development builds. Due to a limitation of `make` installation paths used for build cannot have spaces._

## Building

- **`make package-osx`**
- **`make package-win32`**
- **`make package-linux`**

## Testing

Unit tests are run with `npm test`.

## Coding Guidelines

Please adhere to the same guidelines as found in [wp-calypso](https://github.com/Automattic/wp-calypso/blob/master/docs/coding-guidelines.md).

See <a href="./CONTRIBUTING.md">CONTRIBUTING.md</a> for more guidelines.

## Dependencies

- [node-simperium](https://github.com/Simperium/node-simperium) for Simperium syncing.
- [ReactJS](https://reactjs.org/) for UI.
- [Electron](https://electronjs.org/) for wrapping the JavaScript application.
- `rpm` must be installed in order to build Linux packages (`brew install rpm` on OSX).

## Simplenote for Other Platforms

[simplenote-electron](https://github.com/Automattic/simplenote-electron) is the official Simplenote desktop app for Windows and Linux.

For other platforms, see:

- [simplenote-macos](https://github.com/Automattic/simplenote-macos)
- [simplenote-ios](https://github.com/Automattic/simplenote-ios)
- [simplenote-android](https://github.com/Automattic/simplenote-android)
