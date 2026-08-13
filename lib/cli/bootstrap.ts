// Executable entry point. Importing this file runs the CLI, so it stays as
// thin as possible — all behaviour lives in `app.ts`, which is importable
// without side effects and therefore testable.

import { flushStdio, main, messageOf } from './app.ts';
import { EXIT_UNKNOWN } from './domain/errors.ts';

/**
 * Lets the event loop close the process on its own, with a bounded fallback.
 *
 * `process.exitCode` alone is the correct way to finish: Node exits once the
 * loop is empty, after stdio has drained, so nothing can truncate a `--json`
 * payload. The catch is that Node's global fetch parks HTTP/1.1 sockets in a
 * keep-alive pool for a few seconds, which would leave the shell waiting on a
 * CLI that has nothing left to do.
 *
 * The timer is unref'd, so when the loop is already idle it never fires and
 * the process exits immediately. It only fires when something *is* still
 * holding the loop open — at which point stdio is long since flushed and
 * forcing the exit is safe.
 */
function exitWhenIdle(code: number, graceMs = 250): void {
  setTimeout(() => process.exit(code), graceMs).unref();
}

main()
  .then(exitWhenIdle)
  .catch(async (error) => {
    // Reaching here means the error escaped main()'s own handling, i.e. a bug
    // in the CLI rather than a failed operation.
    console.error(`Unexpected error: ${messageOf(error)}`);
    process.exitCode = EXIT_UNKNOWN;
    await flushStdio();
    exitWhenIdle(EXIT_UNKNOWN);
  });
