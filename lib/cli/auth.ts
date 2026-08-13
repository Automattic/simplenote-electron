import { ACCOUNT_BASE, AUTH_BASE, APP_ID, getAppKey } from './config.ts';
import { httpRequest } from './infra/http.ts';
import { AuthError, RateLimitError, UsageError } from './domain/errors.ts';
import type { Credentials } from './domain/types.ts';

export const RATE_LIMIT_MESSAGE =
  'Too many login requests in a short time. Wait a few minutes and try again.';

function toErrorMessage(status: number, body: string): string {
  if (status === 429) {
    return `${RATE_LIMIT_MESSAGE} (HTTP 429)`;
  }
  return `HTTP ${status}: ${body}`;
}

/**
 * Classifies a non-OK auth response: a 429 is a throttle, not a bad
 * credential — it keeps the network exit code (3) and its own class so CI
 * that treats exit 2 as "wrong password" does not misreport a rate limit.
 * Everything else stays AuthError (exit 2).
 */
function throwAuthError(status: number, message: string): never {
  if (status === 429) {
    throw new RateLimitError(message);
  }
  throw new AuthError(message);
}

// Login is never retried: `authorize` counts against a rate limit and
// `complete-login` burns a single-use code, so a replay would turn a slow
// network into a locked-out account.
const NO_RETRY = { retries: 0 } as const;

export async function login(
  username: string,
  password: string
): Promise<Credentials> {
  // Normalized the same way requestLoginEmail/completeLogin normalize, so the
  // authorize request body and the stored username are byte-identical no
  // matter which flow produced the login (password vs magic-link) and whoami
  // prints the same address either way.
  const normalizedUsername = username.trim().toLowerCase();
  const res = await httpRequest(
    `${AUTH_BASE}/${APP_ID}/authorize/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simperium-API-Key': getAppKey(),
      },
      body: JSON.stringify({ username: normalizedUsername, password }),
    },
    { ...NO_RETRY, label: 'Auth request' }
  );

  if (!res.ok) {
    // A 401 here means the app credentials (app_key) or the password were
    // rejected. Both look identical from the outside, so point the user at
    // the flow that sidesteps password auth entirely rather than leaving them
    // to guess which input was wrong.
    const guidance =
      res.status === 401
        ? ' If password login keeps failing, use magic-link login instead (unset SIMPLENOTE_PASSWORD).'
        : '';
    throwAuthError(
      res.status,
      `Auth failed: ${toErrorMessage(res.status, await res.text())}${guidance}`
    );
  }

  const body = (await res.json()) as Partial<Credentials>;
  if (!body.access_token || !body.username) {
    throw new AuthError('Auth response malformed');
  }

  return { access_token: body.access_token, username: normalizedUsername };
}

export async function requestLoginEmail(username: string): Promise<void> {
  const res = await httpRequest(
    `${ACCOUNT_BASE}/request-login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        request_source: 'electron',
      }),
    },
    { ...NO_RETRY, label: 'Request login' }
  );

  if (!res.ok) {
    throwAuthError(
      res.status,
      `Request login failed: ${toErrorMessage(res.status, await res.text())}`
    );
  }
}

export async function completeLogin(
  username: string,
  code: string
): Promise<Credentials> {
  // An empty code must never reach the server: it burns a single-use code and
  // comes back as an unhelpful 400. With piped stdin the prompt can hand us
  // an empty line instead of a real code, so this is the guard of last resort.
  // Codes are copied out of an email, so they routinely arrive with stray
  // spaces or newlines (e.g. "12 345"). Strip all whitespace before sending,
  // otherwise the server rejects a well-intended code with a 400 the user
  // cannot distinguish from a genuinely wrong one.
  const normalized = code.replace(/\s+/g, '');
  if (normalized.length === 0) {
    throw new UsageError(
      'Login code is empty. Re-run login and enter the 6-character code sent to your email.'
    );
  }
  const res = await httpRequest(
    `${ACCOUNT_BASE}/complete-login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        auth_code: normalized.toUpperCase(),
      }),
    },
    { ...NO_RETRY, label: 'Complete login' }
  );

  if (!res.ok) {
    // A failed code is single-use, so guide the user to request a fresh one.
    // 429 is a throttle (rate limit), not a wrong code — telling the user to
    // re-run immediately would only deepen the lockout, so skip the guidance.
    const guidance =
      res.status === 429
        ? ''
        : ' Re-run `npm run cli -- login` to send a new code.';
    throwAuthError(
      res.status,
      `Complete login failed: ${toErrorMessage(res.status, await res.text())}${guidance}`
    );
  }

  const body = (await res.json()) as { sync_token?: string };
  if (!body.sync_token) {
    throw new AuthError('Complete login response malformed');
  }

  // Normalize the same way `requestLoginEmail` does, so the stored username is
  // exactly the address the server sent the code to.
  return {
    access_token: body.sync_token,
    username: username.trim().toLowerCase(),
  };
}
