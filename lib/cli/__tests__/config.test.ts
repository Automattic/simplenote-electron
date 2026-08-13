jest.mock('fs');

// ---------------------------------------------------------------------------
// config：lazy 读取仓库根 config.json 的 app_key，并缓存结果；同时导出若干
// 由环境变量驱动或恒定（生产 app id）的常量。cachedAppKey 是模块级状态，且
// APP_ID 等常量在模块加载时读取环境变量，因此每个用例通过 jest.isolateModules
// 重新加载模块以保证相互隔离，并从同一隔离块内取回 AuthError 类用于类型断言
// （不同 registry 下的同名类 instanceof 会失效）。
// 七大维度：入参边界 / 分支逻辑 / 异常故障 / 生命周期（缓存）/ 业务规则。
// ---------------------------------------------------------------------------

type ConfigModule = typeof import('../config.ts');
type ErrorsModule = typeof import('../domain/errors.ts');
import * as path from 'path';

// fs mock 实例在 jest.isolateModules 之间共享，调用次数会在用例间累计；
// 每次清空保证「调用次数」类断言与执行顺序无关。
beforeEach(() => {
  jest.clearAllMocks();
});

function loadFresh(setup?: (fsMod: { readFileSync: jest.Mock }) => void): {
  config: ConfigModule;
  AuthError: ErrorsModule['AuthError'];
} {
  let config!: ConfigModule;
  let AuthError!: ErrorsModule['AuthError'];
  jest.isolateModules(() => {
    const fsMod = require('fs');
    if (setup) setup(fsMod);

    config = require('../config.ts');

    AuthError = require('../domain/errors.ts').AuthError;
  });
  return { config, AuthError };
}

// 在同一隔离块内调用 getAppKey 并捕获异常与 AuthError 类，保证类型身份一致
// （不同 isolateModules 块会重新实例化 errors.ts，导致 instanceof 失效）。
function captureGetAppKey(
  setup: (fsMod: { readFileSync: jest.Mock }) => void
): { error: unknown; AuthError: ErrorsModule['AuthError'] } {
  let error: unknown;
  let AuthError!: ErrorsModule['AuthError'];
  jest.isolateModules(() => {
    const fsMod = require('fs');
    setup(fsMod);

    const config = require('../config.ts');

    AuthError = require('../domain/errors.ts').AuthError;
    try {
      config.getAppKey();
    } catch (e) {
      error = e;
    }
  });
  return { error, AuthError };
}

describe('config 常量与环境', () => {
  afterEach(() => {
    delete process.env.SIMPLENOTE_APP_ID;
    delete process.env.SIMPLENOTE_ACCOUNT_BASE;
  });

  it('【场景】默认 APP_ID / 基址  【目的】CLI 必须打生产 app id  【校验点】常量值  【预期】APP_ID=chalk-bump-f49，API/AUTH 基址正确', () => {
    const { config } = loadFresh(() => {});
    expect(config.APP_ID).toBe('chalk-bump-f49');
    expect(config.API_BASE).toBe('https://api.simperium.com/1');
    expect(config.AUTH_BASE).toBe('https://auth.simperium.com/1');
  });

  it('【场景】SIMPLENOTE_APP_ID 覆盖默认  【目的】可切换 app  【校验点】APP_ID 取值  【预期】读环境变量', () => {
    process.env.SIMPLENOTE_APP_ID = 'custom-app';
    expect(loadFresh(() => {}).config.APP_ID).toBe('custom-app');
  });

  it('【场景】SIMPLENOTE_ACCOUNT_BASE 覆盖默认  【目的】可切换账户基址  【校验点】ACCOUNT_BASE  【预期】读环境变量', () => {
    process.env.SIMPLENOTE_ACCOUNT_BASE = 'https://staging.example/account';
    expect(loadFresh(() => {}).config.ACCOUNT_BASE).toBe(
      'https://staging.example/account'
    );
  });
});

describe('getAppKey', () => {
  afterEach(() => {
    delete process.env.SIMPLENOTE_APP_ID;
    delete process.env.SIMPLENOTE_ACCOUNT_BASE;
    delete process.env.SIMPLENOTE_APP_KEY;
  });

  it('【场景】SIMPLENOTE_APP_KEY 设置  【目的】生产 app_key 可经环境注入（F-1 根治）  【校验点】返回值/文件读取 【预期】返回 env 值且不读取文件', () => {
    process.env.SIMPLENOTE_APP_KEY = 'env-provided-key';
    const { config } = loadFresh((fsMod) => {
      // env 优先：即便文件读取失败也不该触达文件层。
      fsMod.readFileSync.mockImplementation(() => {
        throw new Error('should not be read');
      });
    });
    expect(config.getAppKey()).toBe('env-provided-key');
    expect(
      (require('fs') as { readFileSync: jest.Mock }).readFileSync
    ).not.toHaveBeenCalled();
  });

  it('【场景】SIMPLENOTE_APP_KEY 为空串  【目的】空值等同未设置  【校验点】返回值 【预期】回退读取 config.json', () => {
    process.env.SIMPLENOTE_APP_KEY = '';
    const { config } = loadFresh((fsMod) => {
      fsMod.readFileSync.mockReturnValue(
        JSON.stringify({ app_key: 'file-key' })
      );
    });
    expect(config.getAppKey()).toBe('file-key');
  });

  it('【场景】全部失败  【目的】错误消息引导注入 env  【校验点】消息内容 【预期】含 SIMPLENOTE_APP_KEY 引导', () => {
    const { error } = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
    });
    expect((error as Error).message).toContain('SIMPLENOTE_APP_KEY');
    expect((error as Error).message).toContain('magic-link');
  });

  it('【场景】config.json 含合法 app_key  【目的】正常解析  【校验点】返回值  【预期】返回该 key', () => {
    const { config } = loadFresh((fsMod) => {
      fsMod.readFileSync.mockReturnValue(
        JSON.stringify({ app_key: 'secret-key' })
      );
    });
    expect(config.getAppKey()).toBe('secret-key');
  });

  it('【场景】任一锚点命中即可  【目的】多锚点回退  【校验点】首个失败后续成功  【预期】返回后续锚点的 key', () => {
    // 测试环境下 __dirname 推导的锚点与 process.cwd() 都解析到仓库根，Set 去重后
    // 只会剩一个候选，无法复现“首锚失败、次锚成功”的回退。这里临时把 cwd 指到
    // 另一条不相交的路径，从而让 moduleAnchors() 真实产出两个不同锚点；两个候选
    // 均在 getAppKey() 调用时实时计算，因此 cwd mock 在调用前就位即可生效。
    const cwdSpy = jest
      .spyOn(process, 'cwd')
      .mockReturnValue('/tmp/alt-cwd-root');
    try {
      const { config } = loadFresh((fsMod) => {
        // 用闭包计数保证“首次失败、其余成功”，不依赖 mockImplementationOnce/Implementation 的排队顺序
        let calls = 0;
        fsMod.readFileSync.mockImplementation(() => {
          calls += 1;
          if (calls === 1) {
            throw new Error('ENOENT first anchor');
          }
          return JSON.stringify({ app_key: 'fallback-key' });
        });
      });
      expect(config.getAppKey()).toBe('fallback-key');
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it('【场景】所有锚点均失败  【目的】无配置可优雅失败  【校验点】异常类型/消息/退出码  【预期】抛 AuthError(code 2) 提示无法读取 app_key', () => {
    const { error, AuthError } = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
    });
    expect(error).toBeInstanceOf(AuthError);
    expect((error as { code: number }).code).toBe(2);
    expect((error as Error).message).toContain('Cannot read app_key');
  });

  it('【场景】app_key 缺失或非字符串  【目的】拒绝无效 key  【校验点】异常类型/退出码  【预期】抛 AuthError(code 2)', () => {
    const a = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ other: 1 }));
    });
    expect(a.error).toBeInstanceOf(a.AuthError);
    expect((a.error as { code: number }).code).toBe(2);

    const b = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ app_key: 7 }));
    });
    expect(b.error).toBeInstanceOf(b.AuthError);
    expect((b.error as { code: number }).code).toBe(2);
  });

  it('【场景】app_key 为空串  【目的】空串等同缺失  【校验点】异常类型  【预期】抛 AuthError(code 2)', () => {
    const { error, AuthError } = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ app_key: '' }));
    });
    expect(error).toBeInstanceOf(AuthError);
    expect((error as { code: number }).code).toBe(2);
  });

  it('【场景】JSON 损坏  【目的】解析失败兜底  【校验点】异常类型  【预期】抛 AuthError(code 2)', () => {
    const { error, AuthError } = captureGetAppKey((fsMod) => {
      fsMod.readFileSync.mockReturnValue('{not json');
    });
    expect(error).toBeInstanceOf(AuthError);
    expect((error as { code: number }).code).toBe(2);
  });

  it('【场景】重复调用  【目的】缓存避免重复 IO  【校验点】readFileSync 调用次数  【预期】仅读取一次', () => {
    let fsModRef!: { readFileSync: jest.Mock };
    const { config } = loadFresh((fsMod) => {
      fsModRef = fsMod;
      fsMod.readFileSync.mockReturnValue(
        JSON.stringify({ app_key: 'cached-key' })
      );
    });
    const first = config.getAppKey();
    const countAfterFirst = fsModRef.readFileSync.mock.calls.length;
    const second = config.getAppKey();
    expect(first).toBe('cached-key');
    expect(second).toBe('cached-key');
    // 缓存生效：第二次调用不新增任何读盘（含锚点归属探测）。
    expect(fsModRef.readFileSync.mock.calls.length).toBe(countAfterFirst);
  });
});

describe('getVersion', () => {
  afterEach(() => {
    delete process.env.SIMPLENOTE_APP_ID;
    delete process.env.SIMPLENOTE_ACCOUNT_BASE;
  });

  it('【场景】模块自身 package.json 可读  【目的】--version 报告 CLI 独立版本线（B9）  【校验点】返回值 【预期】与 lib/cli/package.json 的 version 一致', () => {
    const realFs = jest.requireActual('fs') as typeof import('fs');
    const { config } = loadFresh((fsMod) => {
      // 委托给真实 fs，让模块自身 package.json 真实可读。
      fsMod.readFileSync.mockImplementation(((
        ...args: Parameters<typeof realFs.readFileSync>
      ) => realFs.readFileSync(...args)) as never);
    });
    const expectedVersion = (require('../package.json') as { version: string })
      .version;
    expect(expectedVersion).toBe('0.1.0');
    expect(config.getVersion()).toBe(expectedVersion);
  });

  it('【场景】SIMPLENOTE_CLI_VERSION 注入  【目的】构建期版本注入优先于任何文件读取  【校验点】返回值 【预期】返回注入值', () => {
    process.env.SIMPLENOTE_CLI_VERSION = '9.8.7';
    try {
      const { config } = loadFresh(() => {});
      expect(config.getVersion()).toBe('9.8.7');
    } finally {
      delete process.env.SIMPLENOTE_CLI_VERSION;
    }
  });

  it('【场景】模块 manifest 优先于仓库根  【目的】模块自身版本线生效  【校验点】返回值 【预期】返回模块 version（0.1.0）而非根版本', () => {
    const realFs = jest.requireActual('fs') as typeof import('fs');
    const { config } = loadFresh((fsMod) => {
      fsMod.readFileSync.mockImplementation(((
        ...args: Parameters<typeof realFs.readFileSync>
      ) => realFs.readFileSync(...args)) as never);
    });
    expect(config.getVersion()).toBe('0.1.0');
    expect(config.getVersion()).not.toBe('2.27.1');
  });

  it('【场景】package.json 不可读  【目的】--version 永不因文件缺失而失败  【校验点】回退值  【预期】返回 CLI_VERSION_FALLBACK', () => {
    const { config } = loadFresh((fsMod) => {
      fsMod.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
    });
    expect(config.getVersion()).toBe('0.0.0');
  });

  it('【场景】version 缺失或为空串  【目的】拒绝无效版本字段  【校验点】回退值  【预期】返回 CLI_VERSION_FALLBACK', () => {
    const a = loadFresh((fsMod) => {
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ name: 'x' }));
    });
    expect(a.config.getVersion()).toBe('0.0.0');

    const b = loadFresh((fsMod) => {
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ version: '' }));
    });
    expect(b.config.getVersion()).toBe('0.0.0');
  });

  it('【场景】重复调用  【目的】版本缓存避免重复 IO  【校验点】readFileSync 调用次数  【预期】第二次调用不产生新读', () => {
    let fsModRef!: { readFileSync: jest.Mock };
    const { config } = loadFresh((fsMod) => {
      fsModRef = fsMod;
      fsMod.readFileSync.mockReturnValue(JSON.stringify({ version: '9.9.9' }));
    });
    const first = config.getVersion();
    const countAfterFirst = fsModRef.readFileSync.mock.calls.length;
    const second = config.getVersion();
    expect(first).toBe('9.9.9');
    expect(second).toBe('9.9.9');
    // 首次调用含锚点探测读（isProjectRoot 每锚点读一次 package.json）；
    // 缓存命中后第二次调用不产生任何新读。
    expect(fsModRef.readFileSync.mock.calls.length).toBe(countAfterFirst);
  });
});

describe('ancestorAnchors 与 moduleAnchors', () => {
  it('【场景】从 dist 目录起始 【目的】打包形态（source/dist/SEA）锚点可上溯到仓库根 【校验点】逐级祖先 【预期】dist→cli→lib→仓库根 均被覆盖', () => {
    const repoRoot = process.cwd();
    const { config } = loadFresh(() => {});
    const anchors = config.ancestorAnchors(
      path.join(repoRoot, 'lib', 'cli', 'dist')
    );
    expect(anchors).toContain(path.join(repoRoot, 'lib', 'cli', 'dist'));
    expect(anchors).toContain(path.join(repoRoot, 'lib', 'cli'));
    expect(anchors).toContain(path.join(repoRoot, 'lib'));
    expect(anchors).toContain(repoRoot);
  });

  it('【场景】moduleAnchors 【目的】以模块目录为起点上溯，并始终含 cwd 兜底 【校验点】锚点集合 【预期】同时含仓库根与 lib/cli', () => {
    const repoRoot = process.cwd();
    const { config } = loadFresh(() => {});
    const anchors = config.moduleAnchors();
    expect(anchors).toContain(repoRoot);
    expect(anchors).toContain(path.join(repoRoot, 'lib', 'cli'));
  });

  it('【场景】默认深度 【目的】锚点数量与顺序固定 【校验点】数组形态 【预期】默认 5 层且逐级为上级目录', () => {
    const { config } = loadFresh(() => {});
    const start = path.join(process.cwd(), 'x', 'y', 'z');
    const anchors = config.ancestorAnchors(start);
    expect(anchors).toHaveLength(5);
    expect(anchors[0]).toBe(path.resolve(start));
    for (let i = 1; i < anchors.length; i += 1) {
      expect(anchors[i]).toBe(path.dirname(anchors[i - 1]));
    }
  });

  // E-5：getAppKey 的锚点链在项目根（package.json name 匹配）停止，不再越过
  // 项目根捡到无关祖先目录的 config.json app_key（全局安装形态 401 难排查的
  // 根源）。cwd 本身仍保留为一级兜底。
  it('【场景】模块锚点遇项目根即停 【目的】E-5 归属校验 【校验点】候选不越项目根 【预期】用项目根 key 且不读项目根之上', () => {
    const repoRoot = path.resolve(process.cwd());
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/tmp/elsewhere');
    try {
      const readPaths: string[] = [];
      const { config } = loadFresh((fsMod) => {
        fsMod.readFileSync.mockImplementation((filePath: string) => {
          readPaths.push(filePath);
          if (filePath.endsWith('package.json')) {
            // 只有仓库根的 package.json 属于本项目；其余目录（含 lib/cli）
            // 视为非项目根，验证链真正上溯到仓库根而非中途停止。
            return JSON.stringify({
              name:
                path.resolve(path.dirname(filePath)) === repoRoot
                  ? 'simplenote'
                  : 'some-other-package',
            });
          }
          return JSON.stringify({ app_key: 'root-key' });
        });
      });
      expect(config.getAppKey()).toBe('root-key');
      // 归属校验生效：所有读取路径要么在仓库根子树内，要么属于 cwd 兜底
      // （mock 到 /tmp/elsewhere）；仓库根之上的任何祖先目录都不允许出现。
      const cwdPath = '/tmp/elsewhere';
      for (const p of readPaths) {
        const resolved = path.resolve(p);
        const insideRepo =
          resolved === repoRoot || resolved.startsWith(repoRoot + path.sep);
        const insideCwd =
          resolved === cwdPath || resolved.startsWith(cwdPath + path.sep);
        expect(insideRepo || insideCwd).toBe(true);
      }
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
