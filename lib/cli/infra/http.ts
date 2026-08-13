// Single HTTP egress point for the CLI.
//
// Problems this solves:
//
// 1. Node's global fetch has no default timeout. A half-open socket leaves
//    `npm run cli -- list` hanging forever, and a CLI has no UI to cancel it.
//    Every attempt runs under an AbortController with a wall-clock deadline
//    (override with SIMPLENOTE_CLI_TIMEOUT_MS). The deadline also covers the
//    body read, not just the response headers: a server that sends headers
//    then stalls the body would otherwise hang forever after fetch() resolves.
//
// 2. Transient upstream failures used to surface as a hard error on the first
//    hiccup. Callers can opt into bounded retries with exponential backoff and
//    full jitter (AWS Architecture Blog, "Exponential Backoff And Jitter").
//    Retries are opt-in per call, never a default, so a note-creating POST is
//    never replayed and duplicate notes cannot be produced.
//
// 3. Retries used to be able to outlive the caller's own budget: three 15s
//    attempts plus backoff is 45s+ inside a command that promised 120s for a
//    hundred pages. `deadlineAt` makes the overall budget authoritative — each
//    attempt is clamped to what is left, and a retry that could not finish in
//    time is not started at all.
//
// Structure: `runAttempt` owns the *transport* (one request, one deadline, one
// cancellation wiring) and classifies its outcome; `httpRequest` owns the
// *policy* (what is retryable, how long to wait, when to give up). Keeping the
// two apart is what removed the previous loop's mid-body `continue` plus a
// second, unrelated sleep at the bottom of the same iteration.

import { AbortedError, NetworkError, messageOf } from '../domain/errors.ts';
import { debug } from '../logging.ts';
import {
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MAX_RETRY_AFTER_MS,
  MIN_ATTEMPT_TIMEOUT_MS,
  MIN_BACKOFF_MS,
  envPositiveInt,
} from '../cli-constants.ts';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_RETRIES = 2;

// Process-level cancellation bridge. `app.ts` installs the AbortSignal from
// its SIGINT/SIGTERM handler here; every `httpRequest` merges it with the
// caller's own signal so a Ctrl-C cancels in-flight fetches even when the
// caller (auth.ts, note-source.ts) did not thread a signal down to this layer.
//
// Without this bridge the process-level abort had no path to the per-attempt
// controller: an interrupt during `export` left the socket open until the
// per-attempt deadline, the loop kept retrying as if nothing had happened,
// and the CLI only wound down once `exitWhenIdle` forced it. The signal is
// module-scoped on purpose — there is exactly one process, so exactly one
// process-level signal. Tests reset it to `null` in `afterEach`.
let externalSignal: AbortSignal | null = null;

export function setExternalAbortSignal(signal: AbortSignal | null): void {
  externalSignal = signal;
}

/**
 * True when the process-level signal (SIGINT/SIGTERM, installed by app.ts via
 * `setExternalAbortSignal`) has fired.
 *
 * This is the bridge for work that runs *between* requests — export's local
 * staging/commit phase has no fetch in flight to cancel, so it checks this
 * per artefact instead. Same module-scoped source as `externalSignal`: there
 * is exactly one process, so exactly one process-level signal.
 */
export function isExternalAborted(): boolean {
  return externalSignal?.aborted ?? false;
}

// Only statuses that mean "the server asked us to come back later". A plain
// 500 is usually a deterministic server-side bug, so retrying it just
// multiplies the failure and delays the error the user needs to see. 408 is
// included because it is the server reporting *its own* read timeout
// (RFC 9110 15.5.9), which is exactly the transient case retries exist for.
const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

/** Longest body excerpt echoed back when a response is not the JSON we expect. */
const BODY_PREVIEW_LENGTH = 120;

export type HttpResponse = {
  status: number;
  ok: boolean;
  headers: Headers;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export type HttpOptions = {
  /** Wall-clock deadline for a single attempt. */
  timeoutMs?: number;
  /** Extra attempts after the first. Only set this for idempotent requests. */
  retries?: number;
  /** Prefix used when this layer has to synthesize an error message. */
  label?: string;
  /**
   * Cancellation from the caller (Ctrl-C, a command giving up on a batch).
   * Passed explicitly rather than read from a module-level global so that a
   * unit test, a nested command and the process signal handler cannot
   * accidentally share — or clobber — each other's cancellation scope.
   */
  signal?: AbortSignal;
  /**
   * Absolute wall-clock deadline (`Date.now()` milliseconds) covering *all*
   * attempts, including the waits between them. Set it when the caller has an
   * overall budget to honour, e.g. a paged index fetch.
   */
  deadlineAt?: number;
};

/**
 * The per-request timeout in force for this process.
 *
 * Exported because callers that compute their own per-attempt budget (the
 * paged index fetch clamps each page to what is left of the total budget)
 * have to start from the *configured* limit, not from `DEFAULT_TIMEOUT_MS`.
 * They used to read the constant directly, which silently made
 * `SIMPLENOTE_CLI_TIMEOUT_MS` a no-op for `list`/`search`/`export` even
 * though `--help` advertises it as the per-request timeout.
 */
export function perRequestTimeoutMs(): number {
  return envPositiveInt('SIMPLENOTE_CLI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
}

function backoffMs(attempt: number): number {
  const ceiling = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  // Full jitter: random delay in [0, ceiling). A non-zero floor keeps a
  // "backoff" from becoming an immediate retry.
  return Math.max(MIN_BACKOFF_MS, Math.floor(Math.random() * ceiling));
}

/**
 * `Retry-After` in either documented form (RFC 9110 10.2.3): delay-seconds or
 * an HTTP-date. Only the seconds form used to be understood, so a server that
 * answered with a date fell back to our own jitter and hammered it early.
 *
 * Returns `null` when the header is absent or unparseable, which means "use
 * the local backoff instead".
 */
export function retryAfterMs(
  headers: Headers,
  now: number = Date.now()
): number | null {
  const raw = headers.get('retry-after');
  if (raw === null || raw.trim() === '') {
    return null;
  }

  const seconds = Number(raw);
  const delay = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(raw) - now;
  if (!Number.isFinite(delay)) {
    return null;
  }
  // Clamped on both ends: a hostile "Retry-After: 86400" must not park the CLI
  // for a day, and a "0" must not turn the backoff into a hot loop. The upper
  // bound is MAX_RETRY_AFTER_MS, not the local backoff cap: the header is the
  // server's explicit instruction, and the local cap exists only to keep
  // *our* backoff from compounding — it must not shorten what the server told
  // us to wait (a 429 with "Retry-After: 30" would otherwise retry in 4s and
  // burn the whole retry budget on a service that has not recovered).
  return Math.min(Math.max(delay, MIN_BACKOFF_MS), MAX_RETRY_AFTER_MS);
}

/**
 * The cancellation sources this layer honours, as one list.
 *
 * There are exactly two — the caller's own signal and the process-level one
 * installed by `app.ts` — and every decision point must consult *both*.
 * Checking them ad hoc is what let them drift apart: the backoff wait watched
 * only the caller's signal, while in practice no production caller passes one
 * (note-source.ts and auth.ts rely entirely on the process bridge), so a
 * Ctrl-C during a retry wait was simply ignored until the timer expired.
 */
function cancellationSignals(signal?: AbortSignal): AbortSignal[] {
  const signals: AbortSignal[] = [];
  if (signal) {
    signals.push(signal);
  }
  if (externalSignal) {
    signals.push(externalSignal);
  }
  return signals;
}

function isCancelled(signal?: AbortSignal): boolean {
  return cancellationSignals(signal).some((candidate) => candidate.aborted);
}

function sleep(ms: number, signals: readonly AbortSignal[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signals.some((signal) => signal.aborted)) {
      reject(new AbortedError('Request aborted'));
      return;
    }

    const settle = (): void => {
      clearTimeout(timer);
      for (const signal of signals) {
        signal.removeEventListener('abort', onAbort);
      }
    };
    const onAbort = (): void => {
      settle();
      reject(new AbortedError('Request aborted'));
    };
    // Deliberately *not* unref'd. An unref'd backoff lets the event loop go
    // idle between attempts, and bootstrap's idle-exit then tears the process
    // down mid-retry — exit 0, no output, no error, on a command that never
    // ran. The wait is bounded by MAX_BACKOFF_MS and always settles, so
    // holding the loop open for it cannot hang the CLI.
    const timer = setTimeout(() => {
      settle();
      resolve();
    }, ms);
    for (const signal of signals) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null | undefined)?.name === 'AbortError';
}

/**
 * Propagates caller cancellation onto a per-attempt controller.
 *
 * `AbortSignal.any` would do this in one call, but it only exists on Node 20+;
 * on older runtimes a Ctrl-C used to degrade to "keep the request running"
 * because the merged signal could not be built. Wiring the caller's signal
 * onto the controller directly works everywhere. The returned cleanup removes
 * the listener in `finally`, so a long pagination run cannot accumulate
 * handlers on the long-lived process-level signal.
 */
function linkAbort(
  controller: AbortController,
  signal?: AbortSignal | null
): () => void {
  if (!signal) {
    return () => undefined;
  }
  if (signal.aborted) {
    controller.abort();
    return () => undefined;
  }
  const handler = (): void => controller.abort();
  signal.addEventListener('abort', handler, { once: true });
  return () => signal.removeEventListener('abort', handler);
}

/** Read the body once, guarding against mocks that omit a `text` method. */
async function readBody(res: Response): Promise<string> {
  if (typeof res.text === 'function') {
    return res.text();
  }
  return '';
}

/**
 * How long this attempt may take, given the (optional) overall budget.
 *
 * `limit` is a hard ceiling — the caller (or SIMPLENOTE_CLI_TIMEOUT_MS) asked
 * for it. `MIN_ATTEMPT_TIMEOUT_MS` only guards the *other* input: a budget
 * that is nearly (or already) spent would otherwise produce a 0ms — or
 * negative — deadline that aborts the request before the socket opens.
 *
 * Applying the floor to the result instead, as this used to, silently raised
 * a deliberately short timeout back to a second, so a sub-second
 * SIMPLENOTE_CLI_TIMEOUT_MS was ignored on exactly the paged commands
 * (`list`, `search`, `export`) that are slow enough to want tuning.
 */
function attemptTimeoutMs(limit: number, deadlineAt?: number): number {
  if (deadlineAt === undefined) {
    return limit;
  }
  const remaining = deadlineAt - Date.now();
  return Math.min(limit, Math.max(MIN_ATTEMPT_TIMEOUT_MS, remaining));
}

type BufferedResponse = {
  status: number;
  ok: boolean;
  headers: Headers;
  body: string;
};

/**
 * The four things one attempt can end as. Naming them is what lets the policy
 * loop below read as a decision table instead of a chain of boolean flags:
 * `timeout` and `cancelled` are terminal, `transport` is retryable, and
 * `response` hands the status back for the policy to judge.
 */
type AttemptResult =
  | { kind: 'response'; response: BufferedResponse }
  | { kind: 'timeout'; error: NetworkError }
  | { kind: 'cancelled'; error: AbortedError }
  | { kind: 'transport'; error: NetworkError };

async function runAttempt(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
  signal?: AbortSignal
): Promise<AttemptResult> {
  const controller = new AbortController();
  // One controller serves both the per-attempt deadline and any caller cancel.
  // `timedOut` keeps the two apart so the message says which one fired.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // Each source gets its own listener so it can be removed independently in
  // `finally`. A long pagination run otherwise accumulates one abort handler
  // per attempt on the long-lived process signal, and an interrupt fired
  // during a previous attempt could not reach this attempt's controller.
  const unlinks = cancellationSignals(signal).map((source) =>
    linkAbort(controller, source)
  );

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      // A 3xx must never be followed silently: cross-origin redirects do not
      // strip a custom header like X-Simperium-Token (Fetch only drops
      // Authorization/Cookie), so following one could leak the bearer token to
      // an unrelated host. All three base URLs are fixed authoritative HTTPS
      // endpoints that never legitimately redirect, so treat a redirect as a
      // transport fault and let the read path's retry policy decide.
      redirect: 'error',
    });
    // Buffered *inside* the deadline window: a caller left holding an
    // unconsumed stream pins a socket, and a server that sends headers then
    // stalls the body would never time out.
    const body = await readBody(res);
    return {
      kind: 'response',
      response: {
        status: res.status,
        ok: res.ok,
        headers: res.headers,
        body,
      },
    };
  } catch (error) {
    // Cancellation is checked first: when a Ctrl-C and the deadline race, the
    // user's intent is the more useful thing to report. Both sources count —
    // production callers (note-source.ts, auth.ts) pass no signal of their
    // own, so checking only `signal` reported every Ctrl-C as a timeout.
    if (isCancelled(signal)) {
      return {
        kind: 'cancelled',
        error: new AbortedError(`${label} was cancelled`),
      };
    }
    if (timedOut) {
      return {
        kind: 'timeout',
        error: new NetworkError(`${label} timed out after ${timeoutMs}ms`),
      };
    }
    if (isAbortError(error)) {
      return {
        kind: 'cancelled',
        error: new AbortedError(`${label} was cancelled`),
      };
    }
    return {
      kind: 'transport',
      error: new NetworkError(`${label} failed: ${messageOf(error)}`),
    };
  } finally {
    clearTimeout(timer);
    for (const unlink of unlinks) {
      unlink();
    }
  }
}

function parseJson(body: string, label: string, status: number): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    // An unguarded JSON.parse surfaced as "Unexpected token < in JSON at
    // position 0", which tells the user nothing about which call failed or
    // that they were handed an HTML error page.
    const preview = body
      .slice(0, BODY_PREVIEW_LENGTH)
      .replace(/\s+/g, ' ')
      .trim();
    throw new NetworkError(
      `${label} returned a non-JSON body (HTTP ${status})${
        preview ? `: ${preview}` : ''
      }`
    );
  }
}

function buffered(res: BufferedResponse, label: string): HttpResponse {
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    json: async () => parseJson(res.body, label, res.status),
    text: async () => res.body,
  };
}

/**
 * Waits out a backoff, or reports that waiting is pointless.
 *
 * Returns `false` when the overall deadline would elapse before (or just
 * after) the retry could run — starting an attempt we know cannot finish only
 * delays the error the caller is waiting for.
 */
async function waitBeforeRetry(
  delayMs: number,
  deadlineAt: number | undefined,
  signal?: AbortSignal
): Promise<boolean> {
  if (deadlineAt !== undefined && Date.now() + delayMs >= deadlineAt) {
    return false;
  }
  await sleep(delayMs, cancellationSignals(signal));
  return true;
}

/**
 * fetch with a hard deadline and optional retries.
 *
 * The body is read inside the deadline window and returned buffered, so status
 * handling stays with the caller (`401 -> AuthError`, `404 -> undefined`) but
 * the response is already fully received — no dangling body that can hang a
 * pipe or leak a socket.
 */
export async function httpRequest(
  url: string,
  init: RequestInit = {},
  options: HttpOptions = {}
): Promise<HttpResponse> {
  const perAttemptLimit = options.timeoutMs ?? perRequestTimeoutMs();
  const retries = Math.max(0, options.retries ?? 0);
  const label = options.label ?? 'Request';
  const { signal, deadlineAt } = options;

  let lastError: Error = new NetworkError(`${label} failed`);

  for (let attempt = 0; ; attempt++) {
    // Cheap pre-check: a signal that fired during the previous backoff (or
    // before the first attempt) must not open another socket. The process-
    // level signal is checked here too, so an interrupt that landed between
    // attempts is reported as a cancellation rather than starting a fresh
    // socket that is doomed to be torn down.
    if (isCancelled(signal)) {
      throw new AbortedError(`${label} was cancelled`);
    }
    // A deadline that already elapsed must not open a socket: the attempt
    // would be clamped to MIN_ATTEMPT_TIMEOUT_MS and burn a second just to
    // time out. Pagination callers (note-source.ts) check the budget
    // themselves, but a direct httpRequest caller gets the same fail-fast
    // here instead of a guaranteed timeout.
    if (deadlineAt !== undefined && Date.now() >= deadlineAt) {
      // First attempt: the budget was already gone before we started — say so
      // explicitly instead of the generic placeholder. After a retryable
      // response, lastError carries the real status and is more useful.
      throw attempt === 0
        ? new NetworkError(`${label} failed: total time budget exhausted`)
        : lastError;
    }

    // Computed once and reused: attemptTimeoutMs reads Date.now(), so calling
    // it twice would give the debug line a different value than the attempt.
    const timeoutMs = attemptTimeoutMs(perAttemptLimit, deadlineAt);
    debug(
      `HTTP ${init.method ?? 'GET'} ${url} (attempt ${attempt + 1}, timeout ${timeoutMs}ms)`
    );
    const result = await runAttempt(url, init, timeoutMs, label, signal);

    if (result.kind === 'response') {
      const { response } = result;
      debug(`HTTP ${response.status} ${url}`);
      // The final attempt's response is returned rather than thrown, even for
      // a retryable status, so the caller keeps ownership of status-to-error
      // mapping (401 -> AuthError, 404 -> undefined, ...).
      if (attempt >= retries || !RETRYABLE_STATUS.has(response.status)) {
        return buffered(response, label);
      }
      lastError = new NetworkError(`${label} failed: HTTP ${response.status}`);
      // An interrupt that landed with the response in hand must not be turned
      // into another attempt: the user asked to stop, and the retry would
      // open a fresh socket only to be cancelled the instant it starts.
      // Reported as a cancellation (not the HTTP status) so batch callers
      // like add.ts stop the run instead of counting the interrupted attempt
      // as a server failure, and the CLI prints "cancelled" rather than a
      // status that blames the network for the user's own Ctrl-C.
      if (isCancelled(signal)) {
        throw new AbortedError(`${label} was cancelled`);
      }
      const delay = retryAfterMs(response.headers) ?? backoffMs(attempt);
      debug(
        `HTTP ${response.status} ${url} is retryable; backing off ${delay}ms`
      );
      if (await waitBeforeRetry(delay, deadlineAt, signal)) {
        continue;
      }
      throw lastError;
    }

    // A deadline that already elapsed will elapse again: replaying the attempt
    // multiplies the wait (3 x 15s) without changing the outcome. A cancelled
    // request is one the user explicitly asked us to stop. Both are terminal.
    if (result.kind !== 'transport') {
      debug(`${result.kind} ${url}: ${result.error.message}`);
      throw result.error;
    }

    lastError = result.error;
    // The retry budget is exhausted, OR the run was cancelled: either way
    // there is no point starting another attempt. Checking cancellation here
    // (rather than only at the loop top) is what makes a Ctrl-C during a
    // transport failure stop after one attempt instead of N.
    if (attempt >= retries || isCancelled(signal)) {
      debug(`transport failure ${url}: ${result.error.message}`);
      throw lastError;
    }
    // Computed once and reused: backoffMs rolls Math.random(), so the value
    // the debug line reports must be the value actually waited on.
    const delay = backoffMs(attempt);
    debug(
      `transport failure ${url}: ${result.error.message}; backing off ${delay}ms`
    );
    if (!(await waitBeforeRetry(delay, deadlineAt, signal))) {
      throw lastError;
    }
  }
}
