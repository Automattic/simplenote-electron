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

## Dependenies

- [node-simperium](https://github.com/automattic/node-simperium) for Simperium syncing.
- ReactJS for UI

[Electron]: http://electron.atom.io