import { COMMAND_HELP, renderCommandHelp } from '../command-help.ts';
import { AUTHENTICATED_COMMANDS } from '../app.ts';

/**
 * 每个命令帮助必须覆盖的命令与核心旗标。帮助是给人读的（用途/示例/退出码），
 * 因此这里只锁定关键旗标与命令名，不要求与 app.ts 的 flags 逐字一致；命令集合
 * 的同步则通过下方案例强制：COMMAND_HELP 的键必须与 AUTHENTICATED_COMMANDS 加
 * login/logout 完全一致。
 */
const EXPECTED_COMMANDS = [
  'login',
  'logout',
  'whoami',
  'list',
  'show',
  'search',
  'edit',
  'create',
  'add',
  'export',
];

const EXPECTED_FLAGS: Record<string, string[]> = {
  login: [],
  logout: [],
  whoami: ['--json'],
  list: ['--limit=N', '--json', '--include-trashed'],
  show: ['--json'],
  search: ['--limit=N', '--json', '--include-trashed'],
  edit: ['--json', '--content=', '--file='],
  create: ['--tags=a,b', '--json', '--content=', '--file='],
  add: ['--file=', '--json'],
  export: ['--format=', '--output='],
};

describe('command-help 内容', () => {
  it('【场景】全部命令 【目的】每个命令都有帮助文案  【校验点】键集合  【预期】覆盖 login/logout/全部认证命令', () => {
    const knownCommands = new Set([
      ...Object.keys(AUTHENTICATED_COMMANDS),
      'login',
      'logout',
    ]);
    for (const command of EXPECTED_COMMANDS) {
      expect(COMMAND_HELP[command]).toBeDefined();
      expect(knownCommands.has(command)).toBe(true);
    }
    // 反向：COMMAND_HELP 不得凭空出现未知命令，避免文档与分发表漂移。
    for (const key of Object.keys(COMMAND_HELP)) {
      expect(knownCommands.has(key)).toBe(true);
    }
  });

  it('【场景】每命令帮助 【目的】包含用途、核心旗标与退出码说明  【校验点】文案片段  【预期】Usage 行 + 关键旗标 + Exit codes 齐备', () => {
    for (const command of EXPECTED_COMMANDS) {
      const help = COMMAND_HELP[command];
      expect(help).toContain(`Usage: npm run cli -- ${command}`);
      expect(help).toContain('Exit codes:');
      for (const flag of EXPECTED_FLAGS[command]) {
        expect(help).toContain(flag);
      }
    }
  });

  it('【场景】export 帮助 【目的】说明多格式与默认行为  【校验点】文案  【预期】all/json/markdown/zip 与默认输出目录', () => {
    const help = COMMAND_HELP.export;
    expect(help).toContain('json, markdown, zip, or all');
    expect(help).toContain('simplenote-export');
  });

  it('【场景】add 帮助 【目的】说明幂等行为  【校验点】文案  【预期】提到 idempotent/去重', () => {
    expect(COMMAND_HELP.add).toContain('Idempotent');
  });

  it('【场景】add 退出码 【目的】声明 not found/conflict 【校验点】4/5 出现 【预期】add 的部分失败路径真实可达，脚本可按 4/5 分支', () => {
    expect(COMMAND_HELP.add).toContain('4 not found');
    expect(COMMAND_HELP.add).toContain('5 conflict');
  });

  it('【场景】create 退出码 【目的】只列真实可达的退出码 【校验点】不出现 4/5 【预期】create 用随机 UUID 做无版本 POST（note-source versionPath 为空），404/409 分支不可达', () => {
    expect(COMMAND_HELP.create).not.toContain('4 not found');
    expect(COMMAND_HELP.create).not.toContain('5 conflict');
  });

  it('【场景】退出码文档 【目的】帮助只列真实可达的退出码 【校验点】退出码行 【预期】全部命令含 1 usage；logout 不含 3；whoami 不含 3；两者均含 6（全局信号码）', () => {
    for (const command of EXPECTED_COMMANDS) {
      expect(COMMAND_HELP[command]).toContain('1 usage');
    }
    // 6 aborted is a *global* signal mapping: app.ts main() applies
    // `lifecycle.aborted() -> EXIT_ABORTED` to every command, and
    // loadCredentials is an async suspension point, so logout/whoami can exit
    // 6 too even though their own work has no abortable await. 3 network is
    // still unreachable: clearCredentials swallows every error and
    // loadCredentials swallows fs errors.
    expect(COMMAND_HELP.logout).not.toContain('3 network');
    expect(COMMAND_HELP.logout).toContain('6 aborted');
    expect(COMMAND_HELP.whoami).not.toContain('3 network');
    expect(COMMAND_HELP.whoami).toContain('6 aborted');
    expect(COMMAND_HELP.whoami).toContain('2 auth');
  });
});

describe('renderCommandHelp', () => {
  it('【场景】已知命令 【目的】返回该命令帮助  【校验点】返回值 【预期】与 COMMAND_HELP 表一致', () => {
    expect(renderCommandHelp('list')).toBe(COMMAND_HELP.list);
    expect(renderCommandHelp('login')).toBe(COMMAND_HELP.login);
  });

  it('【场景】未知命令 【目的】给出纠正提示而非空洞输出  【校验点】返回值 【预期】标注 Unknown command 并指向顶层 help', () => {
    const rendered = renderCommandHelp('frobnicate');
    expect(rendered).toContain('Unknown command: frobnicate');
    expect(rendered).toContain('npm run cli -- help');
  });
});
