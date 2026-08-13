jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

jest.mock('../vendor/export/to-zip.ts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { promises as fs } from 'fs';
import { Readable } from 'stream';
import * as os from 'os';
import * as path from 'path';
import { createNoteSource } from '../note-source.ts';
import noteExportToZip from '../vendor/export/to-zip.ts';
import { exportCommand, parseExportOptions } from '../commands/export.ts';
import type { Credentials } from '../domain/types.ts';
import type * as T from '../vendor/types.ts';

const mockFind = jest.fn();
const mockSource = {
  find: mockFind,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

const sampleNote: T.Note = {
  content: '# Active Note\n\nbody',
  creationDate: 1700000000,
  modificationDate: 1700000001,
  systemTags: ['markdown'],
  tags: ['work'] as T.TagName[],
  deleted: false,
};

const trashedNote: T.Note = {
  content: 'trashed note',
  creationDate: 1690000000,
  modificationDate: 1690000001,
  systemTags: [],
  tags: [],
  deleted: true,
};

// The archive is streamed to disk rather than buffered in memory, so the
// double has to hand back a fresh readable stream on every call.
const mockZip = {
  generateNodeStream: jest.fn(() => Readable.from(['zip-bytes'])),
};

describe('parseExportOptions', () => {
  it('defaults to all formats and the simplenote-export directory', () => {
    const opts = parseExportOptions([]);
    expect(opts.format).toBe('all');
    expect(opts.outputDir).toBe(path.resolve('simplenote-export'));
  });

  it('parses a single format and custom output dir', () => {
    const opts = parseExportOptions(['--format=json', '--output=/tmp/out']);
    expect(opts.format).toBe('json');
    expect(opts.outputDir).toBe('/tmp/out');
  });

  // Falling back to "all" turned `--format=exe` into a full export the user
  // never asked for, silently writing three artefacts instead of failing.
  it('rejects an unknown format', () => {
    expect(() => parseExportOptions(['--format=exe'])).toThrow(
      '--format must be one of'
    );
  });

  it('rejects an empty --format or --output rather than guessing', () => {
    expect(() => parseExportOptions(['--format='])).toThrow(
      '--format cannot be empty'
    );
    expect(() => parseExportOptions(['--output='])).toThrow(
      '--output cannot be empty'
    );
  });

  it('rejects a repeated --format= or --output= flag instead of keeping the first value', () => {
    expect(() => parseExportOptions(['--format=json', '--format=zip'])).toThrow(
      'Provide --format= once'
    );
    expect(() =>
      parseExportOptions(['--output=/tmp/a', '--output=/tmp/b'])
    ).toThrow('Provide --output= once');
  });

  it('keeps "=" inside an output path', () => {
    expect(parseExportOptions(['--output=/tmp/a=b']).outputDir).toBe(
      '/tmp/a=b'
    );
  });

  it('rejects a stray positional argument', () => {
    expect(() => parseExportOptions(['extra'])).toThrow(
      'Too many arguments for export'
    );
  });
});

/**
 * Delete a scratch directory without ever failing the test.
 *
 * Teardown is not an assertion: some environments wrap `fs.rm` (recycle-bin
 * shims, read-only mounts, antivirus locks) and reject even though every
 * assertion already passed. Letting that bubble up turns a green test red for
 * reasons that have nothing to do with the code under test.
 */
async function removeQuietly(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort — the OS reclaims the temp directory anyway.
  }
}

/**
 * Waits until no staging directory remains under `dir`.
 *
 * The markdown writer publishes the active and trash directories in parallel
 * (`Promise.all`), so when the active side fails the rejection surfaces while
 * the sibling trash publish may still be mid-flight. Polling for the ".part"
 * artefacts to disappear makes the assertion race-free without slowing the
 * happy path.
 */
async function waitForNoPart(dir: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    if (!(await fs.readdir(dir)).some((name) => name.endsWith('.part'))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('exportCommand', () => {
  // A unique directory per test keeps the runs independent and, unlike a fixed
  // folder under the repo root, never leaves artefacts in the working tree.
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simplenote-cli-export-'));
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
    (noteExportToZip as jest.Mock).mockResolvedValue(mockZip);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    mockFind.mockReset();
    (noteExportToZip as jest.Mock).mockClear();
    await removeQuietly(tmpDir);
  });

  it('writes notes.json with the expected structure', async () => {
    mockFind.mockResolvedValue([
      { id: 'n1', data: sampleNote },
      { id: 'n2', data: trashedNote },
    ]);

    await exportCommand(credentials, ['--format=json', `--output=${tmpDir}`]);

    const raw = await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      activeNotes: Array<{ id: string; content: string }>;
      trashedNotes: Array<{ id: string }>;
    };
    expect(parsed.activeNotes).toHaveLength(1);
    expect(parsed.activeNotes[0].id).toBe('n1');
    expect(parsed.activeNotes[0].content).toContain('# Active Note');
    expect(parsed.trashedNotes).toHaveLength(1);
    expect(parsed.trashedNotes[0].id).toBe('n2');
    expect(createNoteSource).toHaveBeenCalledWith('tok');
  });

  it('writes markdown files under active/ and trash/', async () => {
    mockFind.mockResolvedValue([
      { id: 'n1', data: sampleNote },
      { id: 'n2', data: trashedNote },
    ]);

    await exportCommand(credentials, [
      '--format=markdown',
      `--output=${tmpDir}`,
    ]);

    const activeFiles = await fs.readdir(path.join(tmpDir, 'active'));
    const trashFiles = await fs.readdir(path.join(tmpDir, 'trash'));
    expect(activeFiles.length).toBe(1);
    expect(activeFiles[0]).toMatch(/\.md$/);
    expect(trashFiles.length).toBe(1);
  });

  it('removes stale markdown from a previous export into the same directory', async () => {
    // A note that existed at export time but has since been deleted (or whose
    // first line changed) must not survive as a ghost .md in the next export.
    const activeDir = path.join(tmpDir, 'active');
    const trashDir = path.join(tmpDir, 'trash');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.mkdir(trashDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'ghost.md'), 'stale', 'utf8');
    await fs.writeFile(path.join(trashDir, 'ghost.md'), 'stale', 'utf8');

    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, [
      '--format=markdown',
      `--output=${tmpDir}`,
    ]);

    const activeFiles = await fs.readdir(activeDir);
    const trashFiles = await fs.readdir(trashDir);
    expect(activeFiles).toHaveLength(1);
    expect(activeFiles[0]).not.toBe('ghost.md');
    expect(trashFiles).toHaveLength(0);
  });

  it('appends tags to markdown content', async () => {
    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, [
      '--format=markdown',
      `--output=${tmpDir}`,
    ]);

    const [file] = await fs.readdir(path.join(tmpDir, 'active'));
    const content = await fs.readFile(
      path.join(tmpDir, 'active', file),
      'utf8'
    );
    expect(content).toContain('Tags:');
    expect(content).toContain('work');
  });

  it('writes a zip archive via noteExportToZip', async () => {
    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, ['--format=zip', `--output=${tmpDir}`]);

    expect(noteExportToZip).toHaveBeenCalled();
    const bytes = await fs.readFile(path.join(tmpDir, 'notes.zip'));
    expect(bytes.toString()).toBe('zip-bytes');
  });

  it('writes all formats when format=all', async () => {
    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, [`--output=${tmpDir}`]);

    expect(
      await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8')
    ).toBeTruthy();
    expect(await fs.readdir(path.join(tmpDir, 'active'))).toHaveLength(1);
    expect(await fs.readFile(path.join(tmpDir, 'notes.zip'))).toBeTruthy();
  });

  it('rejects when find rejects', async () => {
    mockFind.mockRejectedValue(new Error('boom'));

    await expect(exportCommand(credentials, ['--format=json'])).rejects.toThrow(
      'boom'
    );
  });

  it('leaves no staging artefacts behind on a successful export', async () => {
    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, [`--output=${tmpDir}`]);

    const entries = await fs.readdir(tmpDir);
    expect(entries.filter((name) => name.endsWith('.part'))).toEqual([]);
    expect(entries.sort()).toEqual([
      'active',
      'notes.json',
      'notes.zip',
      'trash',
    ]);
  });

  // `export` exists so the user has a copy of their notes, so a failed run
  // must never be worse than not running it at all. The markdown writer used
  // to delete active/ and trash/ *before* writing: a failure left neither the
  // new export nor the previous one.
  it('keeps the previous markdown export when the new one fails', async () => {
    const activeDir = path.join(tmpDir, 'active');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'previous.md'), 'good', 'utf8');

    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);
    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));

    await expect(
      exportCommand(credentials, ['--format=markdown', `--output=${tmpDir}`])
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    // The concurrent trash publish may still be settling when the active one
    // fails; wait for it before asserting there is no orphaned staging.
    await waitForNoPart(tmpDir);

    // The old export is still there, and no staging directory was orphaned.
    expect(await fs.readdir(activeDir)).toEqual(['previous.md']);
    expect(
      (await fs.readdir(tmpDir)).filter((name) => name.endsWith('.part'))
    ).toEqual([]);
  });

  // The active/ and trash/ halves are one export, so a failure in one half
  // must not swap in the other. When the trash build fails, the old code had
  // already replaced active/ with the new generation, leaving a brand-new
  // active/ next to a stale trash/ — two generations mixed in one export.
  it('keeps both halves of a previous markdown export when either half fails', async () => {
    const activeDir = path.join(tmpDir, 'active');
    const trashDir = path.join(tmpDir, 'trash');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.mkdir(trashDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'old.md'), 'old-active', 'utf8');
    await fs.writeFile(path.join(trashDir, 'old.md'), 'old-trash', 'utf8');

    mockFind.mockResolvedValue([
      { id: 'n1', data: sampleNote },
      { id: 'n2', data: trashedNote },
    ]);

    // Only the trash half fails (its note's file name is derived from the
    // content's first line, "trashed note"). The active half builds fine —
    // exactly the setup that used to leave a half-swapped export behind.
    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockImplementation(async (file: unknown, ..._rest: unknown[]) => {
        if (String(file).endsWith('trashed note.md')) {
          throw new Error('ENOSPC: no space left on device');
        }
      });

    await expect(
      exportCommand(credentials, ['--format=markdown', `--output=${tmpDir}`])
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    await waitForNoPart(tmpDir);

    // Neither half was swapped: the old export survives intact instead of a
    // new active/ sitting next to the previous trash/.
    expect(await fs.readdir(activeDir)).toEqual(['old.md']);
    expect(await fs.readdir(trashDir)).toEqual(['old.md']);
  });

  // R3: the two renames are one transaction. Even when the *build* succeeds,
  // a failed install of the trash half (a rename error, not a build error)
  // must roll the already-installed active half back — never a new active/
  // beside a missing trash/.
  it('restores both markdown halves when a commit-phase rename fails', async () => {
    const activeDir = path.join(tmpDir, 'active');
    const trashDir = path.join(tmpDir, 'trash');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.mkdir(trashDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'old.md'), 'old-active', 'utf8');
    await fs.writeFile(path.join(trashDir, 'old.md'), 'old-trash', 'utf8');

    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    const originalRename = fs.rename;
    const rename = jest
      .spyOn(fs, 'rename')
      .mockImplementation(async (from: unknown, to: unknown) => {
        // Fail only the swap of the trash *staging* into place. Backups and
        // rollback restores move non-.part paths, so they must not be caught.
        if (String(from).endsWith('.part') && String(to).endsWith('trash')) {
          throw new Error('EPERM: rename failed');
        }
        return originalRename(from as string, to as string);
      });

    await expect(
      exportCommand(credentials, ['--format=markdown', `--output=${tmpDir}`])
    ).rejects.toThrow('EPERM');
    rename.mockRestore();

    // Both halves were rolled back to the previous export, and no staging or
    // backup artefact was orphaned.
    expect(await fs.readdir(activeDir)).toEqual(['old.md']);
    expect(await fs.readdir(trashDir)).toEqual(['old.md']);
    expect(
      (await fs.readdir(tmpDir)).filter(
        (name) => name.endsWith('.part') || name.endsWith('.bak')
      )
    ).toEqual([]);
  });

  // R2: `format=all` commits every format as one unit. When the zip install
  // fails, the already-committed notes.json and active/ must be rolled back,
  // so the output never mixes a new generation with an old one.
  it('rolls back every format when one commit fails in format=all', async () => {
    const activeDir = path.join(tmpDir, 'active');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'old.md'), 'old', 'utf8');
    await fs.writeFile(
      path.join(tmpDir, 'notes.json'),
      '{"previous":true}',
      'utf8'
    );

    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    const originalRename = fs.rename;
    const rename = jest
      .spyOn(fs, 'rename')
      .mockImplementation(async (from: unknown, to: unknown) => {
        // Fail only the zip install; backups and the other formats proceed.
        if (String(to).endsWith('notes.zip')) {
          throw new Error('EPERM: rename failed');
        }
        return originalRename(from as string, to as string);
      });

    await expect(
      exportCommand(credentials, [`--output=${tmpDir}`])
    ).rejects.toThrow('EPERM');
    rename.mockRestore();

    // notes.json and active/ were committed before zip; both rolled back.
    expect(await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8')).toBe(
      '{"previous":true}'
    );
    expect(await fs.readdir(activeDir)).toEqual(['old.md']);
    expect(
      (await fs.readdir(tmpDir)).filter(
        (name) => name.endsWith('.part') || name.endsWith('.bak')
      )
    ).toEqual([]);
  });

  it('keeps the previous notes.json when the new one fails', async () => {
    const target = path.join(tmpDir, 'notes.json');
    await fs.writeFile(target, '{"previous":true}', 'utf8');

    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);
    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));

    await expect(
      exportCommand(credentials, ['--format=json', `--output=${tmpDir}`])
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    expect(await fs.readFile(target, 'utf8')).toBe('{"previous":true}');
  });

  // Staging a killed run (SIGKILL, power loss) cannot clean up after itself,
  // so the next export sweeps what it recognizes as its own leftovers.
  it('sweeps staging left by a killed run', async () => {
    const orphan = path.join(tmpDir, '.notes.json.999.deadbeef.part');
    await fs.writeFile(orphan, 'half a file', 'utf8');
    mockFind.mockResolvedValue([{ id: 'n1', data: sampleNote }]);

    await exportCommand(credentials, ['--format=json', `--output=${tmpDir}`]);

    await expect(fs.access(orphan)).rejects.toBeTruthy();
  });
});
