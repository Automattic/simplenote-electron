import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import { getTerms, tagPattern } from '../vendor/filter-notes.ts';
import { noteTitleAndPreview } from '../vendor/note-utils.ts';
import { escapeRegExp } from 'lodash';
import {
  hasFlag,
  parseLimit,
  rejectExtraPositionals,
  takeFirstPositional,
} from '../cli-args.ts';
import { byModificationDateDesc } from '../domain/sort.ts';
import { topBy } from '../domain/top.ts';
import { UsageError } from '../domain/errors.ts';
import { SEARCH_DEFAULT_LIMIT } from '../cli-constants.ts';
import type * as T from '../vendor/types.ts';

export type SearchOptions = {
  limit: number;
  json: boolean;
  includeTrashed: boolean;
};

export function parseSearchOptions(args: string[]): SearchOptions {
  // `search` takes exactly one (quoted) query; more words are a typo.
  // The query itself was already taken by the caller, hence `consumed: 1`.
  rejectExtraPositionals(args, 'search', 0, 1);
  return {
    limit: parseLimit(args, SEARCH_DEFAULT_LIMIT),
    json: hasFlag(args, 'json'),
    includeTrashed: hasFlag(args, 'include-trashed'),
  };
}

// `tagPattern` is rebuilt per call, so the /g regex has no stale lastIndex
// between calls. The desktop app and the CLI share the same source so they
// always agree on what counts as a `tag:` filter.
function extractTags(query: string): string[] {
  // `toLowerCase()` (not `toLocaleLowerCase`) keeps matching locale-independent:
  // under e.g. the Turkish locale `toLocaleLowerCase` folds `I`/`i` and `k`/`K`
  // differently than ASCII, which would silently break `tag:WORK` matching.
  // NFC first so a tag: query typed on one platform matches a note whose tag
  // was stored in the other platform's encoding (macOS NFD vs Win/Linux NFC).
  return [...query.matchAll(tagPattern())].map((match) =>
    match[1].normalize('NFC').toLowerCase()
  );
}

type Matcher = (note: T.Note) => boolean;

/**
 * Per-query setup: lower-case the terms and pre-compile one case-insensitive
 * regex per term (no per-note string copy, no per-note toLocaleLowerCase of
 * the whole body). Tags are matched case-insensitively and checked first,
 * because a `tag:` filter usually eliminates most notes cheaply.
 */
function createMatcher(terms: string[], tags: string[]): Matcher {
  const termRegexes = terms.map((term) => new RegExp(escapeRegExp(term), 'i'));
  const wantedTags = new Set(tags);

  return (note: T.Note): boolean => {
    // Cheap path: a tag filter alone rejects the overwhelming majority of
    // notes without ever touching the (possibly large) content string.
    if (wantedTags.size > 0) {
      // No tags at all cannot satisfy any `tag:` filter. Short-circuiting
      // here avoids building an empty Set per note, which is the common case
      // for a library-wide scan and used to allocate one Set for every note.
      if (!note.tags || note.tags.length === 0) {
        return false;
      }
      // Lower-cased once per note so `tag:Work` also matches a `work` tag,
      // and NFC-normalized so a note tagged on macOS (NFD) matches a query
      // typed on Windows/Linux (NFC) — the same normalization create/add
      // store and the fingerprint in add.ts use.
      const noteTags = new Set(
        note.tags.map((tag) => tag.normalize('NFC').toLowerCase())
      );
      for (const tag of wantedTags) {
        if (!noteTags.has(tag)) {
          return false;
        }
      }
    }
    if (termRegexes.length === 0) {
      return true;
    }
    const content = note.content ?? '';
    return termRegexes.every((re) => re.test(content));
  };
}

export async function searchCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  const { value: query, rest } = takeFirstPositional(args);
  if (!query || query.trim().length === 0) {
    throw new UsageError(
      'search requires a query: npm run cli -- search "<query>"'
    );
  }

  const { limit, json, includeTrashed } = parseSearchOptions(rest);
  const matches = createMatcher(getTerms(query), extractTags(query));

  const source = createNoteSource(credentials.access_token);
  // Same boundary opt-out as `list`: a query runs against the live working
  // set, so trashed records never need to cross the wire into memory.
  const results = await source.find({ includeTrashed });
  const hits = topBy(
    results.filter((result) => matches(result.data)),
    limit,
    byModificationDateDesc
  );

  if (json) {
    const output = hits.map((result) => {
      const { title, preview } = noteTitleAndPreview(result.data, query);
      return {
        id: result.id,
        title,
        preview,
        modificationDate: result.data.modificationDate,
      };
    });
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const result of hits) {
      const { title, preview } = noteTitleAndPreview(result.data, query);
      // Tab is the column separator and \r overwrites the terminal, so both
      // are stripped from cell text (preview keeps its intentional \n breaks).
      console.log(
        [
          result.id,
          result.data.modificationDate ?? '',
          title.replace(/\t/g, ' ').replace(/\r/g, ''),
          preview.replace(/\t/g, ' ').replace(/\r/g, ''),
        ]
          .join('\t')
          .trimEnd()
      );
    }
  }
}
