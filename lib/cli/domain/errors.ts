// Typed CLI errors. Each carries the process exit code it should map to,
// so every command shares one error -> exit-code rule instead of ad-hoc
// string matching in bootstrap.ts.
//
// Mapping:
//   0 ok | 1 usage | 2 auth | 3 network | 4 not found
//   5 conflict | 6 aborted | 7 partial (batch partial failure) | 99 unknown

export const EXIT_OK = 0;
export const EXIT_ARG = 1;
export const EXIT_AUTH = 2;
export const EXIT_NETWORK = 3;
export const EXIT_NOT_FOUND = 4;
export const EXIT_CONFLICT = 5;
export const EXIT_ABORTED = 6;
export const EXIT_PARTIAL = 7;
export const EXIT_UNKNOWN = 99;

export class CliError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    // `new.target` is the concrete subclass being constructed, so an
    // AbortedError reports itself as "AbortedError" in logs, stack traces and
    // `util.inspect` output. Hard-coding 'CliError' made every typed error
    // indistinguishable once it left the throw site: a crash report showed
    // `CliError: Request aborted` with no hint of which class (and therefore
    // which exit code) was involved.
    this.name = new.target.name;
    this.code = code;
  }
}

export class UsageError extends CliError {
  constructor(message: string) {
    super(EXIT_ARG, message);
  }
}

export class AuthError extends CliError {
  constructor(message: string) {
    super(EXIT_AUTH, message);
  }
}

export class NetworkError extends CliError {
  constructor(message: string) {
    super(EXIT_NETWORK, message);
  }
}

/**
 * HTTP 429: the server asked us to slow down. Keeps the network exit code (3)
 * but is its own class so batch callers can tell "rate limited" from "the
 * backend is down" — grinding through doomed retries against a limiter is
 * what the consecutive-failure stop exists to prevent.
 */
export class RateLimitError extends NetworkError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends CliError {
  constructor(message: string) {
    super(EXIT_NOT_FOUND, message);
  }
}

export class ConflictError extends CliError {
  constructor(message: string) {
    super(EXIT_CONFLICT, message);
  }
}

export class AbortedError extends CliError {
  constructor(message: string) {
    super(EXIT_ABORTED, message);
  }
}

export class PartialError extends CliError {
  constructor(message: string) {
    super(EXIT_PARTIAL, message);
  }
}

/**
 * Renders any thrown value as a human-readable string. Values that are not
 * `Error` instances (string throws, plain objects, null) are stringified so a
 * `throw 'oops'` never surfaces as `[object Object]`.
 *
 * Centralized here so the dispatch layer (app.ts) and the transport layer
 * (infra/http.ts) share one definition instead of each carrying a private
 * copy that could drift apart.
 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// A non-CliError is treated as a network/operational failure, preserving the
// prior behavior where every unclassified error mapped to exit 3.
export function exitCodeFor(error: unknown): number {
  if (error instanceof CliError) return error.code;
  return EXIT_NETWORK;
}
