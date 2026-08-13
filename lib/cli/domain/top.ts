// Bounded top-k selection, shared by `list` and `search`.
//
// Both commands sort the *whole* result set only to keep the first `limit`
// entries — O(n log n) for what is usually k = 20 or 50. For small k we keep
// a bounded sorted window and binary-insert each item, giving O(n·k) array
// moves with a tiny constant; for larger k (or when k covers the whole list)
// we fall back to a full sort, where the O(n log n) comparison cost is cheaper
// than O(n·k) splice moves.

/** Above this many kept entries the splice cost outruns a full sort. */
const TOP_K_THRESHOLD = 64;

export function topBy<T>(
  items: readonly T[],
  limit: number,
  comparator: (a: T, b: T) => number
): T[] {
  // NaN and fractional limits would silently fall through to the insertion
  // branch (`NaN > limit` and `top.length > NaN` are both false), returning
  // the whole list without error. Defensive guard only — the CLI callers
  // (list/search) already validate via parseLimit.
  if (!Number.isInteger(limit) || limit <= 0) {
    return [];
  }
  if (limit >= items.length || limit > TOP_K_THRESHOLD) {
    return [...items].sort(comparator).slice(0, limit);
  }

  const top: T[] = [];
  for (const item of items) {
    // First index where `item` sorts before `top[mid]`. Equal elements fall
    // through the `else` branch (insert after equals), preserving the stable
    // order that `Array.prototype.sort` guarantees.
    let lo = 0;
    let hi = top.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (comparator(item, top[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    top.splice(lo, 0, item);
    if (top.length > limit) {
      top.pop();
    }
  }
  return top;
}
