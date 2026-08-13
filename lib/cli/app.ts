// The CLI application: argv -> command dispatch -> exit code.
//
// `bootstrap.ts` is only the executable shim. Everything that decides *what
// happens* lives here so it can be unit tested: importing this module has no
// side effects, while importing bootstrap.ts runs the whole CLI.
//
// Layering (top to bottom; each layer depends only on layers below it):
//
//   app.ts                 process lifecycle, dispatch, exit codes, signals
//   commands/*.ts          one user-facing verb each, argv -> output
//   auth.ts                login flows (password, magic-link request/code)
//   export-helpers.ts      export staging/commit/rollback transaction
//   export-naming.ts       pure export file-name pipeline
//   note-source.ts         Simperium bucket operations
//   content-input.ts       --file= reading
//   cli-args.ts            argv parsing primitives
//   command-help.ts        per-command help text
//   store.ts               credential persistence (atomic write, permissions)
//   config.ts              app key / version resolution
//   logging.ts             debug output
//   infra/http.ts          the single fetch egress (timeout, retry, cancellation)
//   domain/*.ts            pure types, sorting, trash rules, tags, top-k,
//                          error taxonomy
//   vendor/*.ts            desktop-app mirrors (read-mostly). Two known runtime
//                          back-references exist and are recorded debt:
//                          `vendor/export/to-zip.ts -> export-naming.ts` and
//                          `vendor/export/export-notes.ts -> domain/trash`
//                          (import without .ts extension); see D-2 in the
//                          analysis plan.

import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { completeLogin, login, requestLoginEmail } from './auth.ts';
import type { Credentials } from './domain/types.ts';
import { clearCredentials, loadCredentials, saveCredentials } from './store.ts';
import { listCommand } from './commands/list.ts';
import { showCommand } from './commands/show.ts';
import { searchCommand } from './commands/search.ts';
import { exportCommand } from './commands/export.ts';
import { editCommand } from './commands/edit.ts';
import { createCommand } from './commands/create.ts';
import { addCommand } from './commands/add.ts';
import { whoamiCommand } from './commands/whoami.ts';
import {
  hasFlag,
  rejectExtraPositionals,
  tokenize,
  unknownFlags,
} from './cli-args.ts';
import { setExternalAbortSignal } from './infra/http.ts';
import { getVersion } from './config.ts';
import { renderCommandHelp } from './command-help.ts';
import { isVerbose, setVerbose } from './logging.ts';
import { FLUSH_GUARD_MS } from './cli-constants.ts';
import {
  AbortedError,
  AuthError,
  CliError,
  EXIT_ABORTED,
  EXIT_OK,
  UsageError,
  exitCodeFor,
  messageOf,
} from './domain/errors.ts';

// Re-exported so bootstrap.ts keeps a single import surface for the entry
// point while the implementation lives with the rest of the error taxonomy.
export { messageOf };

export const HELP = `Usage: npm run cli -- <command> [args]

Commands:
  login                          Log in (password via SIMPLENOTE_PASSWORD, or magic-link code prompt)
  logout                         Remove stored credentials
  whoami [--json]                Print the logged-in username
  list [--limit=N] [--json]      List note summaries, most recently modified first
  show <id> [--json]             Show a single note's content
  search "<query>" [--limit=N] [--json]   Search note contents (supports tag: filters)
                                 list/search skip the trash; add --include-trashed to keep it
  edit <id> "<content>" [--json] Replace a note's content (also --content= or --file=)
  create "<content>" [--tags=a,b] [--json]  Create a note (also --content= or --file=)
  add --file=notes.json [--json]            Create multiple notes from a JSON array file (idempotent)
  export [--format=all|json|markdown|zip] [--output=DIR]  Export notes

Flags may appear before or after positional arguments. Use \`--\` to stop flag
parsing, e.g. \`create -- "--not-a-flag"\`.

-v, --version                         Print the CLI version and exit
-h, --help                            Show this help; use \`cli <command> --help\` for a command's details
    --verbose                         Print request-level diagnostics to stderr (or set SIMPLENOTE_CLI_DEBUG=1)

Machine output (--json) goes to stdout; diagnostics and progress go to stderr.

Piping --json: npm prints its own banner to stdout, which corrupts the payload.
Use \`npm run --silent cli -- list --json\` (or call bin/simplenote-cli.js directly).

Environment:
  SIMPLENOTE_USER, SIMPLENOTE_PASSWORD   Credentials for \`login\`
  SIMPLENOTE_APP_KEY                     Override the app_key used for password login (falls back to config.json)
  SIMPLENOTE_CLI_TIMEOUT_MS              Per-request timeout (default 15000); the leftover budget of a paged fetch is floored at 1000ms
  SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS        Budget for a whole paged fetch (default 120000)
  SIMPLENOTE_CLI_DEBUG                   Set to 1 to enable --verbose diagnostics

Exit codes:
  0 ok  1 usage  2 auth  3 network  4 not found  5 conflict  6 aborted  7 partial  99 unexpected`;

type CommandHandler = (
  credentials: Credentials,
  args: string[]
) => Promise<void>;

type CommandSpec = {
  /** Prefix for the stderr line when this command fails. */
  label: string;
  /** Flag names this command understands, without the leading `--`. */
  flags: readonly string[];
  run: CommandHandler;
};

// A table instead of a switch: adding a command no longer means duplicating a
// try/catch, an exit code and a usage pre-check that could drift out of sync
// with the command module's own validation.
//
// `flags` is the single source of truth for what each verb accepts. Declaring
// it here (rather than only inside the command) is what lets the dispatcher
// reject `list --limt=5` before any network call happens.
export const AUTHENTICATED_COMMANDS: Record<string, CommandSpec> = {
  list: {
    label: 'List failed',
    flags: ['limit', 'json', 'include-trashed', 'verbose'],
    run: listCommand,
  },
  show: {
    label: 'Show failed',
    flags: ['json', 'verbose'],
    run: showCommand,
  },
  search: {
    label: 'Search failed',
    flags: ['limit', 'json', 'include-trashed', 'verbose'],
    run: searchCommand,
  },
  edit: {
    label: 'Edit failed',
    flags: ['json', 'content', 'file', 'verbose'],
    run: editCommand,
  },
  create: {
    label: 'Create failed',
    flags: ['json', 'tags', 'content', 'file', 'verbose'],
    run: createCommand,
  },
  add: {
    label: 'Add failed',
    flags: ['json', 'file', 'verbose'],
    run: addCommand,
  },
  export: {
    label: 'Export failed',
    flags: ['format', 'output', 'verbose'],
    run: exportCommand,
  },
  whoami: {
    label: 'Whoami failed',
    flags: ['json', 'verbose'],
    run: whoamiCommand,
  },
};

/**
 * Rejects flags the command does not understand.
 *
 * Silently ignoring `--limt=5` meant the user got the default 20 notes and no
 * hint that the run did not do what they asked. Unknown flags are a usage
 * error, checked before credentials are loaded so the failure is instant.
 */
export function validateFlags(
  command: string,
  allowed: readonly string[],
  args: string[]
): void {
  const unknown = unknownFlags(args, [...allowed]);
  if (unknown.length === 0) {
    return;
  }
  throw new UsageError(
    `Unknown flag${unknown.length > 1 ? 's' : ''} for ${command}: ${unknown.join(
      ', '
    )}. Accepted: ${allowed.map((flag) => `--${flag}`).join(', ') || '(none)'}`
  );
}

/**
 * Re-labels a command failure while preserving its exit code.
 *
 * Classification is by type, not by string matching. The previous
 * `message.startsWith('Note not found')` check meant renaming an error message
 * silently changed the process exit code.
 */
export function labelled(error: unknown, label: string): CliError {
  const relabelled = new CliError(
    exitCodeFor(error),
    `${label}: ${messageOf(error)}`
  );
  if (error instanceof Error && error.stack) {
    relabelled.stack = error.stack;
  }
  return relabelled;
}

async function requireCredentials(): Promise<Credentials> {
  const credentials = await loadCredentials();
  if (!credentials) {
    throw new AuthError(
      'Not logged in. Run: npm run cli -- login (with SIMPLENOTE_USER / SIMPLENOTE_PASSWORD set)'
    );
  }
  return credentials;
}

async function promptCode(
  username: string,
  signal?: AbortSignal
): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(
      `Verification code sent to ${username}. Enter the 6-character code: `,
      // Without the signal a Ctrl-C at the prompt left the readline interface
      // owning stdin, so the process kept running with nothing to do.
      signal ? { signal } : {}
    );
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      throw new AbortedError('Login cancelled');
    }
    throw error;
  } finally {
    rl.close();
  }
}

async function obtainCredentials(
  username: string,
  signal?: AbortSignal
): Promise<Credentials> {
  const password = process.env.SIMPLENOTE_PASSWORD;
  // A blank-but-set variable fails exactly like a missing one: a whitespace-
  // only password is not a password, and sending it would just earn a 401 the
  // user cannot distinguish from a genuinely wrong one. The *value* is passed
  // through untrimmed — a real password may legitimately contain leading or
  // trailing spaces — only the blank check trims.
  if (password !== undefined && password.trim().length > 0) {
    return login(username, password);
  }
  if (password !== undefined) {
    console.error(
      'SIMPLENOTE_PASSWORD is blank; falling back to magic-link login.'
    );
  }
  // The magic-link prompt needs a real terminal. With stdin piped (or already
  // closed) readline's question either resolves an empty line — burning a
  // single-use code against the server — or never settles and hangs the CLI.
  // Failing fast here is cheaper and clearer than either outcome, and it does
  // not waste the code-request email.
  if (!process.stdin.isTTY) {
    throw new UsageError(
      'Magic-link login requires an interactive terminal. Set SIMPLENOTE_PASSWORD for non-interactive login.'
    );
  }
  await requestLoginEmail(username);
  const code = await promptCode(username, signal);
  return completeLogin(username, code);
}

/**
 * Interactive or env-driven login.
 *
 * Note what is *not* here any more: the old version wrapped every failure in
 * `AuthError`, so a DNS outage and a keychain write failure both told the user
 * their password was wrong and exited 2. Errors now keep the code their own
 * layer assigned (auth 2 / network 3 / aborted 6), and persisting the token is
 * outside the authentication step because it is a different failure mode.
 */
export async function doLogin(signal?: AbortSignal): Promise<void> {
  // Trimmed so a blank-but-set variable fails exactly like a missing one: the
  // auth layer normalizes downstream, and a whitespace-only value would
  // otherwise be sent to the server as an empty username (or waste a code
  // email on the magic-link path).
  const username = process.env.SIMPLENOTE_USER?.trim();
  if (!username) {
    throw new AuthError(
      'Login requires a non-blank SIMPLENOTE_USER environment variable'
    );
  }

  const credentials = await obtainCredentials(username, signal);
  await saveCredentials(credentials);
  console.error(`Logged in as ${credentials.username}`);
}

/**
 * True when the args ask for a command's help.
 *
 * Uses tokenize's own classification: `--help` is a flag, so it always means
 * help; `-h` is a single-dash arg that tokenize treats as a positional, so it
 * only means help when it is the *only* positional. Anything after `--` is
 * literal content and must not trigger help (`create -- "-h"` writes the text
 * "-h"), and a content/query argument next to `-h` means the flag is data
 * (`edit <id> "-h"` writes "-h"; `search "foo" -h` is not help, though search
 * then rejects the extra positional and asks for one quoted query string).
 */
function wantsHelp(rest: string[]): boolean {
  const { flags, positionals, hasTerminator } = tokenize(rest);
  if (hasTerminator) {
    return false;
  }
  if (flags.includes('--help')) {
    return true;
  }
  return positionals.length === 1 && positionals[0] === '-h';
}

export async function run(argv: string[], signal?: AbortSignal): Promise<void> {
  const [command, ...rest] = argv;

  // `--verbose` is global: accepted by every command and also enabled from the
  // environment. Set before any dispatch so the HTTP layer's diagnostics are
  // live from the first fetch.
  setVerbose(
    process.env.SIMPLENOTE_CLI_DEBUG === '1' || hasFlag(argv, 'verbose')
  );

  if (
    command === undefined ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    console.error(HELP);
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    return;
  }

  // `--help`/`-h` on a known command prints that command's own help and exits
  // before credentials are loaded or the network is touched. An unknown
  // command with `--help` still fails as an unknown command below.
  if (
    command === 'login' ||
    command === 'logout' ||
    AUTHENTICATED_COMMANDS[command]
  ) {
    if (wantsHelp(rest)) {
      console.error(renderCommandHelp(command));
      return;
    }
  }

  if (command === 'login' || command === 'logout') {
    validateFlags(command, ['verbose'], rest);
    rejectExtraPositionals(rest, command, 0);
    try {
      if (command === 'login') {
        await doLogin(signal);
        return;
      }
      await clearCredentials();
      console.error('Logged out');
      return;
    } catch (error) {
      throw labelled(
        error,
        command === 'login' ? 'Login failed' : 'Logout failed'
      );
    }
  }

  const spec = AUTHENTICATED_COMMANDS[command];
  if (!spec) {
    throw new UsageError(
      `Unknown command: ${command}. Run: npm run cli -- help`
    );
  }

  // Argv problems are reported before the network is touched, so a typo costs
  // a millisecond instead of a round trip plus a misleading result.
  validateFlags(command, spec.flags, rest);

  const credentials = await requireCredentials();
  try {
    await spec.run(credentials, rest);
  } catch (error) {
    throw labelled(error, spec.label);
  }
}

/**
 * Waits for buffered stdio to reach the OS before the process dies.
 *
 * When stdout is a pipe, Node's writes are asynchronous. Exiting straight
 * after console.log() therefore truncated `--json` payloads, which is exactly
 * the case a script consumes. The unref'd guard keeps a broken pipe from
 * hanging the CLI forever.
 */
function drain(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (
      stream.writableEnded ||
      stream.destroyed ||
      stream.writableLength === 0
    ) {
      resolve();
      return;
    }
    stream.write('', () => resolve());
  });
}

export function flushStdio(): Promise<unknown> {
  const guard = new Promise<void>((resolve) => {
    setTimeout(resolve, FLUSH_GUARD_MS).unref();
  });
  return Promise.race([
    Promise.all([drain(process.stdout), drain(process.stderr)]),
    guard,
  ]);
}

/**
 * `npm run cli -- list | head -3` closes the pipe early. Without this the CLI
 * dies with an unhandled EPIPE stack trace instead of exiting quietly.
 *
 * It must not *invent* a success either: the previous `process.exit(0)` here
 * turned "auth failed, and the reader hung up" into exit 0, so `set -e`
 * pipelines happily continued on a failed command.
 */
// The guard is process-global state, so registering it must be idempotent:
// every repeat call used to attach another pair of 'error' listeners, and a
// process that runs main() more than once (test harnesses, embedded use)
// would accumulate handlers until Node warns about a possible listener leak.
let brokenPipeGuardInstalled = false;

export function ignoreBrokenPipe(): void {
  if (brokenPipeGuardInstalled) {
    return;
  }
  brokenPipeGuardInstalled = true;
  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') {
        return;
      }
      process.exitCode ??= EXIT_OK;
      stream.destroy();
    });
  }
}

export type Lifecycle = {
  /** Aborts in-flight work when the user interrupts the CLI. */
  signal: AbortSignal;
  aborted: () => boolean;
  dispose: () => void;
};

/**
 * Turns SIGINT/SIGTERM into a cooperative cancellation.
 *
 * Before this, Ctrl-C during `export` killed the process mid-write and left a
 * half-written file with no message; a paged `list` kept its socket open until
 * the OS reaped it. The signal is handed to infra/http so the in-flight fetch
 * aborts, and a second interrupt is treated as "I mean it" and exits at once.
 */
export function installSignalHandlers(): Lifecycle {
  const controller = new AbortController();
  let signalled = false;

  const onSignal = (): void => {
    if (signalled) {
      // The graceful unwind is not making progress and the user asked twice.
      process.exit(EXIT_ABORTED);
    }
    signalled = true;
    controller.abort();
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  // Windows Ctrl-Break. Without a handler the process is killed by the default
  // action before stdio can flush; with one it cooperates like Ctrl-C.
  // (POSIX ignores SIGBREAK, so registering it there is harmless.)
  process.on('SIGBREAK', onSignal);
  setExternalAbortSignal(controller.signal);

  return {
    signal: controller.signal,
    aborted: () => signalled,
    dispose: () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      process.off('SIGBREAK', onSignal);
      setExternalAbortSignal(null);
    },
  };
}

/**
 * Runs the CLI and resolves with the exit code.
 *
 * `process.exitCode` is set rather than calling `process.exit()`, so Node is
 * allowed to finish flushing stdio on its own; the caller decides when (and
 * whether) to force the process down.
 */
export async function main(
  argv: string[] = process.argv.slice(2)
): Promise<number> {
  ignoreBrokenPipe();
  const lifecycle = installSignalHandlers();

  let code = EXIT_OK;
  try {
    await run(argv, lifecycle.signal);
  } catch (error) {
    // An interrupted run reports "aborted" (6) regardless of which layer
    // noticed first — an aborted fetch surfacing as a network error would
    // otherwise be indistinguishable from a real outage.
    code = lifecycle.aborted() ? EXIT_ABORTED : exitCodeFor(error);
    console.error(lifecycle.aborted() ? 'Aborted' : messageOf(error));
    // An unexpected (non-CliError) failure keeps its network-ish exit code so
    // the public contract is untouched, but --verbose still exposes the stack
    // so a real bug is not silently disguised as an outage.
    if (
      !lifecycle.aborted() &&
      isVerbose() &&
      error instanceof Error &&
      error.stack
    ) {
      console.error(error.stack);
    }
  }
  // A Ctrl-C that lands while no fetch is in flight (the local phase — export
  // writing files, login persisting credentials, any command's console output)
  // does not make run() throw: the command simply completes. Map it to aborted
  // here, the single point every command and every phase converges on.
  if (lifecycle.aborted()) {
    code = EXIT_ABORTED;
  }

  process.exitCode = code;
  try {
    await flushStdio();
  } finally {
    // The handlers stay installed through the drain: without them a Ctrl-C in
    // this window hits Node's default handler and kills the process before
    // stdout finishes writing, truncating a piped --json payload. A first
    // interrupt here only aborts an already-finished run; a second one still
    // means "I mean it" and exits at once.
    lifecycle.dispose();
  }
  // A first Ctrl-C during the flush window sets the flag but leaves `code` as
  // the command computed — re-check after the drain so an interrupted run
  // still reports "aborted" (6) per the public contract. The command itself
  // already finished and its output was flushed, so this only changes the
  // exit code, never the data.
  if (lifecycle.aborted()) {
    code = EXIT_ABORTED;
    process.exitCode = EXIT_ABORTED;
  }
  return code;
}
