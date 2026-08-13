import { whoamiCommand } from '../commands/whoami.ts';
import { UsageError } from '../domain/errors.ts';
import type { Credentials } from '../domain/types.ts';

// ---------------------------------------------------------------------------
// whoami：打印已登录用户名。极简命令，但直接单测可锁定其输出契约与越参校验。
// 七大维度：入参边界 / 分支逻辑 / 异常故障。
// ---------------------------------------------------------------------------

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('whoamiCommand', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('【场景】默认输出  【目的】打印纯用户名  【校验点】stdout 内容  【预期】仅打印用户名', async () => {
    await whoamiCommand(credentials, []);
    expect(logSpy).toHaveBeenCalledWith('user@example.com');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('【场景】--json 输出  【目的】结构化输出供脚本解析  【校验点】JSON 形状  【预期】{ username }', async () => {
    await whoamiCommand(credentials, ['--json']);
    expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual({
      username: 'user@example.com',
    });
  });

  it('【场景】存在多余位置参数  【目的】拒绝 typo  【校验点】异常类型/退出码  【预期】抛 UsageError(code 1)', async () => {
    let thrown: unknown;
    try {
      await whoamiCommand(credentials, ['extra']);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UsageError);
    expect((thrown as UsageError).code).toBe(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('【场景】--json 与多余参数  【目的】越参优先于正常输出  【校验点】不打印用户名  【预期】抛 UsageError', async () => {
    await expect(
      whoamiCommand(credentials, ['--json', 'extra'])
    ).rejects.toBeInstanceOf(UsageError);
  });
});
