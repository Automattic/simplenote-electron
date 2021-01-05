# Simplenote for Electron

![Screenshot](https://en-blog.files.wordpress.com/2018/09/screenshot-1.png)

A Simplenote [React](https://reactjs.org/) client packaged in [Electron](https://electronjs.org/). Learn more about Simplenote at [Simplenote.com](https://simplenote.com).

## Running

1. Clone the repo: `git clone https://github.com/Automattic/simplenote-electron.git`
2. `cd simplenote-electron`
3. `npm install`
4. `npm run dev`
5. The dev server will start on [http://localhost:4000](http://localhost:4000), and the Electron app will launch automatically.
6. For all logging from Electron to be printed to the terminal (e.g. `console.log` statements within `app.js`), you might need to set `env ELECTRON_ENABLE_LOGGING=1`.
7. Sign up for a new account within the app. Use the account for **testing purposes only** as all note data will be periodically cleared out on the server.

_Note: Simplenote API features such as sharing and publishing will not work with development builds. Due to a limitation of `make` installation paths used for build cannot have spaces._

## Building

- **`make package-osx`**
- **`make package-win32`**
- **`make package-linux`**

## Testing

Unit tests are run with `npm test`.

End-to-end tests are run with `npm run test-e2e`.
Note that the `Spectron` version [corresponds with the version](https://www.npmjs.com/package/spectron#version-map) of `Electron` we are using.
Use the corresponding API docs for `webdriver-io` which correspond to the `Spectron` version.
At the time of writing you will want to refer to the [webdriver-io v4.13 API docs](http://v4.webdriver.io/v4.13/api.html).

## Coding Guidelines

Please adhere to the same guidelines as found in [wp-calypso](https://github.com/Automattic/wp-calypso/blob/master/docs/coding-guidelines.md).

See <a href="./CONTRIBUTING.md">CONTRIBUTING.md</a> for more guidelines.

## Dependencies

- [node-simperium](https://github.com/Simperium/node-simperium) for Simperium syncing.
- [ReactJS](https://reactjs.org/) for UI.
- [Electron](https://electronjs.org/) for wrapping the JavaScript application.

## Simplenote for Other Platforms

[simplenote-electron](https://github.com/Automattic/simplenote-electron) is the official Simplenote desktop app for Windows and Linux.

For other platforms, see:

- [simplenote-macos](https://github.com/Automattic/simplenote-macos)
- [simplenote-ios](https://github.com/Automattic/simplenote-ios)
- [simplenote-android](https://github.com/Automattic/simplenote-android)
