jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import { createNoteSource } from '../note-source.ts';
import { addCommand, parseAddOptions } from '../commands/add.ts';
import {
  IMPORT_CONCURRENCY,
  MAX_CONSECUTIVE_FAILURES,
} from '../cli-constants.ts';
import {
  AbortedError,
  AuthError,
  CliError,
  NetworkError,
  PartialError,
  RateLimitError,
  UsageError,
} from '../domain/errors.ts';
import type { Credentials } from '../domain/types.ts';

const mockCreate = jest.fn();
const mockFind = jest.fn();
const mockSource = {
  create: mockCreate,
  find: mockFind,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('parseAddOptions', () => {
  it('requires --file', () => {
    expect(() => parseAddOptions([])).toThrow('add requires --file');
  });

  it('parses --file and --json', () => {
    expect(parseAddOptions(['--file=notes.json', '--json'])).toEqual({
      file: 'notes.json',
      json: true,
    });
  });

  it('rejects duplicate --file', () => {
    expect(() => parseAddOptions(['--file=a', '--file=b'])).toThrow(
      'Provide --file= once'
    );
  });

  it('rejects an empty --file= value instead of reading ""', () => {
    expect(() => parseAddOptions(['--file='])).toThrow(
      '--file cannot be empty'
    );
  });

  it('rejects a bare --file with a precise message', () => {
    // `--file` without `=` is a forgotten value, not a missing argument.
    expect(() => parseAddOptions(['--file'])).toThrow(
      '--file requires a value, e.g. --file=notes.json'
    );
  });
});

describe('addCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
    mockFind.mockResolvedValue([]);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockCreate.mockReset();
    mockFind.mockReset();
  });

  it('creates each note from the file and prints all ids', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a'] }, { content: 'two' }])
    );
    mockCreate
      .mockResolvedValueOnce({ id: 'n1', version: 1 })
      .mockResolvedValueOnce({ id: 'n2', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(fs.readFile).toHaveBeenCalledWith('notes.json', 'utf8');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenNthCalledWith(1, {
      content: 'one',
      tags: ['a'],
    });
    expect(mockCreate).toHaveBeenNthCalledWith(2, { content: 'two' });
    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['n1', 'n2']);
  });

  it('throws PartialError (exit 7) when some notes fail', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one' }, { content: 'two' }])
    );
    mockCreate
      .mockResolvedValueOnce({ id: 'n1', version: 1 })
      .mockRejectedValueOnce(new Error('boom'));

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(PartialError);
    expect((thrown as PartialError).code).toBe(7);
    expect(errorSpy).toHaveBeenCalledWith('Created 1, failed 1');
    expect(errorSpy).toHaveBeenCalledWith('  [1] boom');
  });

  it('skips notes that already exist (idempotent)', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a'] }, { content: 'two' }])
    );
    mockFind.mockResolvedValue([
      { id: 'existing', data: { content: 'one', tags: ['a'] } } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n2', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({ content: 'two' });
  });

  // Server-side tags may carry stray whitespace (e.g. created by the desktop
  // app) while import-file tags are trimmed before fingerprinting; the
  // fingerprint must trim both sides or "work" vs "work " silently re-imports
  // an existing note as a duplicate.
  it('treats server tags with surrounding whitespace as equal for dedup', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['work'] }])
    );
    mockFind.mockResolvedValue([
      {
        id: 'existing',
        data: { content: 'one', tags: [' work '] },
      } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // M-03: search matches tags case-insensitively, so the dedup fingerprint
  // folds casing too — otherwise an import after a case-only tag difference
  // would duplicate the note.
  it('treats server tags with different casing as equal for dedup', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['work'] }])
    );
    mockFind.mockResolvedValue([
      { id: 'existing', data: { content: 'one', tags: ['WORK'] } } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // M-03: an export round-trip normalizes line breaks to CRLF; a re-import
  // with LF must still collide on the fingerprint or it duplicates every note.
  it('treats CRLF and LF line breaks as equal for dedup', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one\r\ntwo\r\nthree' }])
    );
    mockFind.mockResolvedValue([
      { id: 'existing', data: { content: 'one\ntwo\nthree' } } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('re-imports a note that was moved to the trash', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one' }])
    );
    mockFind.mockResolvedValue([
      { id: 'trashed', data: { content: 'one', deleted: true } } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('de-duplicates repeated entries inside one import file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'same' }, { content: 'same' }])
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('reports a missing notes file as a usage error (exit 1)', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(
      new Error('ENOENT: no such file or directory')
    );

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=missing.json']);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(UsageError);
    expect((thrown as UsageError).code).toBe(1);
  });

  // "Partial" (7) is a lie when nothing at all was created: a script that
  // branches on 7 reports a half-done import that in fact never started.
  it('reports the underlying failure code when no note was created', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one' }])
    );
    mockCreate.mockRejectedValue(new NetworkError('boom'));

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(CliError);
    expect((thrown as CliError).code).toBe(3);
    expect((thrown as CliError).message).toContain('1 of 1 notes failed');
  });

  // A bad token makes every remaining create futile. Continuing produced one
  // error line per note and still exited 7 instead of "log in again" (2).
  it('stops at the first auth failure instead of trying every note', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({ content: `n${i}` }))
      )
    );
    mockCreate.mockRejectedValue(new AuthError('Unauthorized'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(AuthError);
    expect((thrown as AuthError).code).toBe(2);
    // The pool launches one wave before the first auth failure is observed;
    // nothing beyond that wave is attempted.
    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('note(s) not attempted')
    );
  });

  it('throws on invalid JSON', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('not json');

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('Invalid JSON');
  });

  it('throws on an empty array', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('[]');

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('non-empty JSON array');
  });

  it('throws on an entry with blank content', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: '  ' }])
    );

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 has no non-blank content');
  });

  it('throws when an entry is a primitive, not an object', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([42]));

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 is not an object');
  });

  it('throws when an entry is itself an array', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([['nested']]));

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 is not an object');
  });

  it('throws when tags is not an array', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: 'work' }])
    );

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 has invalid tags');
  });

  it('throws when a tag is not a string', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a', 5] }])
    );

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 has invalid tags');
  });

  // Shares normalizeTags with parseTags: surrounding whitespace is trimmed and
  // empty tags are dropped so the dedup fingerprint agrees with `create --tags=`.
  it('trims and drops blank tags before importing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: [' a ', '', 'b'] }])
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledWith({
      content: 'one',
      tags: ['a', 'b'],
    });
    expect(logSpy).toHaveBeenCalledWith('n1');
  });

  it('preserves a valid tags array', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a', 'b'] }])
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledWith({
      content: 'one',
      tags: ['a', 'b'],
    });
  });

  it('rejects a tag containing whitespace or a comma', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a\nb'] }])
    );

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('whitespace or a comma');
  });

  it('rejects a tag with an internal space before importing', async () => {
    // `a b` matches the desktop separator semantics: a value that can never
    // be found again by `tag:` must not be creatable via an import file.
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a b'] }])
    );

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('whitespace or a comma');
  });

  it('deduplicates repeated tags before importing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one', tags: ['a', 'a', 'b'] }])
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledWith({
      content: 'one',
      tags: ['a', 'b'],
    });
    expect(logSpy).toHaveBeenCalledWith('n1');
  });

  // A backend that is down fails every note. Without the early stop the CLI
  // ground through all 10 entries one-by-one, each waiting on its own timeout,
  // before reporting a partial failure. The streak cap gives up once the
  // outcome is no longer in doubt: one pool wave plus whatever raced in before
  // the cap was observed — never the whole file.
  it('stops early after MAX_CONSECUTIVE_FAILURES consecutive failures', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      content: `n${i}`,
    }));
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entries));
    mockCreate.mockRejectedValue(new NetworkError('boom'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(PartialError);
    // The first wave all fails in the same tick, so exactly one pool of
    // requests lands before every worker observes the stop; the rest are
    // skipped once the backend is clearly unavailable.
    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Stopped early after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
      )
    );
  });

  // A success in the middle of a failing streak proves the backend is
  // intermittent rather than categorically down, so the streak resets and the
  // import continues instead of bailing on a transient blip.
  it('resets the failure streak after a success', async () => {
    const entries = Array.from({ length: 9 }, (_, i) => ({
      content: `n${i}`,
    }));
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entries));
    mockCreate
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockResolvedValueOnce({ id: 'ok', version: 1 })
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'))
      .mockRejectedValueOnce(new NetworkError('boom'));

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    // Without the reset, four failures + four failures would hit the cap;
    // the success in between resets the streak, so every entry is attempted.
    expect(mockCreate).toHaveBeenCalledTimes(9);
    expect(thrown).toBeInstanceOf(PartialError);
  });

  // A Ctrl-C used to be indistinguishable from a flaky server: AbortedError
  // is not an AuthError, so the loop kept going and burned through
  // MAX_CONSECUTIVE_FAILURES more (instantly rejected) creates before giving
  // up, then blamed the backend in the summary.
  it('stops at the first cancellation instead of burning the failure budget', async () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      content: `n${i}`,
    }));
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entries));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce({ id: 'n0', version: 1 })
      .mockRejectedValue(new AbortedError('Request aborted'));

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(AbortedError);
    expect((thrown as AbortedError).code).toBe(6);
    // One success then one pool wave of cancelled attempts — not the budget.
    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Interrupted; 19 note(s) not attempted')
    );
  });

  // E-4: a 429 is the server asking us to slow down — on a write path with no
  // retries every further entry is refused too, so the batch stops at the
  // first one and the summary names the real cause instead of "backend
  // unavailable" or a generic partial failure.
  it('stops at the first rate limit instead of burning the failure budget', async () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      content: `n${i}`,
    }));
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entries));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce({ id: 'n0', version: 1 })
      .mockRejectedValue(
        new RateLimitError(
          'Too many requests (HTTP 429). Simperium API error: HTTP 429'
        )
      );

    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(RateLimitError);
    expect((thrown as RateLimitError).code).toBe(3);
    // One success then one pool wave of rate-limited attempts — not the budget.
    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Rate limited (HTTP 429); 19 note(s) not attempted'
      )
    );
  });

  // An import that dies on entry N has already created N-1 notes server-side.
  // Throwing before the report left the user with no record of which ids
  // landed; the dedup makes a re-run safe, but the ids are still the output.
  it('prints the ids that landed before rethrowing a terminal error', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one' }, { content: 'two' }])
    );
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce({ id: 'landed', version: 1 })
      .mockRejectedValueOnce(new AuthError('Unauthorized'));

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toBeInstanceOf(AuthError);

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['landed']);
  });

  // `(error as Error).message` on a non-Error rejection rendered as
  // "undefined", which told the user nothing about what went wrong.
  it('renders a non-Error rejection instead of printing undefined', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'one' }, { content: 'two' }])
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce({ id: 'n1', version: 1 })
      .mockRejectedValueOnce('upstream exploded');

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toBeInstanceOf(PartialError);

    expect(errorSpy).toHaveBeenCalledWith('  [1] upstream exploded');
  });

  it('throws on a null entry', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([null]));

    await expect(
      addCommand(credentials, ['--file=notes.json'])
    ).rejects.toThrow('entry 0 is not an object');
  });

  // The JSON report is the machine-readable surface for scripts. Every field
  // must agree with the human-readable path (same counts, same stop reason),
  // and a fully successful batch must not claim it stopped early.
  it('prints a structured JSON report in --json mode', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([
        { content: 'ok' },
        { content: 'dup' },
        { content: 'dup' },
      ])
    );
    mockFind.mockResolvedValue([
      { id: 'x', data: { content: 'dup', tags: [] } } as any,
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json', '--json']);

    const report = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      created: Array<{ index: number; id: string; version: number }>;
      skipped: Array<{ index: number }>;
      failures: Array<{ index: number; error: string }>;
      stoppedEarly: boolean;
      stopReason: string;
      unattempted: number;
    };
    expect(report.created).toEqual([{ index: 0, id: 'n1', version: 1 }]);
    expect(report.skipped).toEqual([{ index: 1 }, { index: 2 }]);
    // N-2: skipped entries carry only their index — the dedup keys off the
    // fingerprint, so echoing the full content would double the report size.
    expect(JSON.stringify(report)).not.toContain('content');
    expect(report.failures).toEqual([]);
    expect(report.stoppedEarly).toBe(false);
    expect(report.stopReason).toBe('complete');
    expect(report.unattempted).toBe(0);
  });

  // ── R6 并发语义 ──────────────────────────────────────────────────────────
  // The pool serializes entries per fingerprint: the successor awaits its
  // key's previous outcome instead of racing it. A failed predecessor lets the
  // successor try (mirroring the serial loop); a success dedups it.
  it('【并发语义】同指纹前驱失败后，后驱仍会尝试', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'dup' }, { content: 'dup' }])
    );
    mockCreate
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'n2', version: 1 });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(PartialError);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // The failed duplicate is a failure, the retried one lands.
    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['n2']);
  });

  it('【并发语义】同指纹并发条目不会重复创建', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([
        { content: 'dup' },
        { content: 'dup' },
        { content: 'dup' },
      ])
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['n1']);
  });

  // The chain tail is released once settled (B.3). This must not weaken the
  // dedup: 200 entries over 100 distinct fingerprints still create exactly one
  // note per fingerprint — a leaked or prematurely removed chain would let a
  // duplicate through (or, with an intermediate link deleted, race a create).
  it('【并发语义】大文件导入按指纹去重（尾守卫回收不破坏幂等）', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(
        Array.from({ length: 200 }, (_, i) => ({ content: `note-${i % 100}` }))
      )
    );
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).toHaveBeenCalledTimes(100);
    expect(logSpy.mock.calls).toHaveLength(100);
  });

  // Completion order is nondeterministic under concurrency, but the report is
  // restored to input order so the index column keeps pointing at the file.
  it('【并发语义】created/skipped/failures 按 index 升序输出', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([
        { content: 'a' },
        { content: 'b' },
        { content: 'c' },
        { content: 'd' },
      ])
    );
    mockCreate.mockImplementation(
      (entry: { content: string }) =>
        new Promise((resolve) => {
          // Reverse delay: the last entry finishes first.
          const delay = { a: 30, b: 20, c: 10, d: 0 }[entry.content] ?? 0;
          setTimeout(() => resolve({ id: entry.content, version: 1 }), delay);
        })
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await addCommand(credentials, ['--file=notes.json']);

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('【并发语义】连续失败触发停止且 unattempted 正确', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({ content: `n${i}` }))
      )
    );
    mockCreate.mockRejectedValue(new NetworkError('boom'));

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json', '--json']);
    } catch (e) {
      thrown = e;
    }

    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    const report = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      failures: Array<{ index: number; error: string }>;
      stoppedEarly: boolean;
      stopReason: string;
      unattempted: number;
    };
    expect(report.failures).toHaveLength(IMPORT_CONCURRENCY);
    expect(report.stoppedEarly).toBe(true);
    expect(report.stopReason).toBe('consecutive-failures');
    expect(report.unattempted).toBe(10 - IMPORT_CONCURRENCY);
    expect(thrown).toBeInstanceOf(PartialError);
  });

  it('【并发语义】terminal（auth/aborted）停止后不再消费剩余条目', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({ content: `n${i}` }))
      )
    );
    mockCreate.mockRejectedValue(new AbortedError('Request aborted'));

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json', '--json']);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(AbortedError);
    expect((thrown as AbortedError).code).toBe(6);
    expect(mockCreate).toHaveBeenCalledTimes(IMPORT_CONCURRENCY);
    const report = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      created: Array<{ index: number }>;
      failures: Array<{ index: number }>;
      stoppedEarly: boolean;
      stopReason: string;
      unattempted: number;
    };
    expect(report.created).toEqual([]);
    expect(report.failures).toEqual([]);
    expect(report.stoppedEarly).toBe(true);
    expect(report.stopReason).toBe('aborted');
    expect(report.unattempted).toBe(10);
  });

  // A1：per-key 串行化必须是"链"而非"扇出"。旧实现里两个 follower 会同时
  // await 同一个失败的前驱，双双 fall-through 并发创建 —— 3 条同指纹条目
  // 首条失败会产出 2 条重复笔记。修复后第 3 条只能在前驱尝试结束后再决定。
  it('【并发语义】同指纹 3 条且首条失败时严格串行，不扇出重复创建', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([
        { content: 'dup' },
        { content: 'dup' },
        { content: 'dup' },
      ])
    );
    mockCreate
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'n2', version: 1 });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let thrown: unknown;
    try {
      await addCommand(credentials, ['--file=notes.json']);
    } catch (e) {
      thrown = e;
    }

    // 失败 1 次 + 串行重试 1 次 = 恰好 2 次创建（旧实现会并发 3 次）
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['n2']);
  });

  // NFC：macOS 存 NFD、Windows/Linux 存 NFC，"café" 跨平台导出→导入必须去重。
  it('【幂等】NFC 与 NFD 形式同一文本去重', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify([{ content: 'caf\u00e9 au lait' }])
    );
    mockFind.mockResolvedValue([
      {
        id: 'existing',
        data: { content: 'cafe\u0301 au lait' } as any,
      },
    ]);
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await addCommand(credentials, ['--file=notes.json']);

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
