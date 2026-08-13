import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import {
  hasFlag,
  parseContentSource,
  takeFirstPositional,
} from '../cli-args.ts';
import { readContentSource } from '../content-input.ts';
import { UsageError } from '../domain/errors.ts';

export type EditOptions = {
  content: string;
  fromFile: boolean;
  json: boolean;
};

export function parseEditOptions(args: string[]): EditOptions {
  const { content, fromFile } = parseContentSource(args, 'edit', 'new content');
  return { content, fromFile, json: hasFlag(args, 'json') };
}

export async function editCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  // The note id is the first non-flag argument; everything else (including
  // flags that appeared before it) is the content source.
  const { value: noteId, rest } = takeFirstPositional(args);
  if (!noteId) {
    throw new UsageError('edit requires a note id: edit <id> "<content>"');
  }

  const { content: raw, fromFile, json } = parseEditOptions(rest);
  const content = await readContentSource({ content: raw, fromFile });

  if (content.trim().length === 0) {
    throw new UsageError(
      'Refusing to replace note content with blank text. Delete the note from the desktop app or web app instead.'
    );
  }

  const source = createNoteSource(credentials.access_token);
  const { version } = await source.update(noteId, content);

  if (json) {
    console.log(JSON.stringify({ id: noteId, version }));
  } else {
    console.error(`Updated note ${noteId} (version ${version})`);
  }
}
