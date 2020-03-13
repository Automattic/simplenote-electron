import { getTerms } from '../../utils/filter-notes';

import * as T from '../../types';

const notes: Map<
  T.EntityId,
  [T.EntityId, T.Note & { tags: Set<T.TagName> }]
> = new Map();

self.onmessage = bootEvent => {
  const mainApp: MessagePort | undefined = bootEvent.ports[0];

  if (!mainApp) {
    // bail if we don't get a custom port
    return;
  }

  let searchQuery = '';
  let searchTerms: string[] = [];
  let filterTags = new Set<T.TagName>();
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

  const updateFilter = (scope = 'quickSearch') => {
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
        mainApp.postMessage({ action: 'filterNotes', noteIds: matches });
        queueUpdateFilter(0, 'fullSearch');
        return;
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

      if (
        searchTerms.length > 0 &&
        !searchTerms.every(term => note.content.includes(term))
      ) {
        continue;
      }

      matches.add(noteId);
    }

    mainApp.postMessage({ action: 'filterNotes', noteIds: matches });
  };

  let updateHandle: ReturnType<typeof setTimeout> | null = null;
  const queueUpdateFilter = (delay = 0, searchScope = 'quickSearch') => {
    if (updateHandle) {
      clearTimeout(updateHandle);
    }

    updateHandle = setTimeout(() => {
      updateHandle = null;
      updateFilter(searchScope);
    }, delay);
  };

  mainApp.onmessage = event => {
    if (event.data.action === 'updateNote') {
      const { noteId, data } = event.data;

      const noteTags = new Set(data.tags.map(tag => tag.toLocaleLowerCase()));
      notes.set(noteId, [
        noteId,
        {
          ...data,
          content: data.content.toLocaleLowerCase(),
          tags: noteTags,
        },
      ]);

      queueUpdateFilter(1000);
    } else if (event.data.action === 'filterNotes') {
      if ('string' === typeof event.data.searchQuery) {
        searchQuery = event.data.searchQuery.trim().toLocaleLowerCase();
        searchTerms = getTerms(searchQuery);
        filterTags = tagsFromSearch(searchQuery);
      }

      if ('string' === typeof event.data.openedTag) {
        filterTags = tagsFromSearch(searchQuery);
        filterTags.add(event.data.openedTag.toLocaleLowerCase());
      } else if (null === event.data.openedTag) {
        filterTags = tagsFromSearch(searchQuery);
      }

      if ('boolean' === typeof event.data.showTrash) {
        showTrash = event.data.showTrash;
      }

      queueUpdateFilter();
    }
  };
};
