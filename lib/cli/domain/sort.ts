import type { BucketObject } from '../vendor/types.ts';
import type * as T from '../vendor/types.ts';

/**
 * A comparable timestamp, or 0 when the note has none we can trust.
 *
 * `?? 0` only guards `null`/`undefined`. The API has also been seen returning
 * a stringified date, and a corrupt record can carry `NaN`; both produce NaN
 * comparisons, and a comparator that returns NaN makes the sort order
 * implementation-defined (V8 simply stops swapping), so a single bad note
 * scrambles the whole list.
 */
function timestampOf(note: BucketObject<T.Note>): number {
  const raw = Number(note.data?.modificationDate);
  return Number.isFinite(raw) ? raw : 0;
}

/**
 * Newest first. Shared by `list` and `search` so both commands agree on what
 * "most recent" means, and so a missing modificationDate sorts last instead of
 * corrupting the ordering of everything around it.
 */
export function byModificationDateDesc(
  a: BucketObject<T.Note>,
  b: BucketObject<T.Note>
): number {
  // Three-way comparison, not a subtraction: the difference of two extreme
  // timestamps can exceed Number precision (or overflow to Infinity), and a
  // comparator that returns NaN makes the sort order implementation-defined.
  const tb = timestampOf(b);
  const ta = timestampOf(a);
  return tb > ta ? 1 : tb < ta ? -1 : 0;
}
