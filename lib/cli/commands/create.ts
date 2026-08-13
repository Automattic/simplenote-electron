import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import { hasFlag, parseContentSource, parseTags } from '../cli-args.ts';
import { readContentSource } from '../content-input.ts';
import { UsageError } from '../domain/errors.ts';
import type * as T from '../vendor/types.ts';

export type CreateOptions = {
  content: string;
  fromFile: boolean;
  tags: string[];
  json: boolean;
};

export function parseCreateOptions(args: string[]): CreateOptions {
  const { content, fromFile } = parseContentSource(args, 'create', 'content');
  return {
    content,
    fromFile,
    tags: parseTags(args),
    json: hasFlag(args, 'json'),
  };
}

export async function createCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  const { content: raw, fromFile, tags, json } = parseCreateOptions(args);
  const content = await readContentSource({ content: raw, fromFile });

  if (content.trim().length === 0) {
    throw new UsageError('Refusing to create a note with blank content');
  }

  const source = createNoteSource(credentials.access_token);
  const { id, version } = await source.create({
    content,
    tags: tags as T.TagName[],
  });

  if (json) {
    console.log(JSON.stringify({ id, version }));
  } else {
    console.log(id);
    console.error(`Created note ${id} (version ${version})`);
  }
}
