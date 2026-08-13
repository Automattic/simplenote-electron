import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import {
  hasFlag,
  rejectExtraPositionals,
  takeFirstPositional,
} from '../cli-args.ts';
import { isTrashed } from '../domain/trash.ts';
import { NotFoundError, UsageError } from '../domain/errors.ts';

export type ShowOptions = {
  json: boolean;
};

export function parseShowOptions(args: string[]): ShowOptions {
  // `show` takes exactly one id; anything beyond it is a typo, not input.
  // `args` here is the remainder *after* the id was taken, so the id is
  // declared as already consumed to keep the error message honest
  // ("got 2, expected at most 1" rather than "got 1, expected at most 0").
  rejectExtraPositionals(args, 'show', 0, 1);
  return { json: hasFlag(args, 'json') };
}

export async function showCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  // First non-flag argument, so `show --json <id>` works the same as
  // `show <id> --json` instead of treating `--json` as the note id.
  const { value: noteId, rest } = takeFirstPositional(args);
  if (!noteId) {
    throw new UsageError('show requires a note id: npm run cli -- show <id>');
  }

  const { json } = parseShowOptions(rest);
  const source = createNoteSource(credentials.access_token);
  const note = await source.get(noteId);

  if (!note) {
    throw new NotFoundError(`Note not found: ${noteId}`);
  }

  if (!json && isTrashed(note.data)) {
    console.error('Warning: this note is in the trash.');
  }

  if (json) {
    console.log(JSON.stringify(note, null, 2));
  } else {
    console.log(note.data?.content ?? '');
  }
}
