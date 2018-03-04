# Building a Release

* `make osx`
* `make linux`
* `make win32`

# Packaging

Some builds require further packaging before they can be released:

* `make package-win32` - Produces a signed `Setup.exe` install wizard
* `make package-osx` - Produces a `DMG` file
* `make package-linux` - Produces a `.deb`, `.rpm` and `.AppImage` file for `x86` and `x64` processors


# Requirements

## Mac Package

A Mac build requires the app to be signed. This prevents a security warning being issued when you run the app.

You can obtain all the appropriate signing certificates from an Apple Developer account.

Note that you need the certificates installed prior to building.

## Windows Package

The Windows package requires installing a valid certificate, installing the `makensis`, `wine` and `mono` packages, installable from `brew`.

`brew install mono wine makensis`

The Windows build doesn't get signed until the packaging stage

## Linux Package

The Linux package is build using [electron-builder][1] which is a tool that makes it easy to build different package systems. electron-builder should be installed by `npm install`.

### Note for creating Linux package on Linux

1. Creating all Linux packages requires tool for converting `.icns` file to `.png`. May be installed via `apt` by typing:

   `sudo apt install --no-install-recommends -y icnsutils `

2. Creating `.rpm` package requires `rpm` package, installable from 'apt'.

   `sudo apt install --no-install-recommends -y rpm`

### Note for creating Linux package on MacOS:

1. Creating Linux package on MacOS requires `rpm` package, installable from `brew`.

   `brew install rpm`

[1]: https://www.electron.build/