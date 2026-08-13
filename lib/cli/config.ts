import { readFileSync } from 'fs';
import * as path from 'path';
import { AuthError } from './domain/errors.ts';
import { CLI_VERSION_FALLBACK, DEFAULT_APP_ID } from './cli-constants.ts';

// Simplenote production app id. The desktop app's config.json ships a
// development app (history-analyst-dad), but magic-link tokens are issued
// against the production app, so the CLI must talk to the production app id.
// The default is the single source of truth shared with cli-constants.ts.
export const APP_ID: string = process.env.SIMPLENOTE_APP_ID ?? DEFAULT_APP_ID;

export const API_BASE = 'https://api.simperium.com/1';
export const AUTH_BASE = 'https://auth.simperium.com/1';

// Where the magic-link endpoints live. Kept here so the whole CLI has exactly
// one place that knows about Simplenote hosts.
export const ACCOUNT_BASE =
  process.env.SIMPLENOTE_ACCOUNT_BASE ?? 'https://app.simplenote.com/account';

/**
 * config.json lives at the repository root. Resolving it from the CLI's own
 * location first means the CLI works from any working directory; previously
 * the key was read relative to process.cwd(), so running the CLI from a
 * subdirectory silently produced an empty key and password login failed with
 * an opaque HTTP 401.
 *
 * The module can be executed in four shapes, each with a different `__dirname`:
 *  - source via tsx/jest: `lib/cli/` (config.ts is compiled in place);
 *  - bundled dist/cli.js: `lib/cli/dist/`;
 *  - SEA exe: inside the bundled copy, same as above;
 *  - ESM (tsx, the real CLI): `__dirname` is undefined, but the CLI always
 *    runs through bin/simplenote-cli.js, whose directory sits one level below
 *    the repo root.
 * A fixed `../..` depth cannot cover all four (bundled builds need three
 * levels to reach the root), so `moduleAnchors` walks upward from the module
 * directory until depth is exhausted. `process.cwd()` stays as a fallback
 * (npm run cli runs from the package root).
 *
 * Exported so `getVersion()` can resolve the same repo root for the version
 * read; both uses want "the root of the project this CLI was installed from".
 */
export const MAX_ANCHOR_DEPTH = 5;

/** `startDir` plus its ancestors, `depth` levels deep (including `startDir`). */
export function ancestorAnchors(
  startDir: string,
  depth: number = MAX_ANCHOR_DEPTH
): string[] {
  const dirs: string[] = [];
  let dir = path.resolve(startDir);
  for (let i = 0; i < depth; i += 1) {
    dirs.push(dir);
    dir = path.dirname(dir);
  }
  return dirs;
}

export function moduleAnchors(): string[] {
  const anchors: string[] = [];
  if (typeof __dirname === 'string') {
    anchors.push(...ancestorAnchors(__dirname));
  } else if (typeof process.argv[1] === 'string') {
    anchors.push(...ancestorAnchors(path.dirname(process.argv[1])));
  }
  anchors.push(process.cwd());
  return [...new Set(anchors)];
}

// The repository root's package.json name — the marker that says "this anchor
// belongs to this project". getAppKey stops its upward anchor walk here so a
// config.json from an unrelated ancestor directory is never picked up as the
// app_key source (a global install run from an arbitrary directory used to
// reach arbitrarily far up the tree, and a stray config.json anywhere above
// silently won). Must match the repo root's `package.json` "name" field
// exactly ("simplenote" — not the folder name "simplenote-electron").
const PROJECT_NAME = 'simplenote';

/** True when `dir` carries this project's package.json. */
function isProjectRoot(dir: string): boolean {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(dir, 'package.json'), 'utf8')
    ) as { name?: unknown };
    return typeof pkg.name === 'string' && pkg.name === PROJECT_NAME;
  } catch {
    // No package.json (or unreadable): not a project root, keep walking.
    return false;
  }
}

/**
 * The module anchor chain, truncated at the first project root (see
 * `isProjectRoot`), with `process.cwd()` kept as a one-level fallback
 * candidate. Inside the project the cwd is already in the module chain
 * (Set-deduplicated in moduleAnchors); an explicit run elsewhere still honors
 * a config/manifest in the current directory. Shared by getAppKey (config.json
 * candidates) and getVersion (manifest candidates) so neither ever walks past
 * the repository root into unrelated ancestor directories.
 */
function projectBoundedAnchors(): string[] {
  const cwd = process.cwd();
  const anchors: string[] = [];
  let projectRootReached = false;
  for (const anchor of moduleAnchors()) {
    if (projectRootReached && anchor !== cwd) {
      continue;
    }
    anchors.push(anchor);
    if (!projectRootReached && isProjectRoot(anchor)) {
      projectRootReached = true;
    }
  }
  return anchors;
}

/**
 * Config candidates for getAppKey: one `config.json` path per bounded anchor
 * (see `projectBoundedAnchors`), so a config.json from an unrelated ancestor
 * directory is never consulted.
 */
function candidateConfigPaths(): Array<{ anchor: string; configPath: string }> {
  return projectBoundedAnchors().map((anchor) => ({
    anchor,
    configPath: path.resolve(anchor, 'config.json'),
  }));
}

let cachedAppKey: string | undefined;

/**
 * Read lazily, not at module load: only password login needs the key, and a
 * missing config.json must not break `list`/`show`/`export`, which
 * authenticate with a stored token.
 *
 * `SIMPLENOTE_APP_KEY` wins over config.json, mirroring how `APP_ID` takes
 * `SIMPLENOTE_APP_ID` first. This is the injection channel for a production
 * app key: the repo's own config.json ships a *development* app key, so
 * password login fails with an opaque 401 when the CLI talks to the
 * production app id. An env-provided key sidesteps that without touching the
 * file (which is shared with the desktop app and must not be rewritten).
 */
export function getAppKey(): string {
  if (cachedAppKey !== undefined) {
    return cachedAppKey;
  }

  const envKey = process.env.SIMPLENOTE_APP_KEY;
  if (typeof envKey === 'string' && envKey.length > 0) {
    cachedAppKey = envKey;
    return cachedAppKey;
  }

  const attempts: string[] = [];
  for (const { configPath } of candidateConfigPaths()) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as {
        app_key?: unknown;
      };
      if (typeof parsed.app_key === 'string' && parsed.app_key.length > 0) {
        cachedAppKey = parsed.app_key;
        return cachedAppKey;
      }
      attempts.push(`${configPath}: no non-empty "app_key"`);
    } catch (error) {
      attempts.push(`${configPath}: ${(error as Error).message}`);
    }
  }

  throw new AuthError(
    `Cannot read app_key for password login. Set SIMPLENOTE_APP_KEY or provide ` +
      `a config.json with an "app_key". Tried:\n  ${attempts.join(
        '\n  '
      )}\nUse magic-link login instead (unset SIMPLENOTE_PASSWORD).`
  );
}

let cachedVersion: string | undefined;

/**
 * Manifests the CLI version can come from, in priority order:
 *
 *  1. the module's own package.json (lib/cli/package.json) — the CLI's
 *     independent version line;
 *  2. the repo root package.json — historical fallback (the desktop app's
 *     version), kept so a copy of the module without its own manifest still
 *     reports something truthful;
 *  3. `CLI_VERSION_FALLBACK` when neither is readable.
 *
 * `lib/cli/package.json` resolves differently per module system: `__dirname`
 * points at it under CommonJS (jest), while the tsx runtime runs through
 * bin/simplenote-cli.js whose parent is the repo root — so the module manifest
 * is derived from the same anchors `getAppKey` uses.
 */
function versionCandidatePaths(): string[] {
  const candidates: string[] = [];
  if (typeof __dirname === 'string') {
    candidates.push(path.resolve(__dirname, 'package.json'));
  }
  for (const anchor of projectBoundedAnchors()) {
    candidates.push(path.resolve(anchor, 'lib', 'cli', 'package.json'));
    candidates.push(path.resolve(anchor, 'package.json'));
  }
  return [...new Set(candidates)];
}

/**
 * The CLI version. Priority:
 *
 *  1. `SIMPLENOTE_CLI_VERSION`, the build-time stamp baked in by esbuild
 *     (`scripts/build.mjs`). A packaged copy — dist/cli.js, the SEA exe —
 *     reports the version it was built from even with no manifest next to it.
 *  2. The module's own package.json, then the repo root, then
 *     `CLI_VERSION_FALLBACK` (runtime reads for source/test runs).
 *
 * The read is lazy so a missing/unreadable manifest never breaks `--version`;
 * it falls back instead of failing.
 */
export function getVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  const baked = process.env.SIMPLENOTE_CLI_VERSION;
  if (typeof baked === 'string' && baked.length > 0) {
    cachedVersion = baked;
    return cachedVersion;
  }

  for (const candidate of versionCandidatePaths()) {
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
        version?: unknown;
      };
      if (typeof parsed.version === 'string' && parsed.version.length > 0) {
        cachedVersion = parsed.version;
        return cachedVersion;
      }
    } catch {
      // Not this candidate; try the next one before giving up.
    }
  }

  cachedVersion = CLI_VERSION_FALLBACK;
  return cachedVersion;
}
