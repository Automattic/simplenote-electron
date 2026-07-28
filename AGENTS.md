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

Despite the repo name, **a change to `lib/` ships to the web app too.** Verify both: `npm run dev`
covers desktop, and the same bundle in a browser at http://localhost:4000 covers web.

Stack: TypeScript, React, Redux, Sass, webpack, Monaco (editor), Simperium (sync), Electron,
electron-builder, jest.

## Setup

Node 20.10.0 (`.nvmrc` — the `engines` field in `package.json` is currently stale).

```bash
npm install --legacy-peer-deps   # the flag is required on EVERY install, see Gotchas
make decrypt_conf                # humans only — see below
```

Without `config-local.json`, webpack falls back to the committed `config.json`, so the app
builds and runs against a dev Simperium app. That is enough for development. Real credentials
need `make decrypt_conf`, which prompts for a password an agent won't have — don't attempt it.
Local dev also needs an existing account on the test server (see README).

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

**CRITICAL:** `window.electron` is injected by `desktop/preload.js` and **does not exist on web**.
Code in `lib/` MUST NOT assume Electron APIs, `process`, or Node built-ins are available. Branch
through `lib/utils/platform.ts` (`isElectron`, `isMac`, `isLinux`, `CmdOrCtrl`) instead.

## Checks

`npm run lint` runs eslint (flat config, `eslint.config.mjs`) **and** stylelint over `**/*.scss`.

**Currently, TypeScript is never type-checked.** `tsconfig.json` is `strict` + `noEmit`, but
nothing runs `tsc` — not the build (Babel strips types), not lint, not CI. Type errors currently
ship silently.

Tests are jest/jsdom, rooted at `desktop`, `lib`, `scripts`. `testRegex` matches `*.test.*`
**and every file under any `test/` directory** — put fixtures elsewhere or jest collects them.
Coverage is currently thin; add tests alongside new logic.

A `pre-commit` hook runs `pretty-quick --staged`, so prettier is authoritative — don't
hand-format.

CI (Buildkite) runs lint and tests at `NODE_ENV=test`, then packages all three platforms on
every build.

## Conventions

**`CONTRIBUTING.md` is required reading before touching `lib/state/`.** It is not general
contributor boilerplate — it defines the Redux/TypeScript patterns this codebase uses for typing
prop types, connecting components, and writing reducers, action types, and action creators. The
store is meant to stay fully typed. Follow those examples rather than inventing a pattern.

Type imports are consistent across modules:

```ts
import * as A from '../state/action-types'; // action types + reducer/creator helpers
import * as S from '../state'; // global state shape + connect() helpers
import * as T from '../types'; // data models, UI behaviors, platform helpers
```

**Every PR MUST resolve release notes.** Per `.github/PULL_REQUEST_TEMPLATE.md`, either add a
bullet under the top version heading in `RELEASE-NOTES.md`, or state in the PR that the change
doesn't need one. The template also requires a description and numbered test steps.

Some files have designated reviewers, so changing them widens the review: the Ruby dependency
surface, release tooling, CI and automation config, toolchain and environment pins, and secrets.
See `.github/CODEOWNERS` for the current list.

## Deliberate decisions

These are intentional. Work with them; don't "fix" them as cleanup.

- **Redux is hand-rolled**, not Redux Toolkit — plain `createStore` with an explicit middleware
  chain in `lib/state/index.ts`. Match the existing style.
- **Monaco ships as a deny-list**, trimming features we don't want rather than opting in.
- **Web deploys by force-pushing a built bundle** to a branch (see Deploying). Unusual, but it's
  how VIP Go consumes this repo.

## Gotchas

- **`--legacy-peer-deps` is currently required on every install**, including single packages.
  `react-monaco-editor` pins `monaco-editor` and npm treats sub-1.0 minors as breaking.
- **A dev or locally built app won't launch while the released Simplenote is running**, and vice
  versa — only one instance can run at a time. The second one exits silently, so `npm run dev`
  looks like it succeeded but no window appears; meanwhile the already-running app jumps to the
  foreground. Quit the other one first.
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

⚠️ **CRITICAL: agents MUST NOT run this** — not to test it, not to check that it works.
`bin/deploy.sh` deletes every root file outside a whitelist, force-deletes and recreates local
branches, `git push -f`s, `git add --all`s, and checks out `trunk` at the end. It is a
human-initiated release step.

## More docs

`README.md` (setup), `CONTRIBUTING.md` (Redux/TypeScript patterns — see Conventions),
`docs/packaging.md`, `TESTING-CHECKLIST.md`, `RELEASE-NOTES.md`.
