import sanitize from 'sanitize-filename';
import type { ExportNote } from './vendor/export/types.ts';
import { FILENAME_LENGTH, TAG_LINE_LENGTH } from './cli-constants.ts';

export type PreparedNote = ExportNote & { fileName: string };

/**
 * Derives a file name from the note's first non-empty, sanitized line.
 *
 * The old code expressed this as
 * `[...].concat('untitled').shift()!` — an obscure idiom that relied on the
 * trailing sentinel to guarantee a non-null value. Written out it is simply
 * "first good line, else 'untitled'", which is what the readable form below
 * says.
 */
export const addFilename = (note: ExportNote): PreparedNote => {
  // Walk the lines until the first one survives `sanitize`, then stop. The
  // previous chain sanitized *every* line before searching for the first
  // non-empty result, so a 10k-line note ran sanitize-filename's regex work
  // on all 10k lines just to use the first. A line can only be sanitized to
  // empty (e.g. "///"), so the walk cannot short-circuit on the raw text.
  // An indexOf walk instead of split('\n') keeps the whole content from being
  // materialized into a line array before the first candidate is found.
  let fileName: string | undefined;
  const content = note.content;
  let searchFrom = 0;
  for (;;) {
    const newline = content.indexOf('\n', searchFrom);
    const line =
      newline === -1
        ? content.slice(searchFrom)
        : content.slice(searchFrom, newline);
    const candidate = sanitize(line.trim());
    if (candidate.length > 0) {
      fileName = candidate;
      break;
    }
    if (newline === -1) {
      break;
    }
    searchFrom = newline + 1;
  }

  return {
    ...note,
    fileName: truncateFileName(fileName ?? 'untitled', FILENAME_LENGTH),
  };
};

const isHighSurrogate = (code: number) => 0xd800 <= code && code <= 0xdbff;

function truncateFileName(name: string, max: number): string {
  if (name.length <= max) {
    return name;
  }
  // A lone high surrogate at the cut point means the slice split a surrogate
  // pair, leaving a dangling half that is an invalid filename on every OS.
  const cut = name.slice(0, max);
  return isHighSurrogate(cut.charCodeAt(cut.length - 1))
    ? cut.slice(0, -1)
    : cut;
}

export const appendTags = (note: ExportNote): ExportNote => {
  if (!note.tags || note.tags.length === 0) {
    return note;
  }

  // Drop tags that cannot survive the round-trip: a blank tag adds nothing,
  // and a tag containing a line break would inject extra lines into the
  // exported file (breaking the markdown) and is unsearchable anyway — the
  // tag: pattern matches `[^\s,]+`, so whitespace-bearing tags can never be
  // found again after export.
  const cleanTags = note.tags.filter(
    (tag) => !/[\r\n]/.test(tag) && tag.trim().length > 0
  );
  if (cleanTags.length === 0) {
    return note;
  }

  // Accumulate into a mutable array (the reduce used to rebuild `lines` on
  // every iteration, an O(n^2) copy for notes with many tags).
  const lines: string[] = [];
  let currentLine = '';
  for (const tag of cleanTags) {
    const candidate =
      currentLine.length === 0 ? tag.trim() : `${currentLine}, ${tag.trim()}`;
    if (candidate.length > TAG_LINE_LENGTH && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = tag.trim();
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // No leading ", " can exist: every line above either starts with a fresh
  // `tag.trim()` (empty accumulator) or a joined continuation — the builder
  // never emits a dangling comma, so a defensive replace would be dead code.
  return {
    ...note,
    content: `${note.content}\n\nTags:\n  ${lines.join('\n  ')}`,
  };
};

/**
 * Reduce step that de-duplicates file names.
 *
 * Appends to the accumulator instead of rebuilding it (`[...notes, note]`),
 * which turned preparing N notes into O(N^2) array copies: 5k notes meant
 * ~12.5M element copies before a single byte was written.
 *
 * The generated name itself is registered back into `nameCounts`, and we probe
 * forward until we find a free slot, so inputs like
 * ["Meeting", "Meeting", "Meeting (1)"] cannot collide on "Meeting (1)".
 */
export const toUniqueNames = (
  acc: [PreparedNote[], Map<string, number>],
  note: PreparedNote
): [PreparedNote[], Map<string, number>] => {
  const [notes, nameCounts] = acc;

  // Keys are case-folded: on case-insensitive file systems (Windows, macOS)
  // "Meeting" and "meeting" write to the same path, and writeFile's default
  // 'w' flag would silently overwrite one note with the other.
  const norm = (name: string) => name.toLowerCase();
  let count = nameCounts.get(norm(note.fileName)) ?? 0;
  let fileName = count > 0 ? `${note.fileName} (${count})` : note.fileName;
  while (fileName !== note.fileName && nameCounts.has(norm(fileName))) {
    count += 1;
    fileName = `${note.fileName} (${count})`;
  }

  nameCounts.set(norm(note.fileName), count + 1);
  if (fileName !== note.fileName) {
    nameCounts.set(norm(fileName), (nameCounts.get(norm(fileName)) ?? 0) + 1);
  }
  notes.push({ ...note, fileName });
  return acc;
};

/**
 * De-duplicates and names a batch of notes.
 *
 * Memoized per input array identity: export's markdown and zip artefacts pass
 * the same `grouped.activeNotes`/`trashedNotes` references, so without this the
 * whole appendTags + addFilename + toUniqueNames pipeline ran twice per half
 * (4 times for `format=all`). The function is deterministic, and no caller
 * mutates the returned array, so a WeakMap keyed by the input reference is
 * safe — within one process there is exactly one export run per batch.
 *
 * Contract: the returned array is shared with the cache — callers MUST treat
 * it as read-only (no push/sort/in-place element mutation), otherwise a later
 * memo hit returns a corrupted batch.
 */
const preparedCache = new WeakMap<ExportNote[], PreparedNote[]>();

export const prepareNotes = (notes: ExportNote[]): PreparedNote[] => {
  const cached = preparedCache.get(notes);
  if (cached !== undefined) {
    return cached;
  }
  const [prepared] = notes.reduce<[PreparedNote[], Map<string, number>]>(
    (acc, note) => toUniqueNames(acc, addFilename(appendTags(note))),
    [[], new Map()]
  );
  preparedCache.set(notes, prepared);
  return prepared;
};
