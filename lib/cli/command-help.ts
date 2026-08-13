/**
 * Per-command help for `cli <command> --help`.
 *
 * This is static text, deliberately written out rather than generated from
 * AUTHENTICATED_COMMANDS: it exists for *humans* who do not have the source
 * open, so it reads like a manual page instead of a serialized flag table.
 * Keep the flags lists in sync with app.ts — the command-help test locks both.
 *
 * Global flags (`--verbose`, `--json` where applicable) are not re-listed per
 * command; `cli --help` documents them once.
 */

export const COMMAND_HELP: Record<string, string> = {
  login: `Usage: npm run cli -- login

Log in. Credentials come from SIMPLENOTE_USER (required) and SIMPLENOTE_PASSWORD
(password login), or a magic-link verification code prompt when no password is
set. Stored credentials are kept in ~/.simplenote-cli/credentials.json.

Flags: (none besides the global --verbose)

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 6 aborted`,

  logout: `Usage: npm run cli -- logout

Remove the stored credentials.

Flags: (none besides the global --verbose)

Exit codes: 0 ok | 1 usage | 6 aborted`,

  whoami: `Usage: npm run cli -- whoami [--json]

Print the logged-in username.

Flags:
  --json     Print a JSON object instead of a bare username

Exit codes: 0 ok | 1 usage | 2 auth | 6 aborted`,

  list: `Usage: npm run cli -- list [--limit=N] [--json] [--include-trashed]

List note summaries, most recently modified first. Trashed notes are skipped
unless --include-trashed is given.

Flags:
  --limit=N            Max results (default 20)
  --json               Print machine-readable JSON
  --include-trashed    Keep trashed notes in the result

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 6 aborted`,

  show: `Usage: npm run cli -- show <id> [--json]

Show a single note's content.

Flags:
  --json     Print machine-readable JSON

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 4 not found | 6 aborted`,

  search: `Usage: npm run cli -- search "<query>" [--limit=N] [--json] [--include-trashed]

Search note contents; supports tag: filters (e.g. "tag:recipes pasta").
Trashed notes are skipped unless --include-trashed is given.

Flags:
  --limit=N            Max results (default 50)
  --json               Print machine-readable JSON
  --include-trashed    Keep trashed notes in the result

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 6 aborted`,

  edit: `Usage: npm run cli -- edit <id> "<content>" [--json]

Replace a note's content. The new content can also come from --content= or
--file= instead of the second positional argument.

Flags:
  --json               Print machine-readable JSON
  --content=<text>     New content (alternative to the positional argument)
  --file=<path>        Read new content from a file

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 4 not found | 5 conflict | 6 aborted`,

  create: `Usage: npm run cli -- create "<content>" [--tags=a,b] [--json]

Create a note. The content can also come from --content= or --file= instead of
the positional argument.

Flags:
  --tags=a,b           Comma-separated tags to attach
  --json               Print machine-readable JSON
  --content=<text>     Note content (alternative to the positional argument)
  --file=<path>        Read note content from a file

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 6 aborted`,

  add: `Usage: npm run cli -- add --file=notes.json [--json]

Create multiple notes from a JSON array file. Idempotent: notes whose content
already exists (by hash) are skipped rather than duplicated.

Flags:
  --file=<path>        JSON array file to import (required)
  --json               Print machine-readable JSON

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 4 not found | 5 conflict | 6 aborted | 7 partial`,

  export: `Usage: npm run cli -- export [--format=all|json|markdown|zip] [--output=DIR]

Export notes. all (the default) writes json, markdown and zip. A single format
writes only that one.

Flags:
  --format=<fmt>       json, markdown, zip, or all (default all)
  --output=<dir>       Target directory (default ./simplenote-export)

Exit codes: 0 ok | 1 usage | 2 auth | 3 network | 6 aborted`,
};

/** Renders a command's help text, or an error marker for unknown commands. */
export function renderCommandHelp(command: string): string {
  return (
    COMMAND_HELP[command] ??
    `Unknown command: ${command}. Run: npm run cli -- help`
  );
}
