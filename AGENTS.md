# AGENTS.md

> `CLAUDE.md` just imports this file. Make edits here.
>
> This is a living doc. Anything described as **currently** true is a known rough edge to work
> around today, not a design decision — fixing it is fair game.

## What this repo is

**One React app, two products.** `lib/` is a renderer shared by both:

- **Web** — https://app.simplenote.com, deployed to VIP Go (see [Deploying](#deploying)).
- **Desktop** — Electron. Official app for Windows and Linux; available for macOS, though the
  official macOS app is native ([simplenote-macos](https://github.com/Automattic/simplenote-macos)).

Despite the repo name, **a change to `lib/` ships to the web app too.** Verify both.

## Setup

Node 20.10.0 (`.nvmrc` — the `engines` field in `package.json` is currently stale).

```bash
npm install --legacy-peer-deps   # the flag is required on EVERY install, see Gotchas
make decrypt_conf                # optional, password-gated; writes config-local.json
```

Without `config-local.json`, webpack falls back to the committed `config.json`, so the app
builds and runs against a dev Simperium app. Real credentials need `make decrypt_conf`, and
local dev needs an existing account on the test server (see README).

## Commands

```bash
npm run dev       # webpack-dev-server on :4000 + Electron pointed at it. Normal dev loop.
make start        # Electron loading dist/ over file://. Does NOT build — see Gotchas.
npm run build     # webpack -> dist/ (this is also the web app build)
npm test          # jest
npm run lint      # eslint + stylelint
npm run format    # prettier over the tree
make package-osx | package-win32 | package-linux    # installers via electron-builder
```

## Architecture

| Path                   | What                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/`                 | React renderer, **shared by web and desktop**. Entry `lib/boot.ts`. All TypeScript.             |
| `lib/state/`           | Redux store. Reducers: `browser`, `data`, `settings`, `simperium`, `ui`.                        |
| `lib/state/simperium/` | Sync via node-simperium — notes are synced, not a plain local store.                            |
| `lib/state/electron/`  | Desktop-only middleware. The renderer→main bridge.                                              |
| `desktop/`             | Electron main process. Entry `desktop/index.js`. JavaScript, currently outside `tsconfig.json`. |
| `scss/`                | Styles (stylelint applies).                                                                     |
| `dist/`                | webpack output. Generated — don't edit.                                                         |
| `vip/`                 | Express/VIP-Go server shell, copied to repo root at deploy time.                                |

### Web vs desktop code

`window.electron` is injected by `desktop/preload.js` and **does not exist on web**. Branch
through `lib/utils/platform.ts` (`isElectron`, `isMac`, `isLinux`, `CmdOrCtrl`) — never assume
Electron APIs, `process`, or Node built-ins are available in `lib/`.

## Checks

`npm run lint` runs eslint (flat config, `eslint.config.mjs`) **and** stylelint over `**/*.scss`.

**Currently, TypeScript is never type-checked.** `tsconfig.json` is `strict` + `noEmit`, but
nothing runs `tsc` — not the build (Babel strips types), not lint, not CI. Type errors currently
ship silently.

Tests are jest/jsdom, rooted at `desktop`, `lib`, `scripts`. `testRegex` matches `*.test.*`
**and every file under any `test/` directory** — put fixtures elsewhere or jest collects them.
Coverage is currently thin (~9 test files); add tests with new logic.

A `pre-commit` hook runs `pretty-quick --staged`, so prettier is authoritative — don't
hand-format.

CI (Buildkite) runs lint and tests at `NODE_ENV=test`, then packages all three platforms on
every build.

## Gotchas

- **`--legacy-peer-deps` is currently required on every install**, including single packages.
  `react-monaco-editor` pins `monaco-editor` and npm treats sub-1.0 minors as breaking.
- **`make start` never builds.** It loads whatever is already in `dist/`. Run `npm run build`
  first, or use `npm run dev`. Packaging targets use `build-if-changed`, which skips the build
  based on file mtimes vs `dist/app.js` — stale output is possible there too.
- **`npm run dev` serves over `http://localhost:4000`; `make start` loads `file://`.** Different
  origins, so security/CSP behavior differs — an issue can appear in one and not the other.
- **Monaco's `!feature` deny-list in `webpack.config.js`** must currently be kept in sync by hand
  with the editor options in `lib/note-content-editor.tsx`.

## Deploying

`npm run deploy <production|staging|develop>` builds and **force-pushes** to the `webapp`,
`webapp-staging`, or `webapp-develop` branch for VIP Go.

⚠️ **Don't run this to "test" anything.** `bin/deploy.sh` deletes every root file outside a
whitelist, force-deletes and recreates local branches, `git push -f`s, `git add --all`s, and
checks out `trunk` at the end. It is a human-initiated release step.

## More docs

`README.md` (setup), `CONTRIBUTING.md` (guidelines), `docs/packaging.md`,
`TESTING-CHECKLIST.md`, `RELEASE-NOTES.md`.
