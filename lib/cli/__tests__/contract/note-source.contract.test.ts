// Contract tests for note-source.ts against a real loopback server.
//
// These are the module-side delivery for "no CLI E2E in CI": the full
// createNoteSource -> httpRequest -> fetch -> socket chain runs against an
// in-process HTTP server speaking Simperium's REST dialect, so HTTP semantics
// (status codes, headers, body encoding) are exercised for real while the
// suite stays offline and hermetic.

import {
  createMockSimperiumServer,
  createRoutedFetch,
} from './mock-simperium.ts';
import type { MockSimperiumServer } from './mock-simperium.ts';
import { createNoteSource } from '../../note-source.ts';
import { AuthError, NetworkError, NotFoundError } from '../../domain/errors.ts';

let server: MockSimperiumServer;
let originalFetch: typeof fetch | undefined;

beforeEach(async () => {
  originalFetch = global.fetch;
  server = await createMockSimperiumServer();
  global.fetch = createRoutedFetch(server.port);
  // Keep the suite fast: everything here talks to loopback.
  process.env.SIMPLENOTE_CLI_TIMEOUT_MS = '2000';
  process.env.SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS = '10000';
});

afterEach(async () => {
  delete process.env.SIMPLENOTE_CLI_TIMEOUT_MS;
  delete process.env.SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS;
  if (originalFetch === undefined) {
    delete (global as { fetch?: typeof fetch }).fetch;
  } else {
    global.fetch = originalFetch;
  }
  await server.close();
});

function noteData(content: string): Record<string, unknown> {
  return {
    content,
    creationDate: 1700000000,
    modificationDate: 1700000000,
    deleted: false,
    publishURL: '',
    shareURL: '',
    systemTags: ['markdown'],
    tags: ['test'],
  };
}

describe('note-source contract', () => {
  it('follows a two-page index, merges the results and sends the auth header', async () => {
    server.setIndexPages([
      {
        body: { index: [{ id: 'n-1', d: noteData('first') }], mark: 'mark-1' },
      },
      { body: { index: [{ id: 'n-2', d: noteData('second') }] } },
    ]);
    const source = createNoteSource('token-123');

    const all = await source.find();

    expect(all.map((note) => note.id)).toEqual(['n-1', 'n-2']);
    expect(all[0].data.content).toBe('first');
    const indexRequests = server
      .requests()
      .filter((request) => request.url.includes('/index'));
    expect(indexRequests).toHaveLength(2);
    expect(indexRequests[1].url).toContain('mark=mark-1');
    for (const request of indexRequests) {
      expect(request.headers['x-simperium-token']).toBe('token-123');
    }
  });

  it('writes against the version read from the last GET', async () => {
    server.setGet({ body: noteData('old'), version: 7 });
    server.setWrite({ version: 8 });
    const source = createNoteSource('token-123');

    const result = await source.update('n-1', 'new text');

    expect(result.version).toBe(8);
    const writes = server
      .requests()
      .filter((request) => request.method === 'POST');
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toContain('/v/7');
  });

  it('maps a write-time 404 to NotFoundError (exit 4), not a network error', async () => {
    server.setGet({ body: noteData('old'), version: 7 });
    server.setWrite({ status: 404 });
    const source = createNoteSource('token-123');

    await expect(source.update('n-1', 'new text')).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('maps a 401 to AuthError (exit 2)', async () => {
    server.setGet({ body: noteData('x'), status: 401 });
    const source = createNoteSource('token-123');

    await expect(source.get('n-1')).rejects.toBeInstanceOf(AuthError);
  });

  it('retries a 429 and succeeds once the server recovers', async () => {
    server.setIndexPages([{ status: 429, body: {} }, { body: { index: [] } }]);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const source = createNoteSource('token-123');

    try {
      const all = await source.find();
      expect(all).toEqual([]);
    } finally {
      randomSpy.mockRestore();
    }

    const indexRequests = server
      .requests()
      .filter((request) => request.url.includes('/index'));
    expect(indexRequests).toHaveLength(2);
    expect(indexRequests[0].url).not.toContain('mark=');
  });

  it('rejects a dirty index payload as a NetworkError (exit 3)', async () => {
    server.setIndexPages([{ body: { index: null } }]);
    const source = createNoteSource('token-123');

    await expect(source.find()).rejects.toBeInstanceOf(NetworkError);
  });
});
