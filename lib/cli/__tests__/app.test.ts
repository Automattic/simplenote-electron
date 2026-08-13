jest.mock('../store.ts', () => ({
  loadCredentials: jest.fn(),
  clearCredentials: jest.fn(),
  saveCredentials: jest.fn(),
}));

jest.mock('../commands/list.ts', () => ({
  listCommand: jest.fn(),
  parseListOptions: jest.fn(),
}));

// doLogin's password path delegates to auth.ts; the magic-link path opens a
// readline prompt, which we stub so the test never blocks on stdin.
jest.mock('../auth.ts', () => ({
  login: jest.fn(),
  requestLoginEmail: jest.fn(),
  completeLogin: jest.fn(),
}));

jest.mock('readline/promises', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn().mockResolvedValue('ABC123'),
    close: jest.fn(),
  })),
}));

import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../store.ts';
import { listCommand } from '../commands/list.ts';
import { setVerbose } from '../logging.ts';
import {
  doLogin,
  flushStdio,
  HELP,
  ignoreBrokenPipe,
  installSignalHandlers,
  labelled,
  main,
  run,
  validateFlags,
} from '../app.ts';
import {
  login as mockLogin,
  requestLoginEmail as mockRequest,
  completeLogin as mockComplete,
} from '../auth.ts';
import {
  AuthError,
  AbortedError,
  CliError,
  EXIT_ABORTED,
  EXIT_NETWORK,
  NetworkError,
  NotFoundError,
  UsageError,
} from '../domain/errors.ts';
import type { Credentials } from '../domain/types.ts';

// jsdom's setTimeout returns a number (no unref()), but flushStdio relies on
// `setTimeout(...).unref()` to drop the guard timer from the event loop.
// Replace it with a shim that actually schedules the callback via the real
// timer yet returns a Timer-like object carrying unref(). Scoped to this test
// file's VM context, so it never touches the real global.
const realSetTimeout = global.setTimeout.bind(global);
global.setTimeout = ((
  fn: (...args: unknown[]) => void,
  ms?: number,
  ...args: unknown[]
) => {
  realSetTimeout(fn as TimerHandler, ms as number, ...(args as []));
  return {
    unref: () => {},
    ref: () => {},
    hasRef: () => false,
  } as unknown as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

async function capture(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work();
    return undefined;
  } catch (error) {
    return error;
  }
}

describe('validateFlags', () => {
  it('accepts the flags a command declares', () => {
    expect(() =>
      validateFlags('list', ['limit', 'json'], ['--limit=5', '--json'])
    ).not.toThrow();
  });

  // Ignoring `--limt=5` gave the user the default 20 notes and no hint that
  // the run had not done what they asked.
  it('rejects a typo and names the accepted flags', () => {
    const error = (() => {
      try {
        validateFlags('list', ['limit', 'json'], ['--limt=5']);
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).code).toBe(1);
    expect((error as UsageError).message).toContain('--limt=5');
    expect((error as UsageError).message).toContain('--limit');
  });

  it('ignores positionals and anything after "--"', () => {
    expect(() =>
      validateFlags('create', ['json'], ['hello', '--', '--not-a-flag'])
    ).not.toThrow();
  });

  it('【场景】多个未知旗标 【目的】验证复数文案与完整罗列 【校验点】message 【预期】Unknown flags 且逐项列出', () => {
    const error = (() => {
      try {
        validateFlags('list', ['limit'], ['--json', '--nope=1']);
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).code).toBe(1);
    expect((error as UsageError).message).toContain('Unknown flags for list');
    expect((error as UsageError).message).toContain('--json, --nope=1');
  });

  it('【场景】命令不接受任何旗标 【目的】验证提示语兜底 【校验点】message 【预期】显示 (none)', () => {
    const error = (() => {
      try {
        validateFlags('login', [], ['--json']);
      } catch (thrown) {
        return thrown;
      }
    })();

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).message).toContain('(none)');
  });
});

describe('labelled', () => {
  it('prefixes the message but keeps the exit code', () => {
    const error = labelled(
      new NotFoundError('Note not found: n1'),
      'Show failed'
    );

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe(4);
    expect(error.message).toBe('Show failed: Note not found: n1');
  });

  it('maps an unclassified failure to the operational code', () => {
    expect(
      labelled(new TypeError('x is not a function'), 'List failed').code
    ).toBe(3);
  });

  it('【场景】原始错误携带 stack 【目的】验证重新标记不丢失调用栈 【校验点】stack 【预期】原栈保留', () => {
    const original = new NotFoundError('Note not found: n1');
    original.stack = 'preserved stack line';

    const relabelled = labelled(original, 'Show failed');

    expect(relabelled.message).toBe('Show failed: Note not found: n1');
    expect(relabelled.code).toBe(4);
    expect(relabelled.stack).toBe('preserved stack line');
  });

  it('【场景】非 Error 值被标记 【目的】验证字符串化兜底 【校验点】message/code 【预期】String 内容 + 网络码 3', () => {
    const relabelled = labelled('oops', 'List failed');
    expect(relabelled.message).toBe('List failed: oops');
    expect(relabelled.code).toBe(3);
  });
});

describe('run', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (loadCredentials as jest.Mock).mockResolvedValue(credentials);
    (listCommand as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (loadCredentials as jest.Mock).mockReset();
    (clearCredentials as jest.Mock).mockReset();
    (listCommand as jest.Mock).mockReset();
    setVerbose(false);
    delete process.env.SIMPLENOTE_CLI_DEBUG;
  });

  it('prints help to stderr, keeping stdout free for piped output', async () => {
    await run([]);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('prints the CLI version to stdout with --version', async () => {
    await run(['--version']);

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it('prints the CLI version to stdout with -v', async () => {
    await run(['-v']);

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it('prints a command help and exits before touching credentials', async () => {
    await run(['list', '--help']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- list')
    );
    expect(loadCredentials).not.toHaveBeenCalled();
    expect(listCommand).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('accepts -h as a command help alias', async () => {
    await run(['show', '-h']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- show')
    );
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it('prints help for login and logout too', async () => {
    await run(['login', '--help']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- login')
    );
    expect(mockLogin).not.toHaveBeenCalled();

    errorSpy.mockClear();
    await run(['logout', '--help']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- logout')
    );
    expect(clearCredentials).not.toHaveBeenCalled();
  });

  it('still rejects an unknown command carrying --help', async () => {
    const error = await capture(() => run(['frobnicate', '--help']));

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).code).toBe(1);
  });

  it('treats --help after a "--" terminator as literal content', async () => {
    await run(['list', '--', '--help']);

    // 帮助拦截未触发：--help 作为字面位置参数原样传给命令处理器。
    expect(listCommand).toHaveBeenCalledWith(credentials, ['--', '--help']);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- list')
    );
  });

  // B1-3：`-h` 紧邻位置参数时是数据不是帮助请求（edit <id> "-h" 写文本；
  // search "foo" -h 不是帮助，但 search 会按"多余位置参数"拒绝并提示用引号）。
  // 旧实现把整个 rest 扫一遍，合法内容被吞。
  it('does not treat "-h" beside a positional as a help request', async () => {
    await run(['list', '123', '-h']);

    expect(listCommand).toHaveBeenCalledWith(credentials, ['123', '-h']);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- list')
    );
  });

  it('still prints help when -h accompanies only flags', async () => {
    await run(['show', '--json', '-h']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- show')
    );
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it('accepts --verbose on an authenticated command without flag errors', async () => {
    await run(['list', '--verbose', '--limit=1']);

    expect(listCommand).toHaveBeenCalledWith(credentials, [
      '--verbose',
      '--limit=1',
    ]);
  });

  it('accepts --verbose on login/logout without flag errors', async () => {
    (clearCredentials as jest.Mock).mockResolvedValue(undefined);
    await run(['logout', '--verbose']);

    expect(clearCredentials).toHaveBeenCalled();
  });

  it('rejects an unknown command as a usage error', async () => {
    const error = await capture(() => run(['frobnicate']));

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).code).toBe(1);
  });

  // Argv is validated before credentials are loaded, so a typo costs a
  // millisecond instead of a round trip plus a misleading result.
  it('rejects an unknown flag before touching credentials', async () => {
    const error = await capture(() => run(['list', '--limt=5']));

    expect(error).toBeInstanceOf(UsageError);
    expect(loadCredentials).not.toHaveBeenCalled();
  });

  it('passes the remaining argv straight to the command', async () => {
    await run(['list', '--limit=3', '--json']);

    expect(listCommand).toHaveBeenCalledWith(credentials, [
      '--limit=3',
      '--json',
    ]);
  });

  it('asks the user to log in when there are no stored credentials', async () => {
    (loadCredentials as jest.Mock).mockResolvedValue(undefined);

    const error = await capture(() => run(['list']));

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe(2);
    expect(listCommand).not.toHaveBeenCalled();
  });

  // Classification is by type. The previous string match on the message meant
  // rewording an error silently changed the process exit code.
  it('labels a command failure without losing its exit code', async () => {
    (listCommand as jest.Mock).mockRejectedValue(
      new NotFoundError('Note not found: n1')
    );

    const error = (await capture(() => run(['list']))) as CliError;

    expect(error.code).toBe(4);
    expect(error.message).toBe('List failed: Note not found: n1');
  });

  it('prints the username, and a JSON object with --json', async () => {
    await run(['whoami']);
    expect(logSpy).toHaveBeenCalledWith('user@example.com');

    logSpy.mockClear();
    await run(['whoami', '--json']);
    expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual({
      username: 'user@example.com',
    });
  });

  // `whoami extra` used to print the username and silently ignore `extra`.
  // The dispatcher re-labels command failures (Whoami failed: ...) but keeps
  // the exit code, which is what callers branch on.
  it('rejects a stray positional argument on whoami', async () => {
    const error = (await capture(() => run(['whoami', 'extra']))) as CliError;

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe(1);
    expect(error.message).toContain('Too many arguments for whoami');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('rejects a stray positional argument on login', async () => {
    const error = (await capture(() =>
      run(['login', 'user@example.com'])
    )) as CliError;

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe(1);
  });

  it('logs out without requiring stored credentials', async () => {
    (clearCredentials as jest.Mock).mockResolvedValue(undefined);

    await run(['logout']);

    expect(clearCredentials).toHaveBeenCalled();
    expect(loadCredentials).not.toHaveBeenCalled();
  });
});

describe('HELP documentation', () => {
  it('【场景】帮助文本完整性 【目的】验证命令与退出码文档齐全 【校验点】关键命令/环境变量/退出码表 【预期】均出现', () => {
    expect(HELP).toContain('login');
    expect(HELP).toContain('logout');
    expect(HELP).toContain('list [--limit=N]');
    expect(HELP).toContain('add --file=notes.json');
    expect(HELP).toContain('Exit codes:');
    expect(HELP).toContain('7 partial');
    expect(HELP).toContain('SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS');
  });

  it('【场景】新增能力文档 【目的】--version/命令帮助/verbose/通道契约/超时下限均入文档 【校验点】关键文案 【预期】逐项出现', () => {
    expect(HELP).toContain('-v, --version');
    expect(HELP).toContain('<command> --help');
    expect(HELP).toContain('--verbose');
    expect(HELP).toContain('SIMPLENOTE_CLI_DEBUG');
    expect(HELP).toContain(
      'goes to stdout; diagnostics and progress go to stderr'
    );
    expect(HELP).toContain(
      'the leftover budget of a paged fetch is floored at 1000ms'
    );
  });
});

describe('run login/logout edge paths', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.SIMPLENOTE_USER;
    delete process.env.SIMPLENOTE_PASSWORD;
    (loadCredentials as jest.Mock).mockReset();
    (mockLogin as jest.Mock).mockReset();
    (mockRequest as jest.Mock).mockReset();
    (mockComplete as jest.Mock).mockReset();
    (saveCredentials as jest.Mock).mockReset();
    (clearCredentials as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.SIMPLENOTE_USER;
    delete process.env.SIMPLENOTE_PASSWORD;
  });

  it('【场景】环境变量提供账号密码 【目的】验证 run 层转发给密码登录 【校验点】mockLogin 入参/凭证持久化/未读取旧凭证 【预期】login+save 且不 load', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    process.env.SIMPLENOTE_PASSWORD = 'pw';
    const creds: Credentials = {
      access_token: 'tok',
      username: 'u@example.com',
    };
    (mockLogin as jest.Mock).mockResolvedValue(creds);
    (saveCredentials as jest.Mock).mockResolvedValue(undefined);

    await run(['login']);

    expect(mockLogin).toHaveBeenCalledWith('u@example.com', 'pw');
    expect(saveCredentials).toHaveBeenCalledWith(creds);
    expect(loadCredentials).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Logged in as u@example.com');
  });

  it('【场景】未设置 SIMPLENOTE_USER 【目的】验证认证前置校验 【校验点】异常类型与退出码 【预期】AuthError code 2', async () => {
    const error = (await capture(() => run(['login']))) as CliError;

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe(2);
    expect(error.message).toContain('Login failed');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('【场景】登录成功但持久化失败 【目的】错误消息不再伪装成网络故障 【校验点】code/message 【预期】code 3 且消息明示 token 未落盘', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    process.env.SIMPLENOTE_PASSWORD = 'pw';
    const creds: Credentials = {
      access_token: 'tok',
      username: 'u@example.com',
    };
    (mockLogin as jest.Mock).mockResolvedValue(creds);
    (saveCredentials as jest.Mock).mockRejectedValue(
      new CliError(EXIT_NETWORK, 'Could not persist credentials at /x: EACCES')
    );

    const error = (await capture(() => run(['login']))) as CliError;

    expect(error.code).toBe(3);
    expect(error.message).toContain('Login failed');
    expect(error.message).toContain('Could not persist credentials');
  });

  it('【场景】登出时凭证清理失败 【目的】验证错误重标记但保留退出码 【校验点】message/code 【预期】Logout failed + 网络码 3', async () => {
    (clearCredentials as jest.Mock).mockRejectedValue(
      new NetworkError('disk error')
    );

    const error = (await capture(() => run(['logout']))) as CliError;

    expect(error).toBeInstanceOf(CliError);
    expect(error.code).toBe(3);
    expect(error.message).toBe('Logout failed: disk error');
  });
});

describe('ignoreBrokenPipe', () => {
  // `cli list --json | head -3` closes the pipe early. Exiting 0 there turned
  // "auth failed, and the reader hung up" into a success for `set -e` scripts.
  // 模块级 guard 单例使 ignoreBrokenPipe 只安装一次，两个分支必须共享同一次
  // 安装：EPIPE 吞掉并释放流，非 EPIPE 原样放行（不吞错、不破坏退出码）。
  it('swallows EPIPE but leaves non-EPIPE errors untouched', () => {
    const previousExitCode = process.exitCode;
    const before = process.stdout.listenerCount('error');
    const destroy = jest
      .spyOn(process.stdout, 'destroy')
      .mockImplementation(() => process.stdout);

    try {
      process.exitCode = 2;
      ignoreBrokenPipe();

      const handler = process.stdout.listeners('error').at(-1) as (
        error: NodeJS.ErrnoException
      ) => void;

      handler(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }));
      expect(process.exitCode).toBe(2);
      expect(destroy).toHaveBeenCalled();
      destroy.mockClear();

      handler(Object.assign(new Error('EACCES'), { code: 'EACCES' }));
      expect(process.exitCode).toBe(2);
      expect(destroy).not.toHaveBeenCalled();
    } finally {
      // Leave the shared process streams exactly as they were found.
      while (process.stdout.listenerCount('error') > before) {
        process.stdout.removeListener(
          'error',
          process.stdout.listeners('error').at(-1) as () => void
        );
      }
      if (process.stderr.listenerCount('error') > 0) {
        process.stderr.removeListener(
          'error',
          process.stderr.listeners('error').at(-1) as () => void
        );
      }
      destroy.mockRestore();
      process.exitCode = previousExitCode;
    }
  });
});

describe('doLogin', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // The magic-link branch opens a readline prompt, which needs a terminal.
    (process.stdin as { isTTY?: boolean }).isTTY = true;
  });

  afterEach(() => {
    delete process.env.SIMPLENOTE_USER;
    delete process.env.SIMPLENOTE_PASSWORD;
    delete (process.stdin as { isTTY?: boolean }).isTTY;
    jest.restoreAllMocks();
    (saveCredentials as jest.Mock).mockReset();
    (mockLogin as jest.Mock).mockReset();
    (mockRequest as jest.Mock).mockReset();
    (mockComplete as jest.Mock).mockReset();
  });

  // Without SIMPLENOTE_USER there is nothing to log in as; this is a usage
  // problem, not an auth failure against the server.
  it('requires SIMPLENOTE_USER', async () => {
    const error = await capture(() => doLogin());
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe(2);
  });

  it('logs in with a password and persists the token', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    process.env.SIMPLENOTE_PASSWORD = 'pw';
    const creds: Credentials = {
      access_token: 'tok',
      username: 'u@example.com',
    };
    (mockLogin as jest.Mock).mockResolvedValue(creds);

    await doLogin();

    expect(mockLogin).toHaveBeenCalledWith('u@example.com', 'pw');
    expect(saveCredentials).toHaveBeenCalledWith(creds);
    expect(errorSpy).toHaveBeenCalledWith('Logged in as u@example.com');
  });

  // The magic-link branch must not call password `login`; it requests a code
  // email, prompts for the 6-char code, and completes login with it.
  it('uses the magic-link flow when no password is set', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    (mockRequest as jest.Mock).mockResolvedValue(undefined);
    const creds: Credentials = {
      access_token: 'tok',
      username: 'u@example.com',
    };
    (mockComplete as jest.Mock).mockResolvedValue(creds);

    await doLogin();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledWith('u@example.com', 'ABC123');
    expect(saveCredentials).toHaveBeenCalledWith(creds);
  });

  // E4：纯空白的密码不是密码——带着空白值去请求 /authorize 只会得到一个
  // 用户无法与"密码错误"区分的 401。空白必须与未设置一样走魔法链接；而
  // 判断只做 trim，发送仍传原值（合法密码可含首尾空格）。
  it('uses the magic-link flow when SIMPLENOTE_PASSWORD is blank', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    process.env.SIMPLENOTE_PASSWORD = '   ';
    (mockRequest as jest.Mock).mockResolvedValue(undefined);
    const creds: Credentials = {
      access_token: 'tok',
      username: 'u@example.com',
    };
    (mockComplete as jest.Mock).mockResolvedValue(creds);

    await doLogin();

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledWith('u@example.com', 'ABC123');
    expect(saveCredentials).toHaveBeenCalledWith(creds);
  });

  // With piped stdin readline's prompt either yields an empty line (burning a
  // single-use code against the server) or never settles (hanging the CLI).
  // A non-interactive stdin must fail fast before the code email is sent.
  it('fails fast when stdin is not interactive', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    (process.stdin as { isTTY?: boolean }).isTTY = false;

    const error = await capture(() => doLogin());

    expect(error).toBeInstanceOf(UsageError);
    expect((error as UsageError).code).toBe(1);
    expect((error as UsageError).message).toContain('interactive terminal');
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockComplete).not.toHaveBeenCalled();
  });

  // 异常故障：验证码提示阶段 readline 因中断以 AbortError 拒绝（Ctrl-C 落在
  // question 等待期）——必须归类为「登录取消」（exit 6）而不是崩溃或误报超时。
  it('reports a readline abort as a cancellation instead of a crash', async () => {
    process.env.SIMPLENOTE_USER = 'u@example.com';
    (mockRequest as jest.Mock).mockResolvedValue(undefined);
    const readlineMock = jest.requireMock('readline/promises') as {
      createInterface: jest.Mock;
    };
    readlineMock.createInterface.mockReturnValue({
      question: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('aborted'), { name: 'AbortError' })
        ),
      close: jest.fn(),
    });

    try {
      const error = await capture(() => doLogin());

      expect(error).toBeInstanceOf(AbortedError);
      expect((error as Error).message).toContain('Login cancelled');
      expect(mockComplete).not.toHaveBeenCalled();
    } finally {
      readlineMock.createInterface.mockReturnValue({
        question: jest.fn().mockResolvedValue('ABC123'),
        close: jest.fn(),
      });
    }
  });

  // A blank-but-set variable must fail exactly like a missing one: the auth
  // layer normalizes downstream, so a whitespace-only value would otherwise
  // reach the server as an empty username (or waste a code email).
  it('fails fast on a blank SIMPLENOTE_USER', async () => {
    process.env.SIMPLENOTE_USER = '   ';
    delete process.env.SIMPLENOTE_PASSWORD;
    (process.stdin as { isTTY?: boolean }).isTTY = true;

    const error = await capture(() => doLogin());

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe(2);
    expect((error as AuthError).message).toContain('non-blank');
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockComplete).not.toHaveBeenCalled();
  });
});

describe('installSignalHandlers', () => {
  let onSpy: jest.SpyInstance;
  let offSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    onSpy = jest.spyOn(process, 'on');
    offSpy = jest.spyOn(process, 'off');
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    onSpy.mockRestore();
    offSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function grabHandler(
    name: 'SIGINT' | 'SIGTERM'
  ): (...args: unknown[]) => void {
    const handler = onSpy.mock.calls.find((call) => call[0] === name)?.[1];
    expect(handler).toBeInstanceOf(Function);
    return handler as (...args: unknown[]) => void;
  }

  it('returns an active lifecycle and aborts on SIGINT', () => {
    const lifecycle = installSignalHandlers();
    const handler = grabHandler('SIGINT');

    expect(lifecycle.aborted()).toBe(false);
    expect(lifecycle.signal.aborted).toBe(false);

    handler();

    expect(lifecycle.aborted()).toBe(true);
    expect(lifecycle.signal.aborted).toBe(true);
    lifecycle.dispose();
  });

  it('registers the same handler for SIGINT and SIGTERM', () => {
    const lifecycle = installSignalHandlers();
    expect(grabHandler('SIGINT')).toBe(grabHandler('SIGTERM'));
    lifecycle.dispose();
  });

  // A single Ctrl-C asks for a graceful stop; a second means "I mean it" and
  // must end the process at once rather than waiting out the in-flight work.
  it('exits immediately on a second interrupt', () => {
    const lifecycle = installSignalHandlers();
    const handler = grabHandler('SIGINT');

    handler();
    handler();

    expect(exitSpy).toHaveBeenCalledWith(EXIT_ABORTED);
    lifecycle.dispose();
  });

  it('dispose removes both signal listeners and resets the external signal', () => {
    const lifecycle = installSignalHandlers();
    const handler = grabHandler('SIGINT');

    lifecycle.dispose();

    expect(offSpy).toHaveBeenCalledWith('SIGINT', handler);
    expect(offSpy).toHaveBeenCalledWith('SIGTERM', handler);
  });
});

describe('main', () => {
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (loadCredentials as jest.Mock).mockResolvedValue(credentials);
    (listCommand as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (loadCredentials as jest.Mock).mockReset();
    (listCommand as jest.Mock).mockReset();
    process.exitCode = undefined;
    setVerbose(false);
    delete process.env.SIMPLENOTE_CLI_DEBUG;
  });

  it('returns 0 after printing help', async () => {
    const code = await main(['help']);
    expect(code).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('returns 0 and prints the version for --version', async () => {
    const code = await main(['--version']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
  });

  it('returns 0 for a command help without loading credentials', async () => {
    const code = await main(['list', '--help']);
    expect(code).toBe(0);
    expect(loadCredentials).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: npm run cli -- list')
    );
  });

  it('exposes the error stack only under --verbose', async () => {
    (listCommand as jest.Mock).mockRejectedValue(new Error('boom'));

    const code = await main(['list', '--verbose']);
    expect(code).toBe(3);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('List failed: boom')
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error: boom')
    );

    // 非 verbose 时不输出 stack，避免噪音。
    errorSpy.mockClear();
    (listCommand as jest.Mock).mockRejectedValue(new Error('boom2'));
    await main(['list']);
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Error: boom2')
    );
  });

  // R6: the signal handlers now outlive the run and are disposed only after
  // stdio drains, so a run must never leak listeners on the shared process.
  it('disposes the signal handlers by the time the run returns', async () => {
    const sigintBefore = process.listenerCount('SIGINT');
    const sigtermBefore = process.listenerCount('SIGTERM');

    await main(['help']);

    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore);
  });

  it('returns 1 for an unknown command', async () => {
    const code = await main(['frobnicate']);
    expect(code).toBe(1);
  });

  it('returns 1 for a usage error (unknown flag)', async () => {
    const code = await main(['list', '--limt=5']);
    expect(code).toBe(1);
  });

  it('returns 2 when no credentials are stored', async () => {
    (loadCredentials as jest.Mock).mockResolvedValue(undefined);
    const code = await main(['list']);
    expect(code).toBe(2);
  });

  it('returns 0 for a successful authenticated command', async () => {
    const code = await main(['list', '--json']);
    expect(code).toBe(0);
    expect(listCommand).toHaveBeenCalledWith(credentials, ['--json']);
  });

  // An interrupted run must report "aborted" (6) regardless of which layer
  // noticed the cancellation first — an aborted fetch surfacing as a network
  // error would otherwise be indistinguishable from a real outage.
  it('reports aborted (6) when interrupted mid-run', async () => {
    const onSpy = jest.spyOn(process, 'on');
    (listCommand as jest.Mock).mockImplementation(async () => {
      const handler = onSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      )?.[1] as (() => void) | undefined;
      if (handler) handler();
      throw new AuthError('boom');
    });

    const code = await main(['list']);

    expect(code).toBe(EXIT_ABORTED);
    expect(process.exitCode).toBe(EXIT_ABORTED);
    onSpy.mockRestore();
  });

  // N-1: a Ctrl-C that lands while no fetch is in flight (the local phase —
  // export writing files, login persisting credentials) does not make run()
  // throw — the command completes normally. The fallback check in main() must
  // still map that to aborted (6) instead of a silent exit 0.
  it('returns 6 when interrupted even if the command completes normally', async () => {
    const onSpy = jest.spyOn(process, 'on');
    (listCommand as jest.Mock).mockImplementation(async () => {
      const handler = onSpy.mock.calls.find(
        (call) => call[0] === 'SIGINT'
      )?.[1] as (() => void) | undefined;
      if (handler) handler();
      // Local phase: no fetch to cancel, the command just finishes.
    });

    const code = await main(['list']);

    expect(code).toBe(EXIT_ABORTED);
    expect(process.exitCode).toBe(EXIT_ABORTED);
    onSpy.mockRestore();
  });
});

describe('flushStdio', () => {
  // When stdout is a pipe, Node's writes are asynchronous; the race against an
  // unref'd guard must resolve (not hang) once the buffers are drained. The
  // resolved value is `[undefined, undefined]` when the drains win or
  // `undefined` when the guard wins — either way it must resolve, never hang.
  async function flushResolves(): Promise<boolean> {
    const result = await flushStdio();
    return result === undefined || Array.isArray(result);
  }

  it('resolves once stdio is drained', async () => {
    await expect(flushResolves()).resolves.toBe(true);
  });

  it('still resolves when a stream is mid-write (guard fires)', async () => {
    const writeSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => false);
    // Fire the guard immediately so the race wins even if drain never calls
    // back, instead of waiting the full FLUSH_GUARD_MS.
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((fn) => {
        (fn as () => void)();
        return { unref: () => {} } as unknown as ReturnType<typeof setTimeout>;
      });
    try {
      await expect(flushResolves()).resolves.toBe(true);
    } finally {
      writeSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    }
  });

  // 生命周期/资源：stdout 仍有缓冲（writableLength > 0）时必须走
  // `write('', cb)` 的 drain 分支等待落盘回调，而不是立即 resolve 丢数据。
  it('waits on a stream that still holds buffered data', async () => {
    const original = Object.getOwnPropertyDescriptor(
      process.stdout,
      'writableLength'
    );
    Object.defineProperty(process.stdout, 'writableLength', {
      value: 1024,
      configurable: true,
    });
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(((
      _chunk: unknown,
      cb?: unknown
    ) => {
      (cb as () => void)?.();
      return true;
    }) as never);

    try {
      await expect(flushResolves()).resolves.toBe(true);
      expect(writeSpy).toHaveBeenCalledWith('', expect.any(Function));
    } finally {
      writeSpy.mockRestore();
      if (original) {
        Object.defineProperty(process.stdout, 'writableLength', original);
      }
    }
  });
});
