import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import { hasFlag, parseLimit, rejectExtraPositionals } from '../cli-args.ts';
import { byModificationDateDesc } from '../domain/sort.ts';
import { topBy } from '../domain/top.ts';
import { LIST_DEFAULT_LIMIT, PREVIEW_WIDTH } from '../cli-constants.ts';

export type ListOptions = {
  limit: number;
  json: boolean;
  includeTrashed: boolean;
};

export function parseListOptions(args: string[]): ListOptions {
  // `list` takes no positional arguments; a stray word is a typo, not input.
  rejectExtraPositionals(args, 'list', 0);
  return {
    limit: parseLimit(args, LIST_DEFAULT_LIMIT),
    json: hasFlag(args, 'json'),
    includeTrashed: hasFlag(args, 'include-trashed'),
  };
}

export async function listCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  const { limit, json, includeTrashed } = parseListOptions(args);
  const source = createNoteSource(credentials.access_token);
  // Trashed notes are dropped at the page boundary, not fetched and filtered
  // out here. The default view is the live working set, so fetching the trash
  // is pure waste for the common case.
  const results = await source.find({ includeTrashed });

  // Simperium's index returns objects in storage order, not recency order.
  // Slicing it directly showed the *oldest* notes, which is the opposite of
  // what "the first 20 notes" means to a user and inconsistent with `search`.
  // Trash was already dropped at the page boundary by `find({ includeTrashed })`.
  const top = topBy(results, limit, byModificationDateDesc);

  if (json) {
    console.log(JSON.stringify(top, null, 2));
  } else {
    for (const result of top) {
      const raw = (result.data?.content ?? '')
        .replace(/\r/g, '')
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .slice(0, PREVIEW_WIDTH);
      // A lone high surrogate at the cut point means the slice split a
      // surrogate pair, leaving a dangling half that renders as mojibake.
      // The export side guards the same way when truncating file names.
      const code = raw.charCodeAt(raw.length - 1);
      const content = code >= 0xd800 && code <= 0xdbff ? raw.slice(0, -1) : raw;
      console.log(
        [result.id, result.data?.modificationDate ?? '', content].join('\t')
      );
    }
  }
}
