import { createNoteSource } from '../note-source.ts';
import {
  AuthError,
  ConflictError,
  NetworkError,
  NotFoundError,
} from '../domain/errors.ts';
import type * as T from '../vendor/types.ts';

const token = 'tok-123';

// infra/http.ts buffers the body with a single `text()` read inside the
// request deadline, so the double has to expose `text`, not `json`.
function mockResponse(
  status: number,
  body: unknown,
  versionHeader?: string
): Response {
  const headers = new Headers();
  if (versionHeader !== undefined) {
    headers.set('X-Simperium-Version', versionHeader);
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
    headers,
  } as unknown as Response;
}

describe('createNoteSource', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SIMPLENOTE_CLI_TIMEOUT_MS;
  });

  it('maps the index entries (id, d) to (id, data)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        index: [{ id: 'n1', d: { content: 'hello' } }],
      })
    );

    const notes = await createNoteSource(token).find();

    // Boundary normalization fills the fields the payload did not carry, so
    // downstream consumers (export, search previews) can rely on the shape.
    expect(notes).toEqual([
      {
        id: 'n1',
        data: {
          content: 'hello',
          creationDate: 0,
          modificationDate: 0,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      },
    ]);
    // objectContaining, not an exact match: every request now also carries an
    // AbortSignal from the shared timeout wrapper.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/note/index?data=true'),
      expect.objectContaining({ headers: { 'X-Simperium-Token': token } })
    );
    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // A corrupt or partially-written index row has no data blob. `search` and
  // `export` dereference `entry.d` freely, so it is dropped at the boundary
  // instead of crashing a command halfway through.
  it('skips index entries whose data blob is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        index: [
          { id: 'n1', d: { content: 'hello' } },
          { id: 'broken', d: null },
          { id: 'missing' },
        ],
      })
    );

    const notes = await createNoteSource(token).find();

    expect(notes.map((note) => note.id)).toEqual(['n1']);
  });

  // `list`/`search`/`add` only work with the live working set. Passing
  // `includeTrashed: false` must drop trashed records at the page boundary,
  // before they are retained in memory, instead of fetching and discarding
  // them downstream. The `deleted` flag arrives as `boolean | 0 | 1`, so both
  // spellings are exercised.
  it('drops trashed entries when asked not to include them', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        index: [
          { id: 'live', d: { content: 'a', deleted: false } },
          { id: 'gone-bool', d: { content: 'b', deleted: true } },
          { id: 'gone-num', d: { content: 'c', deleted: 1 } },
        ],
      })
    );

    const notes = await createNoteSource(token).find({ includeTrashed: false });

    expect(notes.map((note) => note.id)).toEqual(['live']);
  });

  // The default and the explicit opt-in both keep trashed records, which the
  // markdown/zip/json export needs for its trash/ half.
  it('keeps trashed entries by default and on explicit opt-in', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        index: [
          { id: 'live', d: { content: 'a' } },
          { id: 'gone', d: { content: 'b', deleted: true } },
        ],
      })
    );

    const byDefault = await createNoteSource(token).find();
    const optedIn = await createNoteSource(token).find({
      includeTrashed: true,
    });

    expect(byDefault.map((note) => note.id)).toEqual(['live', 'gone']);
    expect(optedIn.map((note) => note.id)).toEqual(['live', 'gone']);
  });

  // A dirty record is *repaired*, not dropped and not passed through: the
  // export path (`note.systemTags.includes`) and search previews used to crash
  // with a TypeError that surfaced as a bogus "network error" exit code.
  it('repairs index entries whose fields are unusable', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        index: [
          { id: 'no-system-tags', d: { content: 'a' } },
          {
            id: 'bad-fields',
            d: { content: 'b', tags: 'work', systemTags: null, deleted: 1 },
          },
          {
            id: 'string-dates',
            d: { content: 'c', creationDate: 'soon', modificationDate: 'x' },
          },
          { id: 'unknown-fields', d: { content: 'd', futureField: { x: 1 } } },
          { id: 'not-an-object', d: 'garbage' },
        ],
      })
    );

    const notes = await createNoteSource(token).find();
    const byId = new Map(notes.map((note) => [note.id, note.data]));

    expect(byId.get('no-system-tags')).toMatchObject({
      content: 'a',
      systemTags: [],
      tags: [],
    });
    expect(byId.get('bad-fields')).toMatchObject({
      tags: [],
      systemTags: [],
      deleted: true,
    });
    expect(byId.get('string-dates')).toMatchObject({
      creationDate: 0,
      modificationDate: 0,
    });
    // Fields this CLI does not model round-trip untouched (an edit POST must
    // not strip future API additions).
    expect(byId.get('unknown-fields')).toMatchObject({
      futureField: { x: 1 },
    });
    // A payload with no usable record at all follows the drop rule.
    expect(byId.has('not-an-object')).toBe(false);
  });

  it('treats a single-note payload with no usable record as not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(200, 'garbage'));

    await expect(createNoteSource(token).get('n1')).resolves.toBeUndefined();
  });

  // One request per 1000 notes instead of per 100: the default page size meant
  // a 5000-note account paid 50 sequential round trips just to run `list`.
  it('asks for a full page of index entries', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { index: [] })
    );

    await createNoteSource(token).find();

    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      'limit=1000'
    );
  });

  it('follows the mark for paginated indexes', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(200, {
          index: [{ id: 'a', d: { content: 'A' } }],
          mark: 'next-page',
        })
      )
      .mockResolvedValueOnce(
        mockResponse(200, {
          index: [{ id: 'b', d: { content: 'B' } }],
        })
      );

    const notes = await createNoteSource(token).find();

    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
    const calls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calls[1]).toContain('mark=next-page');
  });

  // The transport only guarantees the body parsed as JSON. A 200 whose shape
  // is wrong (captive portal, misconfigured proxy, an API change) used to
  // reach `for (const entry of page.index)` and throw a raw
  // "page.index is not iterable" — exit 99 with a stack trace instead of the
  // network error the CLI knows how to report.
  describe('index payload boundaries', () => {
    it.each([
      ['an empty object', {}],
      ['a null index', { index: null }],
      ['a non-array index', { index: { 0: { id: 'a' } } }],
      ['a bare array', [{ id: 'a', d: {} }]],
      ['a bare string', 'not json shaped like an index'],
      ['null', null],
    ])('rejects %s as a network error, not a TypeError', async (_, body) => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(200, body));

      const find = createNoteSource(token).find();

      await expect(find).rejects.toBeInstanceOf(NetworkError);
      await expect(find).rejects.toThrow('unexpected payload');
    });

    it('drops entries that carry no usable id instead of failing the run', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockResponse(200, {
          index: [
            null,
            'nonsense',
            { d: { content: 'no id' } },
            { id: '', d: { content: 'empty id' } },
            { id: 42, d: { content: 'numeric id' } },
            { id: 'ok', d: { content: 'keep me' } },
          ],
        })
      );

      const notes = await createNoteSource(token).find();

      expect(notes.map((n) => n.id)).toEqual(['ok']);
    });

    // A non-string mark matched neither `page.mark === mark` nor the
    // `Set<string>` of seen marks, so both loop terminators missed it and a
    // server echoing objects paged all the way to MAX_PAGES.
    it('stops paginating on a mark it cannot follow', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockResolvedValue(
        mockResponse(200, {
          index: [{ id: 'a', d: { content: 'A' } }],
          mark: { not: 'a cursor' },
        })
      );

      const notes = await createNoteSource(token).find();

      expect(notes.map((n) => n.id)).toEqual(['a']);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('follows a numeric mark by normalizing it to a string', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock
        .mockResolvedValueOnce(
          mockResponse(200, { index: [{ id: 'a', d: {} }], mark: 7 })
        )
        .mockResolvedValueOnce(
          mockResponse(200, { index: [{ id: 'b', d: {} }] })
        );

      const notes = await createNoteSource(token).find();

      expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
      expect(String(fetchMock.mock.calls[1][0])).toContain('mark=7');
    });
  });

  // `--help` advertises SIMPLENOTE_CLI_TIMEOUT_MS as *the* per-request
  // timeout, but the paged fetch used to build its per-attempt budget from
  // DEFAULT_TIMEOUT_MS, so the variable was a no-op on list/search/export --
  // the exact commands slow enough to need it.
  it('honours SIMPLENOTE_CLI_TIMEOUT_MS on a paged index fetch', async () => {
    process.env.SIMPLENOTE_CLI_TIMEOUT_MS = '40';
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    const started = Date.now();
    await expect(createNoteSource(token).find()).rejects.toThrow(
      'timed out after 40ms'
    );
    // Without the fix this waits out DEFAULT_TIMEOUT_MS (15s) per attempt.
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it('throws Unauthorized on 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(401, { error: 'unauthorized' })
    );

    await expect(createNoteSource(token).find()).rejects.toThrow(
      'Unauthorized: invalid access token'
    );
  });

  it('returns undefined for a missing note', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(404, { error: 'not found' })
    );

    const note = await createNoteSource(token).get('nope');

    expect(note).toBeUndefined();
  });

  it('fetches a single note by id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { content: 'single' })
    );

    const note = await createNoteSource(token).get('n1');

    expect(note).toEqual({
      id: 'n1',
      data: {
        content: 'single',
        creationDate: 0,
        modificationDate: 0,
        deleted: false,
        systemTags: [],
        tags: [],
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/note/i/n1'),
      expect.objectContaining({ headers: { 'X-Simperium-Token': token } })
    );
  });

  // The GET response carries the object version in an X-Simperium-Version
  // header. It is the base the next write must be computed against (`/v/{v}`),
  // so an edit merges with — instead of clobbering — concurrent changes.
  it('captures the version header when fetching a single note', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { content: 'v4' }, '4')
    );

    const note = await createNoteSource(token).get('n1');

    expect(note).toMatchObject({ id: 'n1', version: 4 });
    expect(note?.data.content).toBe('v4');
  });

  it('throws a generic error for other statuses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(500, { error: 'server' })
    );

    await expect(createNoteSource(token).find()).rejects.toThrow(
      'Simperium API error: HTTP 500'
    );
  });

  it('updates a note with merged fields and returns the new version', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(
          200,
          {
            content: 'old',
            creationDate: 100,
            modificationDate: 101,
            deleted: false,
            systemTags: ['markdown'],
            tags: ['work'],
            publishURL: 'https://x',
          },
          '4'
        )
      )
      .mockResolvedValueOnce(mockResponse(200, {}, '7'));

    const result = await createNoteSource(token).update('n1', 'new content');

    expect(result).toEqual({ version: 7 });
    const postCall = fetchMock.mock.calls[1];
    // 版本头 '4' 使 POST 走 /v/4 合并写（与"posts against the read version"
    // 用例一致）；正文仍携带合并后的完整字段。
    expect(String(postCall[0])).toContain('/note/i/n1/v/4?ccid=');
    expect((postCall[1] as RequestInit).method).toBe('POST');
    const body = JSON.parse((postCall[1] as RequestInit).body as string);
    expect(body.content).toBe('new content');
    expect(body.publishURL).toBe('https://x');
    expect(body.tags).toEqual(['work']);
    expect(typeof body.modificationDate).toBe('number');
  });

  // An edit must carry the version it read, so the server treats the change
  // as an increment from that base and merges concurrent edits per field
  // instead of clobbering them with the stale full body.
  it('posts against the read version so concurrent edits merge', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(200, { content: 'old', deleted: false }, '4')
      )
      .mockResolvedValueOnce(mockResponse(200, {}, '5'));

    const result = await createNoteSource(token).update('n1', 'new');

    expect(result).toEqual({ version: 5 });
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/note/i/n1/v/4?ccid='
    );
  });

  // R2-1：版本头缺失（代理/网关剥离 X-Simperium-Version）时 get 返回无
  // version 的 note；update 若继续 POST 会是盲写（versionPath=''），并发合并
  // 保护静默失效——显式 ConflictError 而不是悄悄覆盖。
  it('refuses a blind update when the version header is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { content: 'old', deleted: false })
    );

    await expect(createNoteSource(token).update('n1', 'x')).rejects.toThrow(
      'Cannot safely update note n1'
    );
    // 只有 GET，没有后续 POST。
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // A versioned write can land a 404 when the object was deleted concurrently
  // ("specified object version does not exist"). It is a not-found — exit 4 —
  // not a network fault (exit 3).
  it('classifies a 404 on the update POST as not-found', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(200, { content: 'old', deleted: false }, '4')
      )
      .mockResolvedValueOnce(mockResponse(404, { error: 'gone' }));

    let thrown: unknown;
    try {
      await createNoteSource(token).update('n1', 'new');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NotFoundError);
    expect((thrown as NotFoundError).code).toBe(4);
  });

  it('throws Note not found when the note does not exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(404, { error: 'not found' })
    );

    await expect(createNoteSource(token).update('nope', 'x')).rejects.toThrow(
      'Note not found: nope'
    );
  });

  it('throws when the note is trashed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, {
        content: 'old',
        creationDate: 100,
        modificationDate: 101,
        deleted: true,
        systemTags: [],
        tags: [],
      })
    );

    await expect(createNoteSource(token).update('n1', 'x')).rejects.toThrow(
      'Note is in the trash: n1'
    );
  });

  it('throws Unauthorized when the update POST is rejected', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(
          200,
          {
            content: 'old',
            creationDate: 100,
            modificationDate: 101,
            deleted: false,
            systemTags: [],
            tags: [],
          },
          '4'
        )
      )
      .mockResolvedValueOnce(mockResponse(401, { error: 'unauthorized' }));

    await expect(createNoteSource(token).update('n1', 'x')).rejects.toThrow(
      'Unauthorized: invalid access token'
    );
  });

  // The write already succeeded server-side. Throwing here used to make the
  // command look failed, and the natural user response -- run it again --
  // produced a second note. The GET carries a version (normal read); it is the
  // POST response's missing version header that degrades to 0.
  it('reports version 0 rather than failing a write that already landed', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(
          200,
          {
            content: 'old',
            creationDate: 100,
            modificationDate: 101,
            deleted: false,
            systemTags: [],
            tags: [],
          },
          '4'
        )
      )
      .mockResolvedValueOnce(mockResponse(200, {}));

    await expect(createNoteSource(token).update('n1', 'x')).resolves.toEqual({
      version: 0,
    });
  });

  it('creates a note with defaults and returns its id and version', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}, '1'));

    const result = await createNoteSource(token).create({
      content: 'hello',
      tags: ['work'] as T.TagName[],
    });

    expect(result).toEqual({ id: expect.any(String), version: 1 });
    const postCall = fetchMock.mock.calls[0];
    expect(String(postCall[0])).toContain('/note/i/');
    expect(String(postCall[0])).toContain('?ccid=');
    expect((postCall[1] as RequestInit).method).toBe('POST');
    const body = JSON.parse((postCall[1] as RequestInit).body as string);
    expect(body.content).toBe('hello');
    expect(body.deleted).toBe(false);
    expect(body.systemTags).toEqual(['markdown']);
    expect(body.tags).toEqual(['work']);
    expect(typeof body.creationDate).toBe('number');
    expect(typeof body.modificationDate).toBe('number');
  });

  it('creates a note with a custom system tag set', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}, '2'));

    await createNoteSource(token).create({
      content: 'x',
      systemTags: [],
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.systemTags).toEqual([]);
  });

  it('throws Unauthorized when the create POST is rejected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(401, { error: 'unauthorized' })
    );

    await expect(
      createNoteSource(token).create({ content: 'x' })
    ).rejects.toThrow('Unauthorized: invalid access token');
  });

  describe('error classification', () => {
    async function capture(run: () => Promise<unknown>): Promise<unknown> {
      try {
        await run();
        return undefined;
      } catch (error) {
        return error;
      }
    }

    it('maps 401 to an auth error (exit 2), not a network error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(401, {}));

      const error = await capture(() => createNoteSource(token).find());

      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe(2);
    });

    it('maps a server error to a network error (exit 3)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(500, {}));

      const error = await capture(() => createNoteSource(token).find());

      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).code).toBe(3);
    });

    it('maps a missing note to a not-found error (exit 4)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(404, {}));

      const error = await capture(() =>
        createNoteSource(token).update('nope', 'x')
      );

      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).code).toBe(4);
    });

    // 403 is what Simperium returns for a token that is valid but no longer
    // authorized. Falling through to the generic branch reported it as exit 3
    // ("network"), so scripts retried instead of prompting for a new login.
    it('maps 403 to an auth error (exit 2)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(403, {}));

      const error = await capture(() => createNoteSource(token).find());

      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe(2);
    });

    it.each([409, 412])(
      'maps a rejected write (HTTP %i) to a conflict error (exit 5)',
      async (status) => {
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse(status, {}));

        const error = await capture(() =>
          createNoteSource(token).create({ content: 'x' })
        );

        expect(error).toBeInstanceOf(ConflictError);
        expect((error as ConflictError).code).toBe(5);
      }
    );

    it('names rate limiting explicitly on a 429', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse(429, {}));

      const error = await capture(() =>
        createNoteSource(token).create({ content: 'x' })
      );

      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).message).toContain('Too many requests');
    });

    it('maps a trashed note to a conflict error (exit 5)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockResponse(200, { content: 'old', deleted: true, tags: [] })
      );

      const error = await capture(() =>
        createNoteSource(token).update('n1', 'x')
      );

      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).code).toBe(5);
    });
  });

  it('never replays a write, so a note cannot be created twice', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(503, {}));

    await expect(
      createNoteSource(token).create({ content: 'x' })
    ).rejects.toThrow('HTTP 503');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a throttled read instead of failing outright', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponse(503, {}))
      .mockResolvedValueOnce(mockResponse(200, { index: [] }));

    await expect(createNoteSource(token).find()).resolves.toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('stops paginating when the server repeats a mark', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(200, { index: [{ id: 'a', d: {} }], mark: 'm1' })
      )
      .mockResolvedValueOnce(
        mockResponse(200, { index: [{ id: 'b', d: {} }], mark: 'm2' })
      )
      .mockResolvedValueOnce(
        mockResponse(200, { index: [{ id: 'c', d: {} }], mark: 'm1' })
      );

    const notes = await createNoteSource(token).find();

    expect(notes.map((note) => note.id)).toEqual(['a', 'b', 'c']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // B.4：分页窗口内同 id 重复出现（snapshot 漂移）时只保留首页首次出现的
  // 那条，避免 list/search 输出重复行。
  it('drops a duplicate id across pages, first page wins', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(200, {
          index: [{ id: 'a', d: { content: 'first' } }],
          mark: 'm1',
        })
      )
      .mockResolvedValueOnce(
        mockResponse(200, {
          index: [
            { id: 'a', d: { content: 'second' } },
            { id: 'b', d: {} },
          ],
          mark: 'm2',
        })
      )
      .mockResolvedValueOnce(mockResponse(200, { index: [], mark: 'm1' }));

    const notes = await createNoteSource(token).find();

    expect(notes.map((note) => note.id)).toEqual(['a', 'b']);
    expect(notes[0].data.content).toBe('first');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  describe('total pagination time budget', () => {
    let now: number;
    let nowSpy: jest.SpyInstance;

    beforeEach(() => {
      now = 1_000_000;
      nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(() => {
      nowSpy.mockRestore();
      delete process.env.SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS;
    });

    it('【场景】整轮分页超过总量预算 【目的】验证 SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS 生效 【校验点】异常类型/文案/请求次数 【预期】NetworkError 且不再发起请求', async () => {
      process.env.SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS = '100';
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockImplementation(() => {
        // 第一页正常完成；随后把时钟推进到截止时间之后，
        // 第二轮迭代应在再次请求前触发预算保护。
        now += 500;
        return Promise.resolve(
          mockResponse(200, {
            index: [{ id: 'a', d: { content: 'A' } }],
            mark: 'm1',
          })
        );
      });

      let thrown: unknown;
      try {
        await createNoteSource(token).find();
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(NetworkError);
      expect((thrown as NetworkError).message).toContain('total time budget');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('【场景】服务端返回空字符串 mark 【目的】验证空 mark 视为分页终止 【校验点】结果与请求次数 【预期】单次请求且返回全部笔记', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockResolvedValue(
        mockResponse(200, {
          index: [{ id: 'a', d: { content: 'A' } }],
          mark: '',
        })
      );

      const notes = await createNoteSource(token).find();

      expect(notes.map((note) => note.id)).toEqual(['a']);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('【场景】deleted 字段为数值 1 【目的】验证数值型回收站标记同样拦截 【校验点】异常类型/退出码/文案 【预期】ConflictError code 5', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { content: 'old', deleted: 1, tags: [] })
    );

    let thrown: unknown;
    try {
      await createNoteSource(token).update('n1', 'x');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConflictError);
    expect((thrown as ConflictError).code).toBe(5);
    expect((thrown as ConflictError).message).toContain('trash');
  });

  it('【场景】单条笔记拉取返回 403 【目的】验证 403 归类认证错误 【校验点】异常类型与退出码 【预期】AuthError code 2', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(403, {}));

    let thrown: unknown;
    try {
      await createNoteSource(token).get('n1');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AuthError);
    expect((thrown as AuthError).code).toBe(2);
  });

  it('【场景】新建笔记时间戳 【目的】验证创建/修改时间一致 【校验点】请求体字段 【预期】creationDate === modificationDate', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(mockResponse(200, {}, '1'));

    await createNoteSource(token).create({ content: 'x' });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string
    );
    expect(typeof body.creationDate).toBe('number');
    expect(body.creationDate).toBe(body.modificationDate);
  });
});
