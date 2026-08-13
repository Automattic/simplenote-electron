import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import * as path from 'path';
import * as os from 'os';
import { CliError, EXIT_NETWORK, messageOf } from './domain/errors.ts';
import type { Credentials } from './domain/types.ts';

export const STORE_DIR = path.join(os.homedir(), '.simplenote-cli');
export const CRED_FILE = path.join(STORE_DIR, 'credentials.json');

/** Matches every temp file this module can create, for logout's sweep. */
const TMP_PREFIX = `${path.basename(CRED_FILE)}.`;
const TMP_SUFFIX = '.tmp';

/**
 * A temp path no concurrent run can collide with.
 *
 * The name used to be a fixed `credentials.json.tmp`. Two logins racing — a
 * second terminal, a retry after a hung run, a script looping — then wrote
 * the *same* file and renamed it in turn: one process could publish a file
 * the other was still writing (a truncated token, so the next command sees a
 * corrupt store), or fail with ENOENT because the other had already renamed
 * it away. pid plus randomness makes every attempt private.
 */
function tempPath(): string {
  const unique = `${process.pid}.${randomBytes(6).toString('hex')}`;
  return `${CRED_FILE}.${unique}${TMP_SUFFIX}`;
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
  // Write to a private temp file and rename it into place. rename(2) is
  // atomic within a filesystem, so a crash mid-write can never leave a
  // half-written credentials file *in place* — the next run either sees the
  // old token or the new one, never a truncated one.
  const tmp = tempPath();
  try {
    await fs.writeFile(tmp, JSON.stringify(credentials, null, 2), {
      mode: 0o600,
    });
    // `mode` on writeFile is masked by the process umask, which a CLI cannot
    // assume anything about, so chmod unconditionally: the file holds a live
    // token and must not be readable by other users on the machine. (On
    // Windows this is effectively a no-op, which is fine.)
    await fs.chmod(tmp, 0o600);
    await fs.rename(tmp, CRED_FILE);
  } catch (error) {
    // Any failure — a full disk during the write, a cross-device rename, a
    // read-only home — must not leave the token behind in a stray temp file.
    // Only the rename used to be cleaned up, so a failed *write* leaked one
    // file containing a live token per attempt.
    await fs.unlink(tmp).catch(() => {});
    // Re-thrown as a typed error with a precise message: the login itself
    // succeeded, the token just never reached disk. Before this wrap the raw
    // fs error surfaced as "Login failed: EACCES …", which read like a network
    // failure and sent the user down the wrong path (the code was already
    // consumed server-side, so a retry needs a fresh one).
    throw new CliError(
      EXIT_NETWORK,
      `Could not persist credentials at ${CRED_FILE}: ${messageOf(error)}. The login itself succeeded — re-run login once the store is writable.`
    );
  }
}

export async function loadCredentials(): Promise<Credentials | null> {
  let raw: string;
  try {
    raw = await fs.readFile(CRED_FILE, 'utf8');
  } catch {
    // Missing or unreadable file is simply "not logged in".
    return null;
  }

  await warnIfCredentialFileIsGroupReadable();

  try {
    const parsed = JSON.parse(raw) as unknown;
    return readCredentials(parsed) ?? reportCorrupt();
  } catch {
    return reportCorrupt();
  }
}

/**
 * Accepts only a record with two non-empty *string* fields.
 *
 * The old truthiness check (`parsed.access_token && parsed.username`) also
 * accepted a number, an array or an object, which then travelled all the way
 * into an `X-Simperium-Token` header and came back as an opaque 401 instead
 * of the actionable "your credentials file is corrupt" this function exists
 * to print. It also threw outright on a top-level `null`, relying on the
 * caller's catch to translate a TypeError into the warning.
 */
function readCredentials(parsed: unknown): Credentials | null {
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { access_token: token, username } = parsed as Record<string, unknown>;
  if (typeof token !== 'string' || token === '') {
    return null;
  }
  if (typeof username !== 'string' || username === '') {
    return null;
  }
  return { access_token: token, username };
}

/**
 * A file that exists but cannot be understood is *not* the same as being
 * logged out: silently returning null used to make users re-login over and
 * over with no hint that their credential file was corrupt (and that the fix
 * is to delete it). Warn, then behave as "not logged in".
 */
function reportCorrupt(): null {
  console.error(
    `Warning: credentials file ${CRED_FILE} is corrupt; ignoring it. ` +
      'Run `npm run cli -- logout` to remove it, then log in again.'
  );
  return null;
}

/**
 * POSIX-only self-check: if the credentials file carries group/other read
 * bits, any other user on the machine can read the live token. Warn with the
 * fix. On Windows chmod(2) is a no-op and the file's ACLs govern access, so
 * there is nothing meaningful to check.
 */
async function warnIfCredentialFileIsGroupReadable(): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  try {
    const stat = await fs.stat(CRED_FILE);
    if ((stat.mode & 0o077) !== 0) {
      console.error(
        `Warning: credentials file ${CRED_FILE} is readable by other users ` +
          `(mode 0${(stat.mode & 0o777).toString(8)}). Run: chmod 600 ${CRED_FILE}`
      );
    }
  } catch {
    // The file can vanish between the read above and this stat, or stat can
    // be unsupported: nothing to warn about, stay silent.
  }
}

export async function clearCredentials(): Promise<void> {
  try {
    await fs.unlink(CRED_FILE);
  } catch {
    // ignore missing file
  }
  await sweepTempFiles();
}

/**
 * Removes temp files a previous run may have left behind.
 *
 * "Logout" has to mean *no token is left on disk*. Before the write path was
 * made crash-safe, a failed save leaked `credentials.json.tmp` with a live
 * token in it, and that file survived every logout. Best-effort on purpose:
 * an unreadable store directory must not turn logout into an error.
 */
async function sweepTempFiles(): Promise<void> {
  let names: string[];
  try {
    names = await fs.readdir(STORE_DIR);
  } catch {
    return;
  }
  await Promise.all(
    names
      .filter(
        (name) => name.startsWith(TMP_PREFIX) && name.endsWith(TMP_SUFFIX)
      )
      .map((name) => fs.unlink(path.join(STORE_DIR, name)).catch(() => {}))
  );
}
