import type * as T from '../vendor/types.ts';

/**
 * Simperium types `deleted` as `boolean | 0 | 1`. Only those four values
 * (plus a missing flag) are trusted: `Boolean()` coerces out-of-contract
 * payloads such as the string "false" or "0" to `true`, silently flipping a
 * live note into the trash — which drops it from list/search, routes it into
 * the trash/ export half, and blocks edits with "in the trash". The strict
 * comparison is the same contract `sanitizeNote` applies at the boundary.
 */
export function isTrashed(note: T.Note | undefined): boolean {
  return note?.deleted === true || note?.deleted === 1;
}
