# Building a Release

* `make osx`
* `make linux`
* `make win32`

# Packaging

Some builds require further packaging before they can be released:

* `make package-win32` - Produces a signed `Setup.exe` install wizard
* `make package-osx` - Produces a `DMG` file
* `make package-linux` - Produces a `.deb` file


# Requirements

## Mac

A Mac build requires the app to be signed. This prevents a security warning being issued when you run the app.

You can obtain all the appropriate signing certificates from an Apple Developer account.

Note that you need the certificates installed prior to building.

## Windows Package

The Windows package requires installing a valid certificate, installing the `makensis`, `wine` and `mono` packages, installable from `brew`.

`brew install mono wine makensis`

The Windows build doesn't get signed until the packaging stage

## Linux Package

The Linux package is built using [FPM][1] which is a tool that makes it easy to build packages for different distributions. To install FPM you can do the following:

```bash
gem install fpm # For a global install
bundle install --path vendor/bundle # For a local install.
```

You can install ruby using [RVM][2] or on Ubuntu/Debian:

```bash
sudo apt-get install ruby2.0 ruby2.0-dev # Ubuntu 14.04+/Debian Stable
sudo apt-get install ruby2.3 ruby2.3-dev # Ubuntu 16.04+/Debian Unstable
```

[1]: https://github.com/jordansissel/fpm
[2]: https://rvm.io/rvm/install
