// Shared argv primitives.
//
// Every command used to re-implement flag scanning by hand. That duplication
// is why `show --json <id>` parsed `--json` as the note id, and why `create`
// and `edit` carried two near-identical copies of the same content-source
// rules. Parsing lives here once; commands only describe what they need.

import { UsageError } from './domain/errors.ts';
import { normalizeTags } from './domain/tags.ts';
import type { ContentSource } from './domain/types.ts';

export type TokenizedArgs = {
  /** `--name=value` / `--flag` arguments (post-`--` args are excluded). */
  flags: string[];
  /** Everything that is not a flag, including anything after a `--` terminator. */
  positionals: string[];
  /** True when a `--` terminator was present (flags after it are positionals). */
  hasTerminator: boolean;
};

/**
 * Splits argv into flags and positionals, honoring a `--` terminator.
 *
 * Without this, `create "hello world"` (two shell words) or
 * `create -- "--heading"` (content that looks like a flag) cannot be told
 * apart from real flags. Flags are scanned only from `flags`, so a positional
 * that happens to start with `--` is never misread as an option.
 */
export function tokenize(args: string[]): TokenizedArgs {
  const flags: string[] = [];
  const positionals: string[] = [];
  let hasTerminator = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      hasTerminator = true;
      // Everything after `--` is a literal positional, even if it starts with `--`.
      for (let j = i + 1; j < args.length; j++) {
        positionals.push(args[j]);
      }
      break;
    }
    if (arg.startsWith('--')) {
      flags.push(arg);
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals, hasTerminator };
}

/**
 * After a `--` terminator every word is a literal positional (tokenize
 * guarantees it), so unquoted multi-word content is one string there — the
 * whole point of the escape hatch. Words before `--` keep the "quote
 * multi-word" error, so a forgotten quote still cannot silently drop data.
 */
function mergeTerminatedPositionals(
  args: string[],
  positionals: string[]
): string[] {
  const terminatorIndex = args.indexOf('--');
  if (terminatorIndex === -1) {
    return positionals;
  }
  const beforeCount = args
    .slice(0, terminatorIndex)
    .filter((arg) => !arg.startsWith('--')).length;
  const after = positionals.slice(beforeCount);
  return after.length <= 1
    ? positionals
    : [...positionals.slice(0, beforeCount), after.join(' ')];
}

/** Flags only — ignores anything after a `--` terminator. */
function flagsOf(args: string[]): string[] {
  return tokenize(args).flags;
}

/**
 * True when `--name` was given in any form: bare (`--json`) or valued
 * (`--json=1`). Booleans only care about presence; treating `--json=1` as
 * absent used to silently drop the JSON request and print tabular output with
 * no hint that the flag was ignored.
 */
export function hasFlag(args: string[], name: string): boolean {
  return flagsOf(args).some(
    (arg) => arg === `--${name}` || arg.startsWith(`--${name}=`)
  );
}

/**
 * True only when `--name` appears as a bare flag (no `=value`). A flag that
 * expects a value but got none is a usage error, not a silent fallback to the
 * default, so `list --limit` (forgetting the `=N`) no longer quietly returns
 * 20 notes.
 */
export function hasBareFlag(args: string[], name: string): boolean {
  return flagsOf(args).includes(`--${name}`);
}

export function flagValues(args: string[], name: string): string[] {
  const prefix = `--${name}=`;
  return flagsOf(args)
    .filter((arg) => arg.startsWith(prefix))
    .map((arg) => arg.slice(prefix.length));
}

/**
 * The "exactly one `--name=value`" rule shared by every single-valued flag.
 *
 * Collapses the three checks each command used to repeat by hand — a bare flag
 * (no `=`), the same flag given twice, and an explicit-but-empty value — into
 * one helper. Returns the value, or `undefined` when the flag is absent. Uses
 * `flagValues`, which slices instead of splitting on `=`, so values that
 * themselves contain `=` (paths, base64) survive intact. `example` only shapes
 * the error messages (`--format requires a value, e.g. --format=json`), so a
 * command keeps its own wording without re-implementing the checks.
 */
export function parseSingleValueFlag(
  args: string[],
  name: string,
  example: string
): string | undefined {
  if (hasBareFlag(args, name)) {
    throw new UsageError(
      `--${name} requires a value, e.g. --${name}=${example}`
    );
  }
  const values = flagValues(args, name);
  if (values.length > 1) {
    throw new UsageError(`Provide --${name}= once (e.g. --${name}=${example})`);
  }
  const raw = values[0];
  if (raw === '') {
    throw new UsageError(`--${name} cannot be empty`);
  }
  return raw;
}

/**
 * `--limit=N`. Absent -> fallback. Anything that is not a positive integer
 * (0, negatives, decimals, hex, garbage) is a usage error rather than a silent
 * fallback, so `list --limit=abc` no longer quietly returns the default.
 */
export function parseLimit(args: string[], fallback: number): number {
  if (hasBareFlag(args, 'limit')) {
    throw new UsageError('--limit requires a value, e.g. --limit=20');
  }

  const values = flagValues(args, 'limit');
  if (values.length > 1) {
    throw new UsageError('Provide --limit= once (e.g. --limit=20)');
  }
  const raw = values[0];
  if (raw === undefined) {
    return fallback;
  }
  // Number() also coerces "0x10" (16), "1e3" (1000), " 5 " (5) and "5.0" (5)
  // into integers, so those used to slip past `Number.isInteger`. A positive
  // integer has exactly the shape of decimal digits with a non-zero total.
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    throw new UsageError(`--limit must be a positive integer, got: ${raw}`);
  }
  return Number(raw);
}

/**
 * Pulls the first non-flag argument out of argv and returns everything else
 * untouched, so `edit --json <id> "text"` and `edit <id> "text" --json` are
 * equivalent instead of the former silently using `--json` as the id.
 *
 * `rest` is re-assembled so that tokenizing it again yields the same
 * classification. `edit`/`show`/`search` parse in two phases (take the id,
 * then parse the remainder), and dropping the `--` terminator here meant the
 * second phase re-read post-terminator words as flags:
 *
 *   edit -- <id> "--dashed content"
 *     -> rest ["--dashed content"] -> re-tokenized as a *flag*
 *     -> "edit requires new content", i.e. the documented `--` escape hatch
 *        was unusable for every verb that takes a leading positional.
 *
 * Re-inserting the terminator makes the round-trip lossless.
 */
export function takeFirstPositional(args: string[]): {
  value?: string;
  rest: string[];
} {
  const { positionals, flags, hasTerminator } = tokenize(args);
  if (positionals.length === 0) {
    return { rest: flags };
  }
  const [value, ...restPositionals] = positionals;
  // The terminator is only needed while literal positionals remain; without
  // any it would be inert noise in the returned argv.
  const separator = hasTerminator && restPositionals.length > 0 ? ['--'] : [];
  return { value, rest: [...flags, ...separator, ...restPositionals] };
}

/**
 * The "exactly one of positional / --content= / --file=" rule shared by
 * `create` and `edit`. `verb` and `noun` keep each command's wording.
 */
export function parseContentSource(
  args: string[],
  verb: string,
  noun: string
): ContentSource {
  // A bare `--content`/`--file` (no `=value`) is a forgotten value, not an
  // absent flag: reporting "requires new content" would send the user chasing
  // the wrong fix. Error with the precise message instead, like the other
  // single-valued flags do.
  if (hasBareFlag(args, 'content')) {
    throw new UsageError(`--content requires a value, e.g. --content=${noun}`);
  }
  if (hasBareFlag(args, 'file')) {
    throw new UsageError('--file requires a value, e.g. --file=notes.json');
  }
  const { positionals, hasTerminator } = tokenize(args);
  const contentFlags = flagValues(args, 'content');
  const fileFlags = flagValues(args, 'file');
  const contentFlag = contentFlags[0];
  const fileFlag = fileFlags[0];

  // The same flag twice silently kept only its first value, so
  // `create --content=a --content=b` created note "a" and threw "b" away.
  // Erroring (like add does for --file) is safer than guessing which one won.
  if (contentFlags.length > 1) {
    throw new UsageError(`Provide the ${noun} once (--content= appears twice)`);
  }
  if (fileFlags.length > 1) {
    throw new UsageError(`Provide the ${noun} once (--file= appears twice)`);
  }

  // An explicit-but-empty value is a mistake, not a request to read a blank
  // string: `--file=` used to fall through to `readContentSource`, which
  // reported "Cannot read --file=: ENOENT" for a path the user never wrote.
  if (contentFlag === '') {
    throw new UsageError(`--content= cannot be empty (provide ${noun})`);
  }
  if (fileFlag === '') {
    throw new UsageError('--file= cannot be empty (provide a path)');
  }

  // A single positional is the content. More than one means the user forgot to
  // quote multi-word content; erroring is safer than silently dropping every
  // word but the first (which would lose data on `create a b`). After a `--`
  // terminator, though, every word is explicitly literal, so they fold into
  // one content string (`create -- a b` === `create "a b"`).
  const effectivePositionals = hasTerminator
    ? mergeTerminatedPositionals(args, positionals)
    : positionals;
  if (effectivePositionals.length > 1) {
    throw new UsageError(`Provide the ${noun} once (quote multi-word ${noun})`);
  }
  const positional = effectivePositionals[0];

  const provided = [positional, contentFlag, fileFlag].filter(
    (value) => value !== undefined
  );

  if (provided.length === 0) {
    throw new UsageError(
      `${verb} requires ${noun} (positional, --content=, or --file=)`
    );
  }
  if (provided.length > 1) {
    throw new UsageError(
      `Provide the ${noun} once (positional, --content=, or --file=)`
    );
  }

  if (fileFlag !== undefined) {
    return { content: fileFlag, fromFile: true };
  }
  if (contentFlag !== undefined) {
    return { content: contentFlag, fromFile: false };
  }
  return { content: positional as string, fromFile: false };
}

/** Comma-separated `--tags=a,b,c`, trimmed, de-blanked, de-duplicated. */
export function parseTags(args: string[]): string[] {
  // `--tags` without `=value` used to fold into an empty array and create a
  // note with no tags at all, silently dropping the user's intent.
  if (hasBareFlag(args, 'tags')) {
    throw new UsageError('--tags requires a value, e.g. --tags=a,b');
  }
  const tags = flagValues(args, 'tags');
  if (tags.length > 1) {
    throw new UsageError('Provide --tags= once (e.g. --tags=a,b)');
  }
  const raw = tags[0];
  if (raw === undefined) {
    return [];
  }
  return normalizeTags(raw.split(','), '--tags=');
}

/**
 * Returns the flags in `args` that are not in `allowed` (e.g. `["--limt"]`).
 * Used by the dispatcher so a typo like `list --limt=5` fails loudly instead of
 * silently falling back to the default.
 */
export function unknownFlags(args: string[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed.map((name) => `--${name}`));
  return flagsOf(args).filter((flag) => {
    // `--json` / `--include-trashed` are bare flags; `--limit=5` carries a value.
    const base = flag.includes('=') ? flag.slice(0, flag.indexOf('=')) : flag;
    return !allowedSet.has(base);
  });
}

/**
 * Errors when the command was handed more positional arguments than it takes.
 *
 * `show n1 n2` used to ignore `n2` and `list extra` ignored `extra` entirely;
 * a stray argument is almost always a typo or an unquoted multi-word value,
 * so it is a usage error rather than silent data loss.
 *
 * `consumed` is the number of positionals the caller already removed from
 * `args` (via `takeFirstPositional`) and is added to both sides of the
 * comparison. `show n1 n2` is checked *after* the id is taken, so without it
 * the message read "got 1, expected at most 0" for a command the user handed
 * two arguments and that legitimately accepts one.
 */
export function rejectExtraPositionals(
  args: string[],
  command: string,
  max: number,
  consumed = 0
): void {
  const { positionals } = tokenize(args);
  const got = positionals.length + consumed;
  const allowed = max + consumed;
  if (got > allowed) {
    throw new UsageError(
      `Too many arguments for ${command}: got ${got}, expected at most ${allowed}`
    );
  }
}
