// Boundary normalization for note payloads arriving from the Simperium API.
//
// "Parse, don't validate": the index/get endpoints are the system boundary,
// and everything downstream of `note-source.ts` — including the vendored
// helpers under `vendor/` (`vendor/export/export-notes.ts`,
// `vendor/note-utils.ts`) — was written against the desktop bucket's
// guaranteed shape. Those consumers
// dereference `note.systemTags.includes(...)` and `note.content.split(...)`
// without guards, so a single dirty record (missing `systemTags`, a non-array
// `tags`, a stringified date) crashed `export`/`search` with a TypeError that
// surfaced as exit 3 ("network error") instead of a usable result.
//
// Normalizing here — once, at the boundary — means no consumer needs its own
// defensive copy of these rules, and user data is never silently dropped:
// fields we cannot trust are reset to a neutral default, the note itself is
// kept, and unknown extra fields round-trip untouched (an `edit` POST must
// not strip fields this CLI does not know about).

import type * as T from '../vendor/types.ts';

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

// Largest epoch-seconds a Date can represent (ECMA-262 TimeClip, ±8.64e15 ms).
// `new Date(x * 1000).toISOString()` throws RangeError beyond that, so a
// corrupt out-of-range timestamp would take the whole export down with it.
const MAX_EPOCH_SECONDS = 8.64e12;

function asEpoch(value: unknown): T.SecondsEpoch {
  // A corrupt record can carry a stringified date or NaN; both poison
  // `Date(... * 1000)` in the export path and comparators downstream.
  const num = Number(value);
  return Number.isFinite(num) && Math.abs(num) <= MAX_EPOCH_SECONDS ? num : 0;
}

function asStringArray<S extends string>(value: unknown): S[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is S => typeof item === 'string');
}

/**
 * Normalizes one raw note payload.
 *
 * Returns `undefined` only when there is no usable record at all (the data
 * blob is absent or not an object) — the same drop rule `find()` already
 * applied to `null`/`undefined` entries, extended to non-object payloads.
 */
export function sanitizeNote(raw: unknown): T.Note | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const note = raw as Record<string, unknown>;

  return {
    // Unknown fields first: anything this CLI does not model (future API
    // additions) is preserved so update() round-trips it back to the server.
    ...(note as Partial<T.Note>),
    content: asString(note.content),
    creationDate: asEpoch(note.creationDate),
    modificationDate: asEpoch(note.modificationDate),
    // Simperium types `deleted` as `boolean | 0 | 1`. Only those four values
    // (plus a missing flag) are trusted: `Boolean()` coerces out-of-contract
    // payloads such as the string "false" or "0" to `true`, silently flipping
    // a live note into the trash — which drops it from list/search, routes it
    // into the trash/ export half, and blocks edits with "in the trash".
    deleted: note.deleted === true || note.deleted === 1,
    systemTags: asStringArray<T.SystemTag>(note.systemTags),
    tags: asStringArray<T.TagName>(note.tags),
  };
}
