import { getTerms } from '../utils/filter-notes';

import * as T from '../types';

const notes: Map<
  T.EntityId,
  [T.EntityId, T.Note & { tags: Set<T.TagName> }]
> = new Map();

let mainApp: MessagePort | undefined;

let searchQuery = '';
let searchTerms: string[] = [];
let filterTags = new Set<T.TagName>();
let openedTag: string | null = null;
let showTrash = false;

const tagsFromSearch = (query: string) => {
  const tagPattern = /(?:\btag:)([^\s,]+)/g;
  const searchTags = new Set<T.TagName>();
  let match;
  while ((match = tagPattern.exec(query)) !== null) {
    searchTags.add(match[1].toLocaleLowerCase());
  }
  return searchTags;
};

type FilterScope = 'quickSearch' | 'fullSearch';

export const updateFilter = (
  scope: FilterScope = 'quickSearch'
): Set<T.EntityId> => {
  const tic = performance.now();
  const matches = new Set<T.EntityId>();

  for (const [noteId, note] of notes.values()) {
    // return a small set of the results quickly and then
    // queue up another search. this improves the responsiveness
    // of the search and it gives us another opportunity to
    // receive inbound messages from the main thread
    // in testing this was rare and may only happen in unexpected
    // circumstances such as when performing a garbage-collection
    const toc = performance.now();
    if (scope === 'quickSearch' && toc - tic > 10) {
      queueUpdateFilter(0, 'fullSearch');
      return matches;
    }

    if (showTrash !== note.deleted) {
      continue;
    }

    let hasAllTags = true;
    for (const tagName of filterTags.values()) {
      if (!note.tags.has(tagName)) {
        hasAllTags = false;
        break;
      }
    }
    if (!hasAllTags) {
      continue;
    }

    if (openedTag && !note.tags.has(openedTag)) {
      continue;
    }

    if (
      searchTerms.length > 0 &&
      !searchTerms.every((term) => note.content.includes(term))
    ) {
      continue;
    }

    matches.add(noteId);
  }

  return matches;
};

let updateHandle: ReturnType<typeof setTimeout> | null = null;
const queueUpdateFilter = (
  delay = 0,
  searchScope: FilterScope = 'quickSearch'
) => {
  if (updateHandle) {
    clearTimeout(updateHandle);
  }

  updateHandle = setTimeout(() => {
    updateHandle = null;
    mainApp.postMessage({
      action: 'filterNotes',
      noteIds: updateFilter(searchScope),
    });
  }, delay);
};

export const updateNote = (noteId: T.EntityId, data) => {
  const noteTags = new Set(data.tags.map((tag) => tag.toLocaleLowerCase()));
  notes.set(noteId, [
    noteId,
    {
      ...data,
      content: data.content.toLocaleLowerCase(),
      deleted: !!data.deleted,
      tags: noteTags,
    },
  ]);
};

export const init = (port: MessagePort) => {
  mainApp = port;

  mainApp.onmessage = (event) => {
    if (event.data.action === 'updateNote') {
      const { noteId, data } = event.data;

      updateNote(noteId, data);
      queueUpdateFilter(1000);
    } else if (event.data.action === 'filterNotes') {
      if ('string' === typeof event.data.searchQuery) {
        searchQuery = event.data.searchQuery.trim().toLocaleLowerCase();
        searchTerms = getTerms(searchQuery);
        filterTags = tagsFromSearch(searchQuery);
      }

      if ('string' === typeof event.data.openedTag) {
        openedTag = event.data.openedTag.toLocaleLowerCase();
      } else if (null === event.data.openedTag) {
        filterTags = tagsFromSearch(searchQuery);
        openedTag = null;
      }

      if ('boolean' === typeof event.data.showTrash) {
        showTrash = event.data.showTrash;
      }

      queueUpdateFilter();
    }
  };
};
