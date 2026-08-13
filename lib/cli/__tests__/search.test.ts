jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

import { createNoteSource } from '../note-source.ts';
import { searchCommand, parseSearchOptions } from '../commands/search.ts';
import { createBoundedCache } from '../vendor/note-utils.ts';
import type { Credentials } from '../domain/types.ts';
import type { BucketObject } from '../vendor/types.ts';
import type * as T from '../vendor/types.ts';

const mockFind = jest.fn();
const mockSource = {
  find: mockFind,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

function note(
  id: string,
  content: string,
  modificationDate = 0,
  tags: string[] = []
): BucketObject<T.Note> {
  return {
    id,
    data: {
      content,
      creationDate: modificationDate,
      deleted: false,
      modificationDate,
      tags: tags as T.TagName[],
      systemTags: [],
    },
  };
}

describe('parseSearchOptions', () => {
  it('defaults to 50 items, non-json output and no trash', () => {
    expect(parseSearchOptions([])).toEqual({
      limit: 50,
      json: false,
      includeTrashed: false,
    });
  });

  it('parses a custom limit and json flag', () => {
    expect(parseSearchOptions(['--limit=10', '--json'])).toEqual({
      limit: 10,
      json: true,
      includeTrashed: false,
    });
  });

  it('rejects an invalid limit instead of silently using the default', () => {
    expect(() => parseSearchOptions(['--limit=abc'])).toThrow(
      '--limit must be a positive integer'
    );
  });

  // `search "a" "b"` used to search for "a" and silently drop "b".
  it('rejects more than one query positional', () => {
    expect(() => parseSearchOptions(['b'])).toThrow(
      'Too many arguments for search'
    );
  });
});

describe('searchCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockFind.mockReset();
  });

  it('returns only notes whose content matches all terms', async () => {
    mockFind.mockResolvedValue([
      note('n1', 'alpha beta gamma'),
      note('n2', 'alpha only'),
      note('n3', 'beta gamma'),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['alpha beta', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['n1']);
  });

  it('sorts results by modificationDate descending', async () => {
    mockFind.mockResolvedValue([
      note('old', 'needle', 100),
      note('mid', 'needle', 200),
      note('new', 'needle', 300),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['new', 'mid', 'old']);
  });

  it('skips trashed notes unless asked for them', async () => {
    const trashed = note('gone', 'needle', 300);
    trashed.data.deleted = true;
    const all = [note('live', 'needle', 100), trashed];
    // Contract-faithful stub: the real source drops trash at the page boundary
    // in `find`, so the command receives it already filtered.
    mockFind.mockImplementation(
      ({ includeTrashed }: { includeTrashed?: boolean }) =>
        Promise.resolve(all.filter((n) => includeTrashed || !n.data.deleted))
    );

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle', '--json']);
    expect(
      (JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>).map(
        (item) => item.id
      )
    ).toEqual(['live']);

    logSpy.mockClear();
    await searchCommand(credentials, ['needle', '--json', '--include-trashed']);
    expect(
      (JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>).map(
        (item) => item.id
      )
    ).toEqual(['gone', 'live']);
  });

  it('respects tag: filters', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'needle', 1, ['work']),
      note('t2', 'needle', 2, ['home']),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle tag:work', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['t1']);
  });

  // B1-6：TAG: 前缀与 tag 值侧一致地大小写不敏感；旧实现前缀大小写敏感，
  // "TAG:work" 静默退化为对字面文本的全文搜索。
  it('matches a case-insensitive tag: prefix', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'needle', 1, ['work']),
      note('t2', 'needle', 2, ['home']),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle TAG:work', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['t1']);
  });

  // N-3：macOS 存 NFD（e + combining accent）、Win/Linux 存 NFC 的标签必须
  // 互相命中——create/add 存储、add 指纹与 tag: 检索都做 NFC 归一。
  it('matches a tag stored in NFD against an NFC tag: query', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'needle', 1, ['cafe\u0301']), // NFD: café
      note('t2', 'needle', 2, ['unrelated']),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle tag:caf\u00e9', '--json']); // NFC

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['t1']);
  });

  // B1-2：单查询词 ≥31 字符时 leadingChars 为负，拼出非法量词 {0,-N} 会让
  // new RegExp 抛 SyntaxError（旧实现误报为网络错误 exit 3）。
  it('does not crash on a single term longer than 30 chars', async () => {
    const longWord = 'a'.repeat(40);
    mockFind.mockResolvedValue([
      note('n1', `${longWord} inside`),
      note('n2', 'unrelated'),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      searchCommand(credentials, [longWord, '--json'])
    ).resolves.toBeUndefined();

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['n1']);
  });

  it('matches tags and content case-insensitively', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'Needle in a haystack', 1, ['Work']),
      note('t2', 'needle', 2, ['home']),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['NEEDLE tag:WORK', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['t1']);
  });

  // The tag filter and the content term are AND-ed: a note that matches only
  // one of them must not appear, which is the case a tag *or* a term test alone
  // never exercises.
  it('requires both the tag and the content term to match (AND)', async () => {
    mockFind.mockResolvedValue([
      note('hit', 'needle here', 3, ['work']),
      note('tagOnly', 'nothing relevant', 2, ['work']),
      note('termOnly', 'needle here', 1, ['home']),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle tag:work', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['hit']);
  });

  // A note with no tags at all can never satisfy a `tag:` filter. This pins
  // the short-circuit in createMatcher: the fast path must reject untagged
  // notes without building a Set, and must not fall through to the content
  // match as if the tag filter had not been asked for.
  it('excludes notes without tags from a tag: query even if content matches', async () => {
    mockFind.mockResolvedValue([
      note('tagged', 'needle here', 3, ['work']),
      note('untagged', 'needle here', 2),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['needle tag:work', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['tagged']);
  });

  // Terms come straight from the shell, so a query like `a+b` or `c(1)` must be
  // matched literally instead of being compiled as a regular expression.
  it('treats regex metacharacters in a query as literal text', async () => {
    mockFind.mockResolvedValue([
      note('lit', 'costs a+b dollars', 1),
      note('other', 'costs ab dollars', 2),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['a+b', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['lit']);
  });

  it('respects the limit option', async () => {
    mockFind.mockResolvedValue([
      note('a', 'x', 3),
      note('b', 'x', 2),
      note('c', 'x', 1),
    ]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['x', '--json', '--limit=2']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output).toHaveLength(2);
  });

  it('prints a tab-separated row in non-json mode', async () => {
    mockFind.mockResolvedValue([note('n1', '# Title\nbody', 123)]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['Title']);

    const row = logSpy.mock.calls[0][0] as string;
    expect(row).toContain('n1');
    expect(row).toContain('123');
    expect(row).toContain('Title');
  });

  // B.3：tab 是列分隔符、\r 覆盖终端，标题/预览里的这两种字符必须被抹掉。
  it('strips tab and carriage return from title and preview', async () => {
    mockFind.mockResolvedValue([note('n1', 'Title\tX\rY\nbody', 123)]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['Title']);

    const row = logSpy.mock.calls[0][0] as string;
    // Tab in the title cell became a space and the CR was dropped entirely;
    // the only remaining tabs are the column separators.
    expect(row).toContain('Title XY');
    expect(row).not.toContain('\r');
  });

  it('accepts flags before the query', async () => {
    mockFind.mockResolvedValue([note('n1', 'needle', 1), note('n2', 'other')]);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand(credentials, ['--json', '--limit=5', 'needle']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['n1']);
  });

  it('does not leak regex state between tag: queries', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'needle', 1, ['work']),
      note('t2', 'needle', 2, ['home']),
    ]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await searchCommand(credentials, ['needle tag:work', '--json']);
    await searchCommand(credentials, ['needle tag:work', '--json']);

    const first = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    const second = JSON.parse(logSpy.mock.calls[1][0]) as Array<{ id: string }>;
    expect(second.map((item) => item.id)).toEqual(first.map((i) => i.id));
    expect(second.map((item) => item.id)).toEqual(['t1']);
  });

  it('throws when no query is provided', async () => {
    await expect(searchCommand(credentials, [])).rejects.toThrow(
      'search requires a query'
    );
  });

  it('rejects a whitespace-only query without touching the network', async () => {
    await expect(searchCommand(credentials, ['   '])).rejects.toThrow(
      'search requires a query'
    );
    expect(mockFind).not.toHaveBeenCalled();
  });

  // 分支逻辑：纯 `tag:` 过滤（查询无词项）时 createMatcher 的词项正则集为
  // 空，必须命中「恒匹配」快捷路径而不是误判为全部不匹配；只有标签达标才
  // 进入结果集。
  it('filters by tags alone when the query has no search terms', async () => {
    mockFind.mockResolvedValue([
      note('t1', 'content', 1, ['work']),
      note('t2', 'content', 2, ['home']),
    ]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await searchCommand(credentials, ['tag:work', '--json']);

    const output = JSON.parse(logSpy.mock.calls[0][0]) as Array<{ id: string }>;
    expect(output.map((item) => item.id)).toEqual(['t1']);
  });

  it('rejects when find rejects', async () => {
    mockFind.mockRejectedValue(new Error('boom'));

    await expect(searchCommand(credentials, ['x'])).rejects.toThrow('boom');
  });
});

describe('createBoundedCache', () => {
  it('evicts the oldest insertion once the cap is exceeded', () => {
    const cache = createBoundedCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('keeps every entry while under the cap and returns set values', () => {
    const cache = createBoundedCache<number>(3);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('missing')).toBeUndefined();
  });
});
