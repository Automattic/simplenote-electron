import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// `store.ts` derives STORE_DIR at module load, so the fake home has to be
// resolved inside the factory — a module-scope const would still be in its
// temporal dead zone when the hoisted import of `../store.ts` runs.
// The directory lives under the OS temp folder (not the repo) and is keyed by
// pid so concurrent jest workers cannot clobber each other.
jest.mock('os', () => {
  const actual = jest.requireActual('os') as typeof import('os');
  const nodePath = jest.requireActual('path') as typeof import('path');
  const home = nodePath.join(
    actual.tmpdir(),
    `simplenote-cli-home-${process.pid}`
  );
  return { ...actual, homedir: () => home };
});

import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
  STORE_DIR,
  CRED_FILE,
} from '../store.ts';
import { EXIT_NETWORK } from '../domain/errors.ts';

const TEST_HOME = os.homedir();

const ORIGINAL_PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

describe('store', () => {
  beforeAll(() => {
    // The permission check is a no-op on the real (Windows) host, so pin the
    // suite to a POSIX platform and let individual cases opt into win32.
    setPlatform('linux');
  });

  afterAll(async () => {
    if (ORIGINAL_PLATFORM) {
      Object.defineProperty(process, 'platform', ORIGINAL_PLATFORM);
    }
    // Teardown must never fail the suite: sandboxes that wrap `fs.rm`
    // (recycle-bin shims, locked files) would otherwise turn passing tests red.
    try {
      await fs.rm(TEST_HOME, { recursive: true, force: true });
    } catch {
      // Best effort — the OS reclaims its temp directory anyway.
    }
  });

  it('saves credentials under the expected store directory', async () => {
    await saveCredentials({
      access_token: 'tok',
      username: 'user@example.com',
    });

    expect(STORE_DIR).toBe(path.join(TEST_HOME, '.simplenote-cli'));
    expect(CRED_FILE).toBe(
      path.join(TEST_HOME, '.simplenote-cli', 'credentials.json')
    );

    const raw = await fs.readFile(CRED_FILE, 'utf8');
    expect(JSON.parse(raw)).toEqual({
      access_token: 'tok',
      username: 'user@example.com',
    });
  });

  it('round-trips credentials through save and load', async () => {
    await saveCredentials({ access_token: 'tok-2', username: 'a@b.com' });
    const loaded = await loadCredentials();
    expect(loaded).toEqual({ access_token: 'tok-2', username: 'a@b.com' });
  });

  it('returns null when no credentials exist', async () => {
    await clearCredentials();
    expect(await loadCredentials()).toBeNull();
  });

  it('returns null when the stored file is malformed', async () => {
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.writeFile(CRED_FILE, 'not-json{', 'utf8');
    expect(await loadCredentials()).toBeNull();
  });

  it('clears credentials idempotently', async () => {
    await saveCredentials({ access_token: 'tok', username: 'u@x.com' });
    await clearCredentials();
    await clearCredentials();
    expect(await loadCredentials()).toBeNull();
  });

  // A file that exists but is not two strings is corrupt, not "logged out".
  // The old truthiness check let a number through into an auth header, where
  // it came back as an opaque 401 instead of the warning below.
  it.each([
    ['a non-string token', { access_token: 12345, username: 'u@x.com' }],
    ['a missing username', { access_token: 'tok' }],
    ['an empty token', { access_token: '', username: 'u@x.com' }],
    ['a top-level null', null],
    ['a top-level array', [{ access_token: 'tok', username: 'u@x.com' }]],
  ])('warns and reports logged-out for %s', async (_, stored) => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.writeFile(CRED_FILE, JSON.stringify(stored), 'utf8');

    expect(await loadCredentials()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('corrupt'));
    errorSpy.mockRestore();
  });

  async function tempFiles(): Promise<string[]> {
    const names = await fs.readdir(STORE_DIR);
    return names.filter((name) => name.endsWith('.tmp'));
  }

  it('leaves no temp file behind on a successful save', async () => {
    await saveCredentials({ access_token: 'tok', username: 'u@x.com' });
    expect(await tempFiles()).toEqual([]);
  });

  // Only the rename used to be cleaned up, so a failed *write* leaked one
  // 0600 file holding a live token on every attempt.
  it('leaves no temp file behind when the write cannot be published', async () => {
    await clearCredentials();
    // A directory where the credentials file belongs makes rename fail on
    // every platform without needing permission tricks.
    await fs.mkdir(CRED_FILE, { recursive: true });
    try {
      await expect(
        saveCredentials({ access_token: 'tok', username: 'u@x.com' })
      ).rejects.toMatchObject({
        code: EXIT_NETWORK,
        message: expect.stringContaining('Could not persist credentials'),
      });
      expect(await tempFiles()).toEqual([]);
    } finally {
      await fs.rm(CRED_FILE, { recursive: true, force: true });
    }
  });

  // Logout has to mean "no token is left on disk", including one leaked by an
  // older build that used a fixed temp filename.
  it('sweeps a stray temp file on logout', async () => {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const stale = `${CRED_FILE}.tmp`;
    await fs.writeFile(stale, '{"access_token":"leaked"}', 'utf8');

    await clearCredentials();

    await expect(fs.access(stale)).rejects.toBeTruthy();
  });

  // 异常故障：store 目录不可读时 logout 的临时文件清扫是 best-effort——
  // 清理失败必须静默放弃（否则 logout 本身会被 EACCES 变成错误），凭据清理照常。
  it('tolerates an unreadable store directory on logout', async () => {
    const readdir = jest
      .spyOn(fs, 'readdir')
      .mockRejectedValue(new Error('EACCES: permission denied'));

    try {
      await clearCredentials();
    } finally {
      readdir.mockRestore();
    }
  });

  describe('warnIfCredentialFileIsGroupReadable (POSIX)', () => {
    beforeEach(() => {
      setPlatform('linux');
    });

    // Real chmod is a no-op on the Windows test host, so stat is mocked to
    // return an explicit mode instead of relying on the filesystem.
    async function loadWithMode(
      mode: number
    ): Promise<ReturnType<typeof jest.spyOn>> {
      await saveCredentials({ access_token: 'tok', username: 'u@x.com' });
      return jest.spyOn(fs, 'stat').mockResolvedValue({
        mode,
      } as Awaited<ReturnType<typeof fs.stat>>);
    }

    it('stays silent when the credentials file mode is 0600', async () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const statSpy = await loadWithMode(0o100600);
      try {
        expect(await loadCredentials()).toEqual({
          access_token: 'tok',
          username: 'u@x.com',
        });
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        statSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('warns with the chmod 600 fix when the mode is 0644', async () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const statSpy = await loadWithMode(0o100644);
      try {
        await loadCredentials();
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Warning: credentials file')
        );
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('mode 0644')
        );
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('chmod 600')
        );
      } finally {
        statSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('skips the check on Windows', async () => {
      await saveCredentials({ access_token: 'tok', username: 'u@x.com' });
      setPlatform('win32');
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const statSpy = jest.spyOn(fs, 'stat');
      try {
        expect(await loadCredentials()).toEqual({
          access_token: 'tok',
          username: 'u@x.com',
        });
        expect(statSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        setPlatform('linux');
        statSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('stays silent when stat fails', async () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const statSpy = jest
        .spyOn(fs, 'stat')
        .mockRejectedValue(new Error('EACCES'));
      try {
        expect(await loadCredentials()).toEqual({
          access_token: 'tok',
          username: 'u@x.com',
        });
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        statSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });
  });
});
