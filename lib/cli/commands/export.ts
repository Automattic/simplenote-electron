import * as path from 'path';
import type { Credentials } from '../domain/types.ts';
import { createNoteSource } from '../note-source.ts';
import exportNotes from '../vendor/export/export-notes.ts';
import { writeExportBundle, type ExportFormat } from '../export-helpers.ts';
import { parseSingleValueFlag, rejectExtraPositionals } from '../cli-args.ts';
import { UsageError } from '../domain/errors.ts';
import type { GroupedExportNotes } from '../vendor/export/types.ts';
import type * as T from '../vendor/types.ts';

export type ExportFormats = ExportFormat | 'all';

export type ExportOptions = {
  format: ExportFormats;
  outputDir: string;
};

const FORMATS: ReadonlySet<string> = new Set([
  'json',
  'markdown',
  'zip',
  'all',
]);

export function parseExportOptions(args: string[]): ExportOptions {
  // `export` takes no positional arguments; a stray word is a typo.
  rejectExtraPositionals(args, 'export', 0);
  // parseSingleValueFlag handles the "bare flag / repeated / empty value"
  // checks for both flags; value-domain validation stays here (FORMATS is
  // export-specific). An explicit but empty value (or a bare flag with no
  // value) is a mistake, not a request for the default.
  const formatRaw = parseSingleValueFlag(args, 'format', 'json');
  let format: ExportFormats = 'all';
  if (formatRaw !== undefined) {
    if (!FORMATS.has(formatRaw)) {
      throw new UsageError(
        `--format must be one of: ${[...FORMATS].join(', ')}`
      );
    }
    format = formatRaw as ExportFormats;
  }

  const outputRaw = parseSingleValueFlag(args, 'output', './out');
  const outputDir = outputRaw ?? path.resolve('simplenote-export');
  return { format, outputDir };
}

/**
 * What each format tells the user afterwards.
 *
 * The publishing itself is transactional — `writeExportBundle` stages every
 * selected format and commits them as one unit — so per-format "write" hooks
 * here would break the all-or-nothing guarantee. Only the success message
 * stays per format.
 */
const DESCRIBERS: ReadonlyArray<{
  format: ExportFormat;
  describe: (outputDir: string) => string;
}> = [
  {
    format: 'json',
    describe: (dir) => `notes.json -> ${path.join(dir, 'notes.json')}`,
  },
  {
    format: 'markdown',
    describe: (dir) => `markdown -> ${path.join(dir, 'active', '*.md')}`,
  },
  {
    format: 'zip',
    describe: (dir) => `notes.zip -> ${path.join(dir, 'notes.zip')}`,
  },
];

export async function exportCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  const { format, outputDir } = parseExportOptions(args);
  const source = createNoteSource(credentials.access_token);
  const results = await source.find();
  // `find()` already guarantees unique ids (first page wins), so this Map is
  // a lookup structure, not a dedup pass. Built with a loop rather than
  // `new Map(results.map(...))` to skip an intermediate array of pairs.
  const notesMap = new Map<T.EntityId, T.Note>();
  for (const result of results) {
    notesMap.set(result.id as T.EntityId, result.data);
  }

  const grouped: GroupedExportNotes = await exportNotes(notesMap);

  const selected: ExportFormat[] =
    format === 'all' ? ['json', 'markdown', 'zip'] : [format];
  await writeExportBundle(selected, grouped, outputDir);

  for (const item of DESCRIBERS) {
    if (!selected.includes(item.format)) {
      continue;
    }
    console.error(`Exported ${item.describe(outputDir)}`);
  }
}
