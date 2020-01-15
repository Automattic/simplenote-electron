import * as T from '../types';

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
const filterAtMost = function<I>(
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
};

const emptyTagList: T.TagEntity[] = [];

export const filterTags = (
  query: string,
  notes: T.NoteEntity[],
  tags: T.TagEntity[]
): T.TagEntity[] => {
  // we'll only suggest matches for the last word
  // ...this is possibly naive if the user has moved back and is editing,
  // but without knowing where the cursor is it's maybe the best we can do
  const tagTerm = query
    .trim()
    .split(' ')
    .pop();

  if (!tagTerm) {
    return emptyTagList;
  }

  // with `tag:` we don't want to suggest tags which have already been added
  // to the search bar, so we make it an explicit prefix match, meaning we
  // don't match inside the tag and we don't match full-text matches
  const isPrefixMatch = tagTerm.startsWith('tag:') && tagTerm.length > 4;
  const term = isPrefixMatch ? tagTerm.slice(4) : tagTerm;

  const matcher: (tag: T.TagEntity) => boolean = isPrefixMatch
    ? ({ data: { name } }) => name !== term && name.startsWith(term)
    : ({ data: { name } }) => name.includes(term);

  return filterAtMost(tags, matcher, 5);
};
