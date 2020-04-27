/**
 * Return the first maxResults matching items in the list
 *
 * This is like items.filter(predicate).slice(0,maxResults)
 * but it early-aborts as soon as we find our max results.
 * If we were filtering thousands of tags, for example, there'd
 * be no reason to iterate through all of them and only prune
 * the list after computing whether each one matches.
 *
 * @param items items to filter
 * @param predicate filtering function
 * @param maxResults maximum number of returned matching items
 */
export default function <I>(
  items: I[],
  predicate: (item: I) => boolean,
  maxResults: number
): I[] {
  const results = [];
  for (const item of items) {
    if (predicate(item)) {
      results.push(item);
    }

    if (results.length === maxResults) {
      break;
    }
  }
  return results;
}
