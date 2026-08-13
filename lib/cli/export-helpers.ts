import { promises as fs, createWriteStream } from 'fs';
import { randomBytes } from 'crypto';
import { pipeline } from 'stream/promises';
import * as path from 'path';
import noteExportToZip from './vendor/export/to-zip.ts';
import type { GroupedExportNotes } from './vendor/export/types.ts';
import { debug } from './logging.ts';
import { isExternalAborted } from './infra/http.ts';
import {
  AbortedError,
  CliError,
  EXIT_NETWORK,
  NetworkError,
  messageOf,
} from './domain/errors.ts';
import { WRITE_CONCURRENCY } from './cli-constants.ts';
import { prepareNotes, type PreparedNote } from './export-naming.ts';

// --------------------------------------------------------------------------
// Publishing. Every artifact is written to a private staging path first, and
// the whole export is swapped in as one unit at the end.
//
// `export` exists so the user has a copy of their notes, which makes a
// half-finished run the one outcome it must never produce. The previous code
// wrote every artifact in place: a Ctrl-C, a full disk or a crash mid-write
// truncated `notes.json`/`notes.zip` on top of the last good export, and the
// markdown writer went further by deleting `active/` and `trash/` *before*
// writing, so a failure left the user with neither the new export nor the old
// one.
//
// The current flow is two phases:
//   1. Build every selected format into staging (the expensive part — content
//      generation, zip compression). A failure here removes the staging and
//      leaves the previous export untouched.
//   2. Commit all staged artifacts as one transaction: each old artifact is
//      renamed aside to a backup, the staging is renamed into place, and any
//      failure rolls the already-committed ones back. Only when every target
//      is swapped are the backups deleted.
//
// That makes `format=all` atomic across formats (json/zip/markdown never mix
// generations) and closes the markdown writer's two-rename window where a
// crash between the active/ and trash/ swaps lost one half.
//
// NOT supported: concurrent `export` runs targeting the same output directory.
// sweepStale identifies leftovers purely by the staging/backup name pattern,
// so it cannot tell a live process's staging from a crashed run's, and two
// commitAll transactions racing on the same target can undo each other's
// backup restores.
// --------------------------------------------------------------------------

const STAGING_SUFFIX = '.part';
const BACKUP_SUFFIX = '.bak';

/** Recognizable, collision-proof sibling path for staging. */
function stagingPath(target: string): string {
  const unique = `${process.pid}.${randomBytes(4).toString('hex')}`;
  return path.join(
    path.dirname(target),
    `.${path.basename(target)}.${unique}${STAGING_SUFFIX}`
  );
}

/** Sibling path the previous artifact is parked at during the commit. */
function backupPath(target: string): string {
  const unique = `${process.pid}.${randomBytes(4).toString('hex')}`;
  return path.join(
    path.dirname(target),
    `.${path.basename(target)}.${unique}${BACKUP_SUFFIX}`
  );
}

/** Every staging/backup path this module can produce for `target`. */
function isStagingOf(name: string, target: string): boolean {
  const base = `.${path.basename(target)}.`;
  if (!name.startsWith(base)) {
    return false;
  }
  const rest = name.slice(base.length);
  const suffix = rest.endsWith(STAGING_SUFFIX)
    ? STAGING_SUFFIX
    : rest.endsWith(BACKUP_SUFFIX)
      ? BACKUP_SUFFIX
      : null;
  if (suffix === null) {
    return false;
  }
  // stagingPath/backupPath embed `${pid}.${hex}`. A user file that merely
  // shares the prefix and the .part/.bak suffix is not ours and must never be
  // swept or restored over.
  return /^\d+\.[0-9a-f]{8}$/.test(rest.slice(0, -suffix.length));
}

/**
 * Removes staging/backups left by a run that was killed outright (SIGKILL,
 * power loss), which the failure paths below cannot clean up themselves.
 * Best-effort: housekeeping must never fail an export.
 *
 * Backups are treated as data, not garbage. commitAll parks the previous
 * artifact aside (`target -> backup`) before moving the staging into place;
 * a process killed in that window leaves the target missing and the backup
 * holding the *last good export*. Deleting it — the previous behaviour —
 * permanently lost the only copy. So a backup with a missing target is
 * renamed back into place; only when the target already exists is the backup
 * (now redundant) deleted.
 */
async function sweepStale(target: string): Promise<void> {
  const parent = path.dirname(target);
  let names: string[];
  try {
    names = await fs.readdir(parent);
  } catch {
    return;
  }
  const leftovers = names.filter((name) => isStagingOf(name, target));
  if (leftovers.length === 0) {
    return;
  }

  // Staging is always garbage: a build either finished (and was renamed away)
  // or was abandoned. Delete unconditionally, before any restore.
  await Promise.all(
    leftovers
      .filter((name) => name.endsWith(STAGING_SUFFIX))
      .map((name) =>
        fs
          .rm(path.join(parent, name), { recursive: true, force: true })
          .catch(() => {})
      )
  );

  const backups = leftovers.filter((name) => name.endsWith(BACKUP_SUFFIX));
  if (backups.length === 0) {
    return;
  }

  let targetExists = true;
  try {
    await fs.access(target);
  } catch {
    targetExists = false;
  }

  if (!targetExists) {
    // A crash between `rename(target -> backup)` and `rename(staging ->
    // target)` leaves the target missing while the backup holds the last good
    // export. Restore the *newest* backup (several crashes can leave several);
    // the older ones are superseded generations.
    const newest = await newestBackup(parent, backups);
    try {
      await fs.rename(path.join(parent, newest), target);
      targetExists = true;
    } catch (error) {
      // Best-effort: a failed restore must not block the export. Leave the
      // backup in place (target still missing, so it is not swept) and tell
      // the user where the last good export is. This is a data-recovery event
      // the user can act on, so it is visible (stderr), not a debug line.
      console.error(
        `Warning: export recovery failed — could not restore ${path.join(parent, newest)} over ${target}: ${messageOf(error)}. ` +
          'The last good export is still at that backup path; copy it back manually.'
      );
    }
  }

  // Now that the target exists (either it already did, or we just restored a
  // backup into it), every remaining backup is a superseded generation.
  if (targetExists) {
    await Promise.all(
      backups.map((name) =>
        fs
          .rm(path.join(parent, name), { recursive: true, force: true })
          .catch(() => {})
      )
    );
  }
}

/** Picks the most recently modified backup, the closest to "last good". */
async function newestBackup(
  parent: string,
  backups: string[]
): Promise<string> {
  let newest = backups[0];
  let newestTime = -Infinity;
  for (const name of backups) {
    try {
      const stat = await fs.stat(path.join(parent, name));
      // Deterministic tie-break on equal mtime (the file system can report
      // the same timestamp for two backups written within its granularity):
      // the lexically larger name wins. The backup name's `${pid}.${hex}`
      // middle makes this *not* a time ordering — pid varies in length and
      // the hex is random — but it does make "which backup" repeatable for
      // the same directory, which is all a tie-break needs.
      if (
        stat.mtimeMs > newestTime ||
        (stat.mtimeMs === newestTime && name > newest)
      ) {
        newestTime = stat.mtimeMs;
        newest = name;
      }
    } catch {
      // Vanished mid-scan; keep the current pick.
    }
  }
  return newest;
}

/** One on-disk artifact of an export, in its staging form. */
type StagedArtifact = {
  /** Final location the staging path will be swapped into. */
  target: string;
  /** Path `build` must write; unique per attempt, never the live target. */
  staging: string;
  /** Writes `staging`; must not touch `target`. */
  build: (staging: string) => Promise<void>;
};

export type ExportFormat = 'json' | 'markdown' | 'zip';

/**
 * The artifacts one export request produces. json/zip are single files;
 * markdown is the active/ + trash/ pair (the two halves of one format).
 */
function collectArtifacts(
  formats: readonly ExportFormat[],
  grouped: GroupedExportNotes,
  outputDir: string
): StagedArtifact[] {
  const artifacts: StagedArtifact[] = [];

  if (formats.includes('json')) {
    const target = path.join(outputDir, 'notes.json');
    artifacts.push({
      target,
      staging: stagingPath(target),
      build: (staging) =>
        fs.writeFile(staging, JSON.stringify(grouped, null, 2), 'utf8'),
    });
  }

  if (formats.includes('zip')) {
    const target = path.join(outputDir, 'notes.zip');
    artifacts.push({
      target,
      staging: stagingPath(target),
      build: async (staging) => {
        const zip = await noteExportToZip(grouped);
        if (!zip) {
          throw new NetworkError('Failed to generate zip archive');
        }
        // Streamed to disk rather than assembled in memory: for large accounts
        // the in-memory archive peaks at several times the source size and can
        // exceed Node's buffer limit.
        await pipeline(
          zip.generateNodeStream({
            type: 'nodebuffer',
            streamFiles: true,
            compression: 'DEFLATE',
          }),
          createWriteStream(staging)
        );
      },
    });
  }

  if (formats.includes('markdown')) {
    const activeDir = path.join(outputDir, 'active');
    const trashDir = path.join(outputDir, 'trash');
    artifacts.push({
      target: activeDir,
      staging: stagingPath(activeDir),
      build: (staging) =>
        writeNotesToDir(staging, prepareNotes(grouped.activeNotes)),
    });
    artifacts.push({
      target: trashDir,
      staging: stagingPath(trashDir),
      build: (staging) =>
        writeNotesToDir(staging, prepareNotes(grouped.trashedNotes)),
    });
  }

  return artifacts;
}

/**
 * Best-effort removal of every staging path. Used by both the rollback path
 * (commitAll) and the phase-one failure path (writeExportBundle); a leftover
 * staging is swept by the next run anyway, so failures here are swallowed.
 */
function removeStaging(artifacts: StagedArtifact[]): Promise<void> {
  return Promise.all(
    artifacts.map((a) =>
      fs.rm(a.staging, { recursive: true, force: true }).catch(() => {})
    )
  ).then(() => undefined);
}

/**
 * Swaps every staging path into place as one unit, rolling back on failure.
 *
 * `rename` cannot overwrite a *directory* on any platform, and cannot
 * overwrite an existing file on Windows, so each old artifact is first moved
 * aside to a backup; the staging then moves into the now-free slot. If any
 * rename fails, previously committed artifacts are removed and their backups
 * restored, leaving the last good export exactly as it was.
 */
async function commitAll(artifacts: StagedArtifact[]): Promise<void> {
  const backups: Array<{ target: string; backup: string }> = [];
  try {
    for (const { target, staging } of artifacts) {
      const backup = backupPath(target);
      try {
        await fs.rename(target, backup);
        backups.push({ target, backup });
      } catch (error) {
        // No previous artifact (first export): the slot is already free.
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
      await fs.rename(staging, target);
    }
  } catch (error) {
    for (const { target, backup } of backups.reverse()) {
      await fs
        .rm(target, { recursive: true, force: true })
        .catch((e) =>
          console.error(
            `Warning: rollback could not remove the partial export at ${target}: ${messageOf(e)}`
          )
        );
      await fs
        .rename(backup, target)
        .catch((e) =>
          console.error(
            `Warning: rollback could not restore ${backup} over ${target}: ${messageOf(e)}. ` +
              'The previous export is still at that backup path; copy it back manually.'
          )
        );
    }
    await removeStaging(artifacts);
    throw error;
  }
  // Success: delete the backups so the output directory holds only the new
  // export. Best-effort — a leftover is swept by the next run.
  await Promise.all(
    backups.map(({ backup }) =>
      fs.rm(backup, { recursive: true, force: true }).catch(() => {})
    )
  );
}

/**
 * Stages every requested format, then commits them all together.
 *
 * Formats that are part of one `export` invocation are committed as one
 * transaction, so a failure can never leave a mix of old and new artifacts
 * on disk. Single-format writers below are thin wrappers over this.
 */
export async function writeExportBundle(
  formats: readonly ExportFormat[],
  grouped: GroupedExportNotes,
  outputDir: string
): Promise<void> {
  const artifacts = collectArtifacts(formats, grouped, outputDir);
  debug(`export: staging ${artifacts.length} artifact(s) in ${outputDir}`);

  // Phase one: build everything in staging. The directory creation is part of
  // the phase, not a pre-step, so a local filesystem failure (permissions,
  // full disk, a path that exists as a file) is wrapped here rather than
  // surfacing as a bare EACCES/ENOENT. sweepStale is best-effort and never
  // throws, so folding it into the phase is safe.
  //
  // Sequential on purpose — the zip builder holds its archive in memory while
  // streaming, and running writers concurrently would multiply peak memory
  // for no wall-clock gain on an I/O-bound, single-directory workload.
  try {
    await fs.mkdir(outputDir, { recursive: true });

    // Sweep leftovers from a killed run before touching anything this run owns.
    await Promise.all(artifacts.map((artifact) => sweepStale(artifact.target)));

    for (const artifact of artifacts) {
      // An interrupt during the local phase has no fetch in flight to cancel,
      // so check the process signal per artifact and turn it into the same
      // AbortedError the fetch path throws. Without this a Ctrl-C mid-export
      // ran the whole staging/commit to completion and exited 0.
      if (isExternalAborted()) {
        throw new AbortedError('Export was cancelled');
      }
      await artifact.build(artifact.staging);
    }
    debug(
      `export: staging complete, committing ${artifacts.length} artifact(s)`
    );
  } catch (error) {
    await removeStaging(artifacts);
    // A local write failure is wrapped as a typed error pointing at the export
    // directory, so it reads as a disk problem, not a network one. Errors that
    // already carry a code (zip generation -> NetworkError, an abort from a
    // future signal check -> AbortedError) keep their own semantics.
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      EXIT_NETWORK,
      `Failed to write export at ${outputDir}: ${messageOf(error)}`
    );
  }

  // Phase two: swap everything in as one unit, with backup/rollback.
  await commitAll(artifacts);
}

/**
 * Single-format writers. Thin wrappers over `writeExportBundle` — the
 * production dispatch (`commands/export.ts`) calls `writeExportBundle`
 * directly; these three exist so the tests can exercise one format in
 * isolation. Not part of the public command surface; kept for test
 * compatibility, not as a general API.
 */
export async function writeJsonExport(
  grouped: GroupedExportNotes,
  outputDir: string
): Promise<void> {
  await writeExportBundle(['json'], grouped, outputDir);
}

export async function writeZipExport(
  grouped: GroupedExportNotes,
  outputDir: string
): Promise<void> {
  await writeExportBundle(['zip'], grouped, outputDir);
}

/**
 * Writes notes to `dir` with a bounded number of in-flight writes. A fixed pool
 * of workers keeps the disk busy without opening one descriptor per note (EMFILE)
 * or stalling on the single slowest file in a fence-style batch.
 *
 * Each worker is handed a *disjoint* slice of the notes (index modulo pool size)
 * rather than sharing a mutable `cursor` that every worker increments. Sharing
 * the cursor is the classic "shared counter across concurrent tasks" anti-pattern:
 * it relies on the increment happening to be atomic between awaits, which is
 * fragile and unreadable. Partitioned slices are obviously correct and need no
 * coordination.
 */
async function writeNotesToDir(
  dir: string,
  notes: PreparedNote[]
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  if (notes.length === 0) {
    return;
  }

  const poolSize = Math.min(WRITE_CONCURRENCY, notes.length);
  const chunks: PreparedNote[][] = Array.from({ length: poolSize }, () => []);
  notes.forEach((note, index) => {
    chunks[index % poolSize].push(note);
  });

  await Promise.all(
    chunks.map(async (chunk) => {
      for (const note of chunk) {
        // Per-file interrupt check (same AbortedError the per-artifact check
        // throws): a large markdown export of thousands of files must not keep
        // writing after Ctrl-C until the next artifact boundary.
        if (isExternalAborted()) {
          throw new AbortedError('Export was cancelled');
        }
        await fs.writeFile(
          path.join(dir, `${note.fileName}.md`),
          note.content,
          'utf8'
        );
      }
    })
  );
}

export async function writeMarkdownExport(
  grouped: GroupedExportNotes,
  outputDir: string
): Promise<void> {
  await writeExportBundle(['markdown'], grouped, outputDir);
}
