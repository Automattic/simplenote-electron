import * as fs from 'fs/promises';
import { messageOf, UsageError } from './domain/errors.ts';
import type { ContentSource } from './domain/types.ts';

/**
 * Resolves a parsed content source to actual text.
 *
 * A missing or unreadable `--file=` is a mistake in the command line, not a
 * transport failure, so it surfaces as a usage error (exit 1) rather than
 * being lumped in with network errors (exit 3).
 */
export async function readContentSource(
  source: ContentSource
): Promise<string> {
  if (!source.fromFile) {
    return source.content;
  }
  try {
    return await fs.readFile(source.content, 'utf8');
  } catch (error) {
    // messageOf instead of `(error as Error).message`: a non-Error rejection
    // (string throws, plain objects) would otherwise render as "undefined".
    throw new UsageError(
      `Cannot read --file=${source.content}: ${messageOf(error)}`
    );
  }
}
