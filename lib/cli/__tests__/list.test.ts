jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

import { createNoteSource } from '../note-source.ts';
import { listCommand, parseListOptions } from '../commands/list.ts';
import type { Credentials } from '../domain/types.ts';

const mockFind = jest.fn();
const mockSource = {
  find: mockFind,
};

/**
 * A mock `find` that honours the source contract: trash is dropped at the
 * page boundary unless `includeTrashed` is set. The real source does this in
 * note-source.ts, so command-level tests exercise it through a faithful stub
 * rather than relying on a second, command-level filter.
 */
function mockFindFiltering(
  notes: Array<{ id: string; data: Record<string, unknown> }>
) {
  mockFind.mockImplementation(
    ({ includeTrashed }: { includeTrashed?: boolean }) =>
      Promise.resolve(
        notes.filter(
          (note) =>
            includeTrashed ||
            (note.data.deleted !== true && note.data.deleted !== 1)
        )
      )
  );
}

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('parseListOptions', () => {
  it('defaults to 20 items, non-json output and no trash', () => {
    expect(parseListOptions([])).toEqual({
      limit: 20,
      json: false,
      includeTrashed: false,
    });
  });

  it('parses a custom limit and json flag', () => {
    expect(parseListOptions(['--limit=5', '--json'])).toEqual({
      limit: 5,
      json: true,
      includeTrashed: false,
    });
  });

  // Falling back to 20 made `list --limit=abc` look successful while ignoring
  // what the user asked for.
  it('rejects an invalid limit instead of silently using the default', () => {
    expect(() => parseListOptions(['--limit=abc'])).toThrow(
      '--limit must be a positive integer'
    );
  });

  it('opts back into the trash with --include-trashed', () => {
    expect(parseListOptions(['--include-trashed']).includeTrashed).toBe(true);
  });

  it('rejects a stray positional argument', () => {
    expect(() => parseListOptions(['extra'])).toThrow(
      'Too many arguments for list'
    );
  });
});

describe('listCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockFind.mockReset();
  });

  it('prints notes as JSON when --json is passed', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      { id: 'n1', data: { content: 'hello world', modificationDate: 123 } },
      { id: 'n2', data: { content: 'second note', modificationDate: 456 } },
    ]);

    await listCommand(credentials, ['--json', '--limit=2']);

    // Newest first: the index arrives in storage order, the command sorts it.
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { id: 'n2', data: { content: 'second note', modificationDate: 456 } },
          { id: 'n1', data: { content: 'hello world', modificationDate: 123 } },
        ],
        null,
        2
      )
    );
    expect(createNoteSource).toHaveBeenCalledWith('tok');
  });

  it('returns the most recently modified notes, not the first N stored', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      { id: 'oldest', data: { content: 'a', modificationDate: 1 } },
      { id: 'newest', data: { content: 'b', modificationDate: 9 } },
      { id: 'middle', data: { content: 'c', modificationDate: 5 } },
    ]);

    await listCommand(credentials, ['--json', '--limit=2']);

    const parsed = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(parsed.map((item) => item.id)).toEqual(['newest', 'middle']);
  });

  it('does not mutate the array returned by the source', async () => {
    const notes = [
      { id: 'a', data: { content: 'a', modificationDate: 1 } },
      { id: 'b', data: { content: 'b', modificationDate: 2 } },
    ];
    mockFind.mockResolvedValue(notes);

    await listCommand(credentials, ['--json']);

    expect(notes.map((note) => note.id)).toEqual(['a', 'b']);
  });

  it('prints a tab-separated table when json is not requested', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      { id: 'n1', data: { content: 'line1\nline2', modificationDate: 123 } },
    ]);

    await listCommand(credentials, ['--limit=10']);

    expect(logSpy).toHaveBeenCalledWith('n1\t123\tline1 line2');
  });

  // 入参边界：非 JSON 输出下 data 可缺省 content/modificationDate（例如索引
  // 返回不含正文的占位对象）。`data?.content ?? ''` 与 `?? ''` 必须落到空串
  // 分支而非抛错，预览行退化为仅 id。
  it('prints an empty preview when a note has no content or date', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([{ id: 'n1', data: {} }]);

    await listCommand(credentials, ['--limit=10']);

    expect(logSpy).toHaveBeenCalledWith('n1\t\t');
  });

  // B.3：预览截断落在 surrogate pair 中间时，回退一位码元，避免孤立高代理
  // 乱码。59 个 BMP 字符 + emoji 使第 60 个码元恰为高代理。
  it('does not split a surrogate pair when truncating the preview', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      {
        id: 'n1',
        data: { content: 'a'.repeat(59) + '\u{1F600}', modificationDate: 1 },
      },
    ]);

    await listCommand(credentials, ['--limit=10']);

    const row = logSpy.mock.calls[0][0] as string;
    const content = row.split('\t')[2];
    // The cut would have landed on the emoji's high surrogate; the guard steps
    // back one code unit so no dangling surrogate is printed.
    expect(content).toBe('a'.repeat(59));
    expect(content).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  // B.3：tab 是列分隔符、\r 会覆盖终端，内容里的这两种字符必须被抹掉。
  it('strips tab and carriage return from cell content', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      { id: 'n1', data: { content: 'a\tb\rc', modificationDate: 1 } },
    ]);

    await listCommand(credentials, ['--limit=10']);

    expect(logSpy).toHaveBeenCalledWith('n1\t1\ta bc');
  });

  it('respects the limit option', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFind.mockResolvedValue([
      { id: 'a', data: { content: 'a', modificationDate: 1 } },
      { id: 'b', data: { content: 'b', modificationDate: 2 } },
      { id: 'c', data: { content: 'c', modificationDate: 3 } },
    ]);

    await listCommand(credentials, ['--json', '--limit=2']);

    const output = logSpy.mock.calls.map((call) => call[0]);
    const parsed = JSON.parse(output[0]) as Array<{ id: string }>;
    expect(parsed).toHaveLength(2);
  });

  it('hides trashed notes so the default page is actionable', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFindFiltering([
      { id: 'live', data: { content: 'a', modificationDate: 1 } },
      {
        id: 'gone',
        data: { content: 'b', modificationDate: 9, deleted: true },
      },
      // Simperium types `deleted` as boolean | 0 | 1, so 1 must count too.
      {
        id: 'gone-numeric',
        data: { content: 'c', modificationDate: 8, deleted: 1 },
      },
    ]);

    await listCommand(credentials, ['--json']);

    const parsed = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(parsed.map((item) => item.id)).toEqual(['live']);
  });

  it('keeps trashed notes when --include-trashed is passed', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockFindFiltering([
      { id: 'live', data: { content: 'a', modificationDate: 1 } },
      {
        id: 'gone',
        data: { content: 'b', modificationDate: 9, deleted: true },
      },
    ]);

    await listCommand(credentials, ['--json', '--include-trashed']);

    const parsed = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(parsed.map((item) => item.id)).toEqual(['gone', 'live']);
  });

  it('does not mutate the source array when including the trash', async () => {
    const notes = [
      { id: 'a', data: { content: 'a', modificationDate: 1 } },
      { id: 'b', data: { content: 'b', modificationDate: 2 } },
    ];
    mockFind.mockResolvedValue(notes);

    await listCommand(credentials, ['--json', '--include-trashed']);

    expect(notes.map((note) => note.id)).toEqual(['a', 'b']);
  });

  it('rejects when the source rejects', async () => {
    mockFind.mockRejectedValue(new Error('boom'));

    await expect(listCommand(credentials, [])).rejects.toThrow('boom');
  });
});
