import type { BucketObject } from './vendor/types.ts';
import { randomUUID } from 'crypto';
import { API_BASE, APP_ID } from './config.ts';
import {
  httpRequest,
  perRequestTimeoutMs,
  DEFAULT_MAX_RETRIES,
} from './infra/http.ts';
import type { HttpResponse } from './infra/http.ts';
import { debug } from './logging.ts';
import {
  AuthError,
  ConflictError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './domain/errors.ts';
import type { FindOptions, NewNote, NoteSource } from './domain/types.ts';
import { sanitizeNote } from './domain/note.ts';
import { isTrashed } from './domain/trash.ts';
import {
  MAX_PAGES,
  DEFAULT_TOTAL_TIMEOUT_MS,
  INDEX_PAGE_SIZE,
  envPositiveInt,
} from './cli-constants.ts';
import type * as T from './vendor/types.ts';

// Reads are safe to replay, so they get bounded retries. Writes never do:
// Simperium POST creates/updates an object, and replaying one after an
// ambiguous timeout is how duplicate notes get made.
const READ_OPTIONS = { retries: DEFAULT_MAX_RETRIES, label: 'Simperium read' };
const WRITE_OPTIONS = { retries: 0, label: 'Simperium write' };

// Authentication failures are their own class so the CLI can exit 2 ("log in
// again") instead of 3 ("network"), which is what a caller needs to branch on.
function unauthorizedError(): AuthError {
  return new AuthError('Unauthorized: invalid access token');
}

function conflictError(status: number): ConflictError {
  if (status === 409 || status === 412) {
    return new ConflictError(`Simperium rejected the write: HTTP ${status}`);
  }
  return new ConflictError('Simperium rejected the write');
}

function assertUsableStatus(res: HttpResponse): void {
  if (res.status === 401 || res.status === 403) {
    throw unauthorizedError();
  }
  if (res.status === 409 || res.status === 412) {
    throw conflictError(res.status);
  }
  // A versioned POST can land a 404 when the object was deleted concurrently
  // ("specified object version does not exist"). Reads never reach here —
  // `get()` returns undefined on 404 first — so this is a write-path
  // classification: "the note is gone", not "the network misbehaved".
  if (res.status === 404) {
    throw new NotFoundError('Simperium object not found (HTTP 404)');
  }
  if (!res.ok) {
    const message = `Simperium API error: HTTP ${res.status}`;
    // 429 is a distinct, actionable cause (the server asked us to slow down),
    // not a generic outage — a batch caller can stop on the first one instead
    // of grinding through doomed requests.
    throw res.status === 429
      ? new RateLimitError(`Too many requests (HTTP 429). ${message}`)
      : new NetworkError(message);
  }
}

function parseVersionHeader(res: HttpResponse): number {
  const versionHeader = res.headers.get('X-Simperium-Version');
  const version = Number(versionHeader);
  if (!Number.isInteger(version) || version < 1) {
    // The note is already created server-side; failing the whole command here
    // would push callers to retry and make duplicates. Degrade to 0 and still
    // hand back the id we received.
    return 0;
  }
  return version;
}

/**
 * A single note as returned by `get`: the bucket object plus the version the
 * server attached to this read (via the `X-Simperium-Version` header), which
 * is the base a subsequent write should be computed against.
 */
type NoteWithVersion = BucketObject<T.Note> & { version?: number };

function totalTimeoutMs(): number {
  return envPositiveInt(
    'SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS',
    DEFAULT_TOTAL_TIMEOUT_MS
  );
}

type IndexPage = {
  entries: Array<{ id: string; d: unknown }>;
  mark?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * A page cursor we are willing to follow.
 *
 * Anything that is not a usable cursor ends pagination instead of being sent
 * back to the server. A non-string mark never matched the `seenMarks` guard
 * (a `Set<string>`) nor the `page.mark === mark` check, so a server echoing
 * numeric marks defeated both loop terminators and only stopped at MAX_PAGES
 * — a hundred wasted round trips before the error.
 */
function normalizeMark(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    return raw === '' ? undefined : raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return undefined;
}

/**
 * Structural check on an index page before the pagination loop walks it.
 *
 * `httpRequest` guarantees the body *parsed* as JSON; it says nothing about
 * its shape. A 200 carrying `{}`, `null`, a bare array or `{"index": null}` —
 * all of which a captive portal or a misconfigured proxy can produce — used to
 * reach `for (const entry of page.index)` and throw a raw
 * `TypeError: page.index is not iterable`: exit 99 with a stack trace and no
 * hint that the *server* answered with something unusable. Rejecting it here
 * turns that into the NetworkError the CLI already knows how to report
 * (exit 3, "run it again / check your connection").
 *
 * Individual entries follow the same boundary rule as `sanitizeNote`: one
 * unusable record is dropped, it does not fail the whole run. An entry with no
 * string id is unusable by definition — every downstream verb (`show`, `edit`,
 * `rm`) addresses notes by that id.
 */
function parseIndexPage(payload: unknown): IndexPage {
  if (!isRecord(payload) || !Array.isArray(payload.index)) {
    throw new NetworkError(
      'Simperium index returned an unexpected payload (no "index" array)'
    );
  }

  const entries: Array<{ id: string; d: unknown }> = [];
  for (const entry of payload.index) {
    if (!isRecord(entry)) {
      continue;
    }
    const { id } = entry;
    if (typeof id !== 'string' || id === '') {
      continue;
    }
    entries.push({ id, d: entry.d });
  }

  return { entries, mark: normalizeMark(payload.mark) };
}

async function fetchIndexPage(
  bucket: string,
  token: string,
  mark: string | undefined,
  deadlineAt: number,
  timeoutMs: number
): Promise<IndexPage> {
  const params = new URLSearchParams({
    data: 'true',
    limit: String(INDEX_PAGE_SIZE),
  });
  if (mark) {
    params.set('mark', mark);
  }

  // Keep one page (including its read retries) inside the command's total
  // budget. `deadlineAt` is the absolute wall-clock deadline, computed once by
  // `find()` and handed down: `httpRequest` clamps every attempt to what is
  // left of it and skips a backoff that could not finish in time. Without it
  // the 2 read retries plus their backoff could each run a full `timeoutMs`
  // and blow past the total budget by tens of seconds, because `find()` only
  // checks the budget *between* pages.
  //
  // The clamping itself is deliberately not repeated here. This used to
  // pre-shrink `timeoutMs` against the very deadline `httpRequest` clamps
  // against anyway, so the outer copy was dead weight — and being written
  // against DEFAULT_TIMEOUT_MS rather than the configured value, it also
  // swallowed SIMPLENOTE_CLI_TIMEOUT_MS on every paged verb (`list`,
  // `search`, `export`) even though `--help` advertises it.
  const options = {
    ...READ_OPTIONS,
    timeoutMs,
    deadlineAt,
  };

  const res = await httpRequest(
    `${API_BASE}/${APP_ID}/${bucket}/index?${params}`,
    { headers: { 'X-Simperium-Token': token } },
    options
  );
  assertUsableStatus(res);
  return parseIndexPage(await res.json());
}

export function createNoteSource(token: string): NoteSource {
  async function find(options?: FindOptions): Promise<BucketObject<T.Note>[]> {
    // Default keeps the whole index (export needs the trash half); the
    // commands that never touch trashed notes (`list`, `search`, `add`) opt
    // out so those records are dropped before they are retained in memory.
    const includeTrashed = options?.includeTrashed ?? true;
    const startedAt = Date.now();
    // One deadline for the whole pagination run, shared by every page (and
    // parsed from the environment exactly once per command). The per-request
    // timeout is read once here for the same reason: a thousand-page fetch
    // should not re-parse the environment a thousand times.
    const deadlineAt = startedAt + totalTimeoutMs();
    const perPageTimeout = perRequestTimeoutMs();
    const all: BucketObject<T.Note>[] = [];
    const seenMarks = new Set<string>();
    // Duplicate ids across pages (a note moved between pages while the
    // pagination snapshot drifted) are dropped, first occurrence wins — the
    // same "later page overwrites" trap the export path avoided with a Map.
    const seenIds = new Set<string>();
    let mark: string | undefined;
    let pages = 0;

    while (true) {
      // Anti-runaway: a server that returns a fresh, never-repeating mark on
      // every page would otherwise spin forever while memory grows. The
      // seen-set catches cycle repeats; this catch catches monotonic drift.
      if (++pages > MAX_PAGES) {
        throw new NetworkError(
          `Index pagination did not terminate after ${pages} pages`
        );
      }
      if (Date.now() > deadlineAt) {
        throw new NetworkError('Index fetch exceeded the total time budget');
      }

      const page = await fetchIndexPage(
        'note',
        token,
        mark,
        deadlineAt,
        perPageTimeout
      );
      debug(
        `index page ${pages}: ${all.length} notes so far (mark: ${mark === undefined ? 'none' : mark})`
      );
      for (const entry of page.entries) {
        // Normalize at the boundary: the index can return entries whose data
        // blob is missing entirely, or present but with unusable fields
        // (no `systemTags`, a non-array `tags`, a stringified date). The
        // first kind is dropped; the second is repaired with defaults, so
        // `search`/`export` — which dereference note fields through code
        // shared with the desktop app — cannot crash on a dirty record.
        const data = sanitizeNote(entry.d);
        if (data === undefined) {
          continue;
        }
        if (!includeTrashed && isTrashed(data)) {
          continue;
        }
        if (seenIds.has(entry.id)) {
          continue;
        }
        seenIds.add(entry.id);
        all.push({ id: entry.id, data });
      }
      // Stop on a missing mark, an unchanged mark, or a mark we have already
      // followed. Without the seen-set a server that cycles marks would spin
      // this loop forever while memory grows.
      if (!page.mark || page.mark === mark || seenMarks.has(page.mark)) {
        debug(`index fetch finished: ${pages} page(s), ${all.length} notes`);
        break;
      }
      seenMarks.add(page.mark);
      mark = page.mark;
    }
    return all;
  }

  async function get(id: string): Promise<NoteWithVersion | undefined> {
    const res = await httpRequest(
      `${API_BASE}/${APP_ID}/note/i/${encodeURIComponent(id)}`,
      { headers: { 'X-Simperium-Token': token } },
      READ_OPTIONS
    );
    if (res.status === 404) {
      debug(`get ${id}: 404`);
      return undefined;
    }
    assertUsableStatus(res);
    // Same boundary rule as find(): a payload with no usable record is
    // treated as absent rather than handed to consumers half-formed.
    const data = sanitizeNote(await res.json());
    if (data === undefined) {
      return undefined;
    }
    // The version header is the base the next POST should carry (`/v/{v}`),
    // so an edit merges with — instead of clobbering — concurrent changes.
    const version = parseVersionHeader(res);
    debug(`get ${id}: OK, version ${version}`);
    return version > 0 ? { id, data, version } : { id, data };
  }

  async function postNote(
    id: string,
    noteData: T.Note,
    baseVersion?: number
  ): Promise<{ version: number }> {
    const ccid = randomUUID();
    // `/v/{version}` tells the server which object version this change was
    // computed against. Without it the full stale body is applied to the
    // latest state, silently overwriting fields another client changed since
    // the read; with it the server treats the write as an increment from the
    // read version and merges concurrent edits per field.
    const versionPath = baseVersion === undefined ? '' : `/v/${baseVersion}`;
    debug(
      `write ${id} (baseVersion: ${baseVersion === undefined ? 'none' : baseVersion})`
    );
    const res = await httpRequest(
      `${API_BASE}/${APP_ID}/note/i/${encodeURIComponent(id)}${versionPath}?ccid=${ccid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Simperium-Token': token,
        },
        body: JSON.stringify(noteData),
      },
      WRITE_OPTIONS
    );
    assertUsableStatus(res);
    const version = parseVersionHeader(res);
    debug(`write ${id}: OK, version ${version}`);
    return { version };
  }

  async function update(
    id: string,
    content: string
  ): Promise<{ version: number }> {
    const existing = await get(id);
    if (!existing) {
      throw new NotFoundError(`Note not found: ${id}`);
    }
    if (isTrashed(existing.data)) {
      throw new ConflictError(`Note is in the trash: ${id}`);
    }
    if (existing.version === undefined) {
      // Without a version the POST below would be a blind write (`versionPath =
      // ''`), applying the full stale body to the latest state and silently
      // clobbering fields another client changed since the read. That is the
      // exact hazard `/v/{version}` exists to prevent, so fail loudly instead
      // of silently losing the concurrent-merge protection. (A missing header
      // happens when a proxy/gateway strips X-Simperium-Version.)
      throw new ConflictError(
        `Cannot safely update note ${id}: the server did not return a ` +
          `version (X-Simperium-Version missing), so a blind write could ` +
          `overwrite concurrent changes. Retry the command.`
      );
    }

    return postNote(
      id,
      {
        ...existing.data,
        content,
        modificationDate: Math.floor(Date.now() / 1000),
      },
      existing.version
    );
  }

  async function create(
    note: NewNote
  ): Promise<{ id: string; version: number }> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const noteData: T.Note = {
      content: note.content,
      creationDate: now,
      modificationDate: now,
      deleted: false,
      publishURL: '',
      shareURL: '',
      systemTags: note.systemTags ?? ['markdown'],
      tags: note.tags ?? [],
    };
    const { version } = await postNote(id, noteData);
    return { id, version };
  }

  return { find, get, update, create };
}
