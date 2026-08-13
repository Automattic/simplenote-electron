// Single home for the magic values scattered through the CLI.
//
// Previously each file hard-coded its own literals (20, 50, 60, 2000, 16,
// 40, 75, ...) with no name and no explanation of why that number. Centralizing
// them makes the limits discoverable and the reasoning auditable. Every module
// that needs a constant imports it directly (http, export-helpers, config,
// note-source, export-naming, app, commands/list, commands/search,
// commands/add, ...); nothing re-exports this module.

/** Simplenote production app id (magic-link tokens are issued against it). */
export const DEFAULT_APP_ID = 'chalk-bump-f49';

/** Default result window for `list`. */
export const LIST_DEFAULT_LIMIT = 20;

/** Version reported by `--version` when the repo root package.json is unreadable. */
export const CLI_VERSION_FALLBACK = '0.0.0';

/** Default result window for `search`. */
export const SEARCH_DEFAULT_LIMIT = 50;

/** Preview width (characters) used by the non-JSON `list` output. */
export const PREVIEW_WIDTH = 60;

/** Grace period to drain stdio before giving up (milliseconds). */
export const FLUSH_GUARD_MS = 2_000;

/** Hard cap on index pagination rounds before we give up (anti-runaway). */
export const MAX_PAGES = 1_000;

/** Wall-clock budget for a whole command (pagination, retries included). */
export const DEFAULT_TOTAL_TIMEOUT_MS = 120_000;

/** Page size requested from the Simperium index to limit round-trips. */
export const INDEX_PAGE_SIZE = 1_000;

/** Bounded fan-out when writing exported note files. */
export const WRITE_CONCURRENCY = 16;

/** Bounded fan-out when importing notes from a file (`add --file=`). */
export const IMPORT_CONCURRENCY = 8;

/** Truncated length of a note's first line, used as a file name. */
export const FILENAME_LENGTH = 40;

/** Maximum line length before a tag list wraps to a new line. */
export const TAG_LINE_LENGTH = 75;

/** Exponential backoff bounds (full jitter, AWS Architecture Blog). */
export const BASE_BACKOFF_MS = 300;
export const MAX_BACKOFF_MS = 4_000;

// Retry-After is the server's explicit instruction and is honored far above
// the local backoff cap — but still bounded, so a hostile or buggy
// "Retry-After: 86400" cannot park the CLI for a day. Abort and deadlineAt
// stay authoritative and can interrupt the wait at any time.
export const MAX_RETRY_AFTER_MS = 30_000;
/** Floor so a "backoff" is never a zero-delay immediate retry. */
export const MIN_BACKOFF_MS = 50;

/**
 * Floor for a single attempt's deadline when an overall budget is nearly spent.
 * Without it, the last attempt of a long pagination run would be handed a
 * negative timeout and abort before the socket was even opened.
 */
export const MIN_ATTEMPT_TIMEOUT_MS = 1_000;

/**
 * Consecutive failures tolerated by a batch command before it stops.
 * A whole import failing one note at a time is slower and noisier than
 * failing fast once the backend is clearly unavailable.
 */
export const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Reads a positive-integer environment variable, falling back when it is
 * absent or not a positive number.
 *
 * `Number()` coercion is kept deliberately (so "15", " 15 " and "0x10" behave
 * exactly as the call sites relied on before this helper existed); only the
 * duplicated parsing is being unified.
 */
export function envPositiveInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
