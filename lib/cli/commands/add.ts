import { createHash } from 'crypto';
import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import type { NewNote, NoteSource } from '../domain/types.ts';
import { hasFlag, parseSingleValueFlag } from '../cli-args.ts';
import { readContentSource } from '../content-input.ts';
import { isTrashed } from '../domain/trash.ts';
import { normalizeTags } from '../domain/tags.ts';
import {
  IMPORT_CONCURRENCY,
  MAX_CONSECUTIVE_FAILURES,
} from '../cli-constants.ts';
import {
  UsageError,
  PartialError,
  AbortedError,
  AuthError,
  CliError,
  RateLimitError,
  exitCodeFor,
  messageOf,
} from '../domain/errors.ts';

export type AddOptions = {
  file: string;
  json: boolean;
};

export function parseAddOptions(args: string[]): AddOptions {
  // parseSingleValueFlag covers the bare/duplicate/empty cases with the same
  // messages as every other single-valued flag; only the "required" rule is
  // add-specific and stays here.
  const file = parseSingleValueFlag(args, 'file', 'notes.json');
  if (file === undefined) {
    throw new UsageError(
      'add requires --file=notes.json (JSON array of {content, tags?})'
    );
  }
  return { file, json: hasFlag(args, 'json') };
}

type AddEntry = { content: string; tags?: string[] };

// Stable fingerprint for idempotent import: identical content + same tag set
// (order-normalized) must collide, so re-running an import file skips notes
// that already exist instead of creating duplicates.
function fingerprint(note: {
  content?: string;
  tags?: readonly string[];
}): string {
  // Tags are trimmed, de-duplicated and case-folded on both sides of the
  // comparison. Import-file tags were already cleaned by parseNotesFile; tags
  // read back from the server may carry stray whitespace (e.g. desktop-created
  // tags), duplicates, or casing differences — search matches tags
  // case-insensitively, so the fingerprint must agree or "work" vs "WORK"
  // silently re-imports a duplicate. Content is line-break-normalized: an
  // export round-trip (normalizeLineBreak -> CRLF) followed by an import (LF)
  // must still dedup. Both are also Unicode-normalized (NFC): macOS writes NFD
  // and Windows/Linux write NFC, so "café" exported on one platform must
  // collide with the same text typed on the other — otherwise a cross-platform
  // round-trip silently duplicates the note.
  const tags = [
    ...new Set(
      [...(note.tags ?? [])].map((tag) =>
        tag.trim().toLowerCase().normalize('NFC')
      )
    ),
  ]
    .sort()
    .join(',');
  const content = (note.content ?? '').replace(/\r\n/g, '\n').normalize('NFC');
  return createHash('sha1').update(`${content}\u0000${tags}`).digest('hex');
}

function parseNotesFile(raw: string): AddEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UsageError('Invalid JSON in the notes file');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new UsageError('The notes file must contain a non-empty JSON array');
  }
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new UsageError(`Notes file entry ${index} is not an object`);
    }
    const content = (entry as { content?: unknown }).content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new UsageError(
        `Notes file entry ${index} has no non-blank content`
      );
    }
    const tags = (entry as { tags?: unknown }).tags;
    let parsedTags: string[] | undefined;
    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
        throw new UsageError(`Notes file entry ${index} has invalid tags`);
      }
      // Same normalization as parseTags: trim, drop blanks, reject line breaks,
      // drop duplicates — so empty/duplicate tags are never uploaded and the
      // dedup fingerprint agrees with `create --tags=`.
      parsedTags = normalizeTags(tags as string[], `notes file entry ${index}`);
    }
    return { content, tags: parsedTags };
  });
}

/**
 * Why the batch ended. Naming the four endings is what keeps the reporting and
 * the exit-code decision from re-deriving them from flag combinations: each
 * one means something different to the user (the server is down / your token
 * expired / you pressed Ctrl-C / we got to the end) and each needs its own
 * line of output.
 */
type StopReason =
  | 'complete'
  | 'consecutive-failures'
  | 'rate-limited'
  | 'auth'
  | 'aborted';

type ImportOutcome = {
  created: Array<{ index: number; id: string; version: number }>;
  // Skipped entries carry only their index: dedup keys off the fingerprint,
  // and echoing the full content doubled the report size on a re-import.
  skipped: Array<{ index: number }>;
  failures: Array<{ index: number; error: string }>;
  stopReason: StopReason;
  /**
   * Rethrown by the caller *after* the report is printed, so the exit code
   * still names the real cause (2 auth / 6 aborted) while the ids of the
   * notes that did land are not swallowed with it.
   */
  terminalError?: CliError;
  /** First per-item failure, used to pick an exit code when nothing worked. */
  firstFailure?: unknown;
};

/**
 * Errors that make every remaining entry futile.
 *
 * A bad token can never fix itself mid-run, and a Ctrl-C is the user telling
 * us to stop. Both used to fall through to the generic failure path (only
 * `AuthError` was special-cased), so an interrupt turned into a burst of
 * MAX_CONSECUTIVE_FAILURES doomed requests — each one rejected instantly by
 * the transport's cancellation pre-check — followed by a "Stopped early after
 * 5 consecutive failures" that blamed the server for the user's own Ctrl-C.
 */
function terminalStop(error: unknown): StopReason | undefined {
  if (error instanceof AuthError) {
    return 'auth';
  }
  if (error instanceof AbortedError) {
    return 'aborted';
  }
  // A 429 is the server asking us to slow down: on a write path with no
  // retries (duplicate-note safety) every further entry will be refused too,
  // so stop on the first one instead of five doomed attempts. The report
  // names the real cause rather than "backend unavailable".
  if (error instanceof RateLimitError) {
    return 'rate-limited';
  }
  return undefined;
}

async function importNotes(
  source: NoteSource,
  entries: AddEntry[],
  existingFingerprints: Set<string>
): Promise<ImportOutcome> {
  const created: ImportOutcome['created'] = [];
  const skipped: ImportOutcome['skipped'] = [];
  const failures: ImportOutcome['failures'] = [];
  let firstFailure: unknown;
  let consecutiveFailures = 0;
  let stopReason: StopReason = 'complete';
  let terminalError: CliError | undefined;

  // Serializes entries that share a fingerprint. The concurrent pool must not
  // create two notes with identical content at the same time — the serial
  // implementation could not either, because the first create completed
  // before the second entry was even looked at. Each follower awaits its
  // key's previous result: a success dedups it, a plain failure lets it try,
  // a terminal stop stands it down.
  const pending: Map<string, Promise<'ok' | 'failed'>> = new Map();
  // Shared cursor: every worker grabs the next index in one synchronous step,
  // so no two workers can claim the same entry.
  let cursor = 0;

  const stopped = () => stopReason !== 'complete';

  async function processEntry(index: number): Promise<void> {
    const entry = entries[index];
    // Hashed once per entry. The fingerprint is a SHA-1 over the full note
    // body, and it used to be recomputed for the dedup insert right after the
    // dedup lookup — doubling the hashing cost of every large import.
    const key = fingerprint(entry);
    if (existingFingerprints.has(key)) {
      skipped.push({ index });
      return;
    }

    // The chain, not a fan-out. The old code let every follower await the same
    // `prior` promise; when the predecessor failed, two followers both fell
    // through and created concurrently — three identical entries with the
    // first one failing produced *two* duplicates on the server. Chaining the
    // new attempt onto the key's current tail makes W3's create run only after
    // W2's attempt settles: a success dedups it, a failure lets it try, a stop
    // stands it down — exactly like the serial loop.
    const prior = pending.get(key) ?? Promise.resolve('failed' as const);
    const attempt = prior.then(
      async (priorResult): Promise<'ok' | 'failed'> => {
        // The predecessor (or an earlier link in the chain) already created
        // this key, so this entry is a duplicate of a note that landed.
        if (priorResult === 'ok' || existingFingerprints.has(key)) {
          skipped.push({ index });
          return 'ok';
        }
        // A terminal stop (auth/aborted) or the consecutive-failure stop stands
        // this entry down too, mirroring the serial `break`.
        if (stopped()) {
          return 'failed';
        }
        try {
          const { id, version } = await source.create(entry as NewNote);
          created.push({ index, id, version });
          // Guards against duplicates *within* one import file, not just against
          // notes that already existed on the server.
          existingFingerprints.add(key);
          // A success is evidence the backend is healthy, so the streak of
          // failures no longer says "the server is down".
          consecutiveFailures = 0;
          return 'ok';
        } catch (error) {
          const terminal = terminalStop(error);
          if (terminal) {
            stopReason = terminal;
            terminalError = error as CliError;
            return 'failed';
          }
          if (firstFailure === undefined) {
            firstFailure = error;
          }
          // `messageOf` rather than `error.message`: a rejection that is not an
          // Error (a string throw, a plain object from a stray library) rendered
          // as `undefined` in the failure list, which told the user nothing.
          failures.push({ index, error: messageOf(error) });
          // A burst of consecutive failures means the backend is unavailable (or
          // the token is bad in a way auth detection missed). Grinding through
          // the rest one-by-one only delays the error the user is waiting for and
          // hammers a server that is already struggling. A skip does not reset
          // the streak: a skip is not evidence the backend is healthy, it never
          // touched the network.
          if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            stopReason = 'consecutive-failures';
          }
          return 'failed';
        }
      }
    );
    // Register the chain tail before anyone else reads the key: a follower
    // that reads `pending.get(key)` now awaits this full operation.
    pending.set(key, attempt);
    await attempt;
    // Release the chain once it has fully settled. Only the *tail* may be
    // removed: deleting an intermediate link — one a follower already chained
    // onto — would let that follower's create race a later one. If we are not
    // the tail, a follower has registered behind us and the check below leaves
    // the map untouched; after settlement the existingFingerprints guard is
    // authoritative either way. This keeps a large import's map from growing
    // linearly with the number of distinct fingerprints it has seen.
    if (pending.get(key) === attempt) {
      pending.delete(key);
    }
  }

  async function worker(): Promise<void> {
    while (!stopped()) {
      const index = cursor++;
      if (index >= entries.length) {
        return;
      }
      await processEntry(index);
    }
  }

  const poolSize = Math.min(IMPORT_CONCURRENCY, entries.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  // Completion order is nondeterministic under concurrency; restore the input
  // order the serial implementation guaranteed so reports (and the json
  // arrays) stay stable and the index column keeps pointing at the file.
  created.sort((a, b) => a.index - b.index);
  skipped.sort((a, b) => a.index - b.index);
  failures.sort((a, b) => a.index - b.index);

  return {
    created,
    skipped,
    failures,
    stopReason,
    terminalError,
    firstFailure,
  };
}

/** The single sentence explaining an early stop, or nothing for a full run. */
function stopNotice(reason: StopReason, unattempted: number): string | null {
  const tail = `${unattempted} note(s) not attempted`;
  switch (reason) {
    case 'consecutive-failures':
      return `Stopped early after ${MAX_CONSECUTIVE_FAILURES} consecutive failures; ${tail}`;
    case 'rate-limited':
      return `Rate limited (HTTP 429); ${tail}`;
    case 'auth':
      return `Stopped: the session is no longer valid; ${tail}`;
    case 'aborted':
      return `Interrupted; ${tail}`;
    case 'complete':
      return null;
  }
}

function reportOutcome(
  outcome: ImportOutcome,
  total: number,
  json: boolean
): void {
  const { created, skipped, failures, stopReason } = outcome;
  // Notes that were never attempted because the batch stopped early. Computed
  // once so the JSON and human-readable outputs cannot disagree.
  const unattempted = total - created.length - skipped.length - failures.length;

  if (json) {
    console.log(
      JSON.stringify(
        {
          created,
          skipped,
          failures,
          stoppedEarly: stopReason !== 'complete',
          stopReason,
          unattempted,
        },
        null,
        2
      )
    );
    return;
  }

  for (const item of created) {
    console.log(item.id);
  }
  if (skipped.length > 0) {
    console.error(`Skipped ${skipped.length} existing note(s) (idempotent)`);
  }
  if (failures.length > 0) {
    console.error(`Created ${created.length}, failed ${failures.length}`);
    for (const failure of failures) {
      console.error(`  [${failure.index}] ${failure.error}`);
    }
  } else {
    console.error(`Created ${created.length} note(s)`);
  }
  const notice = stopNotice(stopReason, unattempted);
  if (notice) {
    console.error(notice);
  }
}

/** The error this run should exit with, or `undefined` if it went fine. */
function outcomeError(
  outcome: ImportOutcome,
  total: number
): CliError | undefined {
  // A terminal cause outranks the partial tally: "log in again" (2) and
  // "aborted" (6) are more actionable than "7 of 900 failed".
  if (outcome.terminalError) {
    return outcome.terminalError;
  }
  const { failures, firstFailure } = outcome;
  if (failures.length === 0) {
    return undefined;
  }
  const summary = `${failures.length} of ${total} notes failed to create`;
  // When nothing succeeded, the exit code should reflect the actual failure
  // (e.g. a network error -> 3) rather than always being "partial" (7).
  if (failures.length === total && firstFailure !== undefined) {
    return new CliError(exitCodeFor(firstFailure), summary);
  }
  return new PartialError(summary);
}

export async function addCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  const { file, json } = parseAddOptions(args);
  const raw = await readContentSource({ content: file, fromFile: true });
  const entries = parseNotesFile(raw);

  const source = createNoteSource(credentials.access_token);
  // Trashed notes are excluded on purpose: a note the user deleted must be
  // importable again, otherwise the dedup would permanently block re-adding
  // it. `isTrashed` is the single convention for reading the `deleted` flag
  // (boolean | 0 | 1); hand-rolled truthiness checks drifted apart before.
  // find() already normalized every record, so `note.data` is always present.
  // The option below also drops trashed records at the page boundary; the
  // explicit filter stays as defence in depth for callers that stub the
  // source.
  const existing = await source.find({ includeTrashed: false });
  const existingFingerprints = new Set(
    existing
      .filter((note) => !isTrashed(note.data))
      .map((note) => fingerprint(note.data))
  );

  const outcome = await importNotes(source, entries, existingFingerprints);
  // Reported before the throw, always. An import that dies on entry 400 has
  // already created 399 notes server-side; throwing without printing their
  // ids leaves the user with no record of what landed.
  reportOutcome(outcome, entries.length, json);

  const error = outcomeError(outcome, entries.length);
  if (error) {
    throw error;
  }
}
