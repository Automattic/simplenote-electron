// Zero-dependency in-process stand-in for the Simperium REST API, used by the
// contract tests. Real sockets and real HTTP semantics (status codes, headers,
// body encoding) on a random loopback port, so the suite runs offline and in
// CI without a live account.
//
// The CLI builds every URL from config.ts constants and egresses exclusively
// through global.fetch, so the tests only need to (a) run this server on a
// random loopback port and (b) install a fetch wrapper that rewrites
// `https://api.simperium.com/**` onto `http://127.0.0.1:{port}/**` while
// preserving method, headers, body and signal. Any other host is refused so a
// regression can never leak a real network call from the test run.

import { createServer, request as nodeRequest } from 'node:http';
import type { ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export type RequestLog = {
  method: string;
  url: string;
  headers: Record<string, string>;
};

export type IndexPageResponse = {
  status?: number;
  body: unknown;
};

export type GetOptions = {
  status?: number;
  version?: number;
  body: unknown;
};

export type WriteOptions = {
  status?: number;
  version?: number;
};

export type MockSimperiumServer = {
  port: number;
  requests: () => RequestLog[];
  setIndexPages: (pages: IndexPageResponse[]) => void;
  setGet: (options: GetOptions) => void;
  setWrite: (options: WriteOptions) => void;
  close: () => Promise<void>;
};

function flattenHeaders(
  headers: NodeJS.Dict<string | string[] | undefined>
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    flat[key] = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
  return flat;
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

/**
 * Starts a loopback server speaking the subset of the Simperium REST API the
 * CLI exercises. Each test mutates behaviour through the setter methods; the
 * index endpoint serves a queue of pages so pagination scenarios can script
 * a sequence of responses (one 429 then a 200, or two pages with a mark).
 */
export async function createMockSimperiumServer(): Promise<MockSimperiumServer> {
  const logs: RequestLog[] = [];
  let indexPages: IndexPageResponse[] = [];
  let getOptions: GetOptions = { body: {} };
  let writeOptions: WriteOptions = {};

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    logs.push({
      method: req.method ?? 'GET',
      url: url.pathname + url.search,
      headers: flattenHeaders(req.headers),
    });
    // Drain the request body so keep-alive connections stay reusable.
    req.resume();

    if (
      req.method === 'GET' &&
      /^\/1\/[^/]+\/note\/index$/.test(url.pathname)
    ) {
      const page =
        indexPages.length > 0 ? indexPages.shift()! : { body: { index: [] } };
      sendJson(res, page.status ?? 200, page.body);
      return;
    }
    if (
      req.method === 'GET' &&
      /^\/1\/[^/]+\/note\/i\/[^/]+$/.test(url.pathname)
    ) {
      const headers: Record<string, string> =
        getOptions.version === undefined
          ? {}
          : { 'X-Simperium-Version': String(getOptions.version) };
      sendJson(res, getOptions.status ?? 200, getOptions.body, headers);
      return;
    }
    if (
      req.method === 'POST' &&
      /^\/1\/[^/]+\/note\/i\/[^/]+(\/v\/\d+)?$/.test(url.pathname)
    ) {
      const headers: Record<string, string> =
        writeOptions.version === undefined
          ? {}
          : { 'X-Simperium-Version': String(writeOptions.version) };
      sendJson(res, writeOptions.status ?? 200, {}, headers);
      return;
    }
    sendJson(res, 404, { error: 'contract test: no such route' });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  return {
    port,
    requests: () => logs,
    setIndexPages: (pages) => {
      indexPages = pages;
    },
    setGet: (options) => {
      getOptions = options;
    },
    setWrite: (options) => {
      writeOptions = options;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
}

type BufferedHttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * A fetch that rewrites `https://api.simperium.com/**` onto the loopback
 * server and refuses every other host. Implemented with node:http rather than
 * the global fetch so the contract tests run identically under jsdom (which
 * ships no fetch) and node.
 */
export function createRoutedFetch(port: number): typeof fetch {
  const routed = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url =
      input instanceof URL
        ? input
        : typeof input === 'string'
          ? new URL(input)
          : new URL(input.url);
    if (url.host !== 'api.simperium.com') {
      throw new Error(`Contract test refuses to reach host "${url.host}"`);
    }

    const headers: Record<string, string> = {};
    if (init?.headers) {
      const source =
        init.headers instanceof Headers
          ? init.headers
          : new Headers(init.headers as HeadersInit);
      source.forEach((value, key) => {
        headers[key] = value;
      });
    }

    const response = await new Promise<BufferedHttpResponse>(
      (resolve, reject) => {
        const req = nodeRequest(
          {
            host: '127.0.0.1',
            port,
            path: url.pathname + url.search,
            method: init?.method ?? 'GET',
            headers,
            signal: init?.signal ?? undefined,
          },
          (res) => {
            // setEncoding('utf8') makes data chunks strings, sidestepping the
            // Buffer<->Uint8Array<ArrayBufferLike> friction between the
            // installed @types/node and the TypeScript 5.7 generic Uint8Array.
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              resolve({
                status: res.statusCode ?? 0,
                headers: flattenHeaders(res.headers),
                body,
              });
            });
          }
        );
        req.on('error', reject);
        const body = init?.body;
        if (body !== undefined && body !== null) {
          req.write(String(body));
        }
        req.end();
      }
    );

    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      headers: new Headers(response.headers),
      text: async () => response.body,
      json: async () => JSON.parse(response.body),
    } as unknown as Response;
  };
  return routed as typeof fetch;
}
