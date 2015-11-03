# Simplenote for Electron

A Simplenote client packaged in [Electron][].

## Running

1. Clone the repo
2. Add the Simplenote application id and token to `config.js`
3. Add add user auth token to `./config.js`

```
module.exports = function() {
  return {
    app_id:     "chalk-bump-f49",
    // For creating/authenticating useres
    app_key:    "",
    // Setting a valid user_token will skip authentication
    user_token: "USER_TOKEN_HERE"
  };
};
```

4. npm install
5. npm start
6. Open http://localhost:4000/

## Electron

Install electron globally `npm install -g electron-prebuilt`, then:

1. Run `webpack`
2. Run `electron .`

## Deploying to simplenote.com

You can deploy a build to [http://electron-dot-simple-note-hrd.appspot.com]() by pushing the `/dist` directory to `gh-pages`:

1. Delete the `./dist` directory if it exists `rm -r dist`
2. Clone the `gh-pages` branch to the `dist` directory: `git clone git@github.com:automattic/simplenote-electron.git -b gh-pages dist`
3. Do a webpack production build `webpack -p`
4. Commit and push the `./dist` changes:
    - `cd dist`
    - `git add --all`
    - `git commit -m "relevant commit message"`
    - `git push origin gh-pages`

**Warning**: Changes to the jade/html will not be reflected, any modifications to the DOM should be done via JavaScript.


## Dependenies

- [node-simperium](https://github.com/automattic/node-simperium) for Simperium syncing.
- ReactJS for UI

[Electron]: http://electron.atom.io