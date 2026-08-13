# Simplenote CLI

Simplenote 的命令行客户端（独立版本线 `0.1.0`），通过 Simperium REST API 读写笔记。本模块与桌面应用的版本相互独立，`--version` 报告的是 CLI 自身版本。

## 安装与运行

```bash
# 推荐：--silent 避免 npm 的 banner 污染 stdout 上的 --json 输出
npm run --silent cli -- <command> [args]

# 或构建后直接运行（跳过 npm 包装与 tsx 桥）
cd lib/cli && npm run build && node dist/cli.js <command> [args]
```

`npm run cli` 走仓库根 `bin/simplenote-cli.js`（tsx 桥，需要根 devDependencies 并读取仓库根 config.json）；构建后的 `dist/cli.js` 是 esbuild 打成的单文件 CommonJS，只依赖本模块声明的 dependencies，可脱离仓库运行。

## 分发与安装

| 方式 | 命令 | 产物 / 使用 |
| --- | --- | --- |
| npm 包 | `npm pack`（prepack 自动执行 `npm run build`） | `simplenote-cli-0.1.0.tgz`；消费方 `npm i <tarball>` 后 `npx simplenote-cli` |
| 单文件可执行（SEA） | `cd lib/cli && npm run build:sea` | `dist/simplenote-cli(.exe)`；单文件拷贝即用，不依赖 Node 运行时或同目录 manifest |
| 安装到 PATH | `node lib/cli/scripts/install.mjs` | 复制 exe 与版本 manifest 到 `~/.local/bin/`；卸载：`node lib/cli/scripts/install.mjs --uninstall`（幂等） |

`dist/` 与 `coverage/` 已由 `lib/cli/.gitignore` 排除，构建产物不入库。

网络与密钥注入：

- CN 网络下偶发的 IPv6 解析黑洞：源码运行请用 `node --dns-result-order=ipv4first ...`（仓库根 `npm run cli` 已内置该参数）；SEA 打包产物暂未内置该参数，待后续版本补齐。
- 生产 app_key 经 `SIMPLENOTE_APP_KEY` 环境注入（见「环境变量」），无需改写仓库根 `config.json`（其内是开发 app key，直接用于密码登录会 401）。

## 命令一览

| 命令 | 说明 |
| --- | --- |
| `login` | 登录（密码经 `SIMPLENOTE_PASSWORD`，或 magic-link 验证码交互） |
| `logout` | 删除本地凭据 |
| `whoami [--json]` | 打印当前登录用户名 |
| `list [--limit=N] [--json]` | 列出笔记摘要，按最近修改排序 |
| `show <id> [--json]` | 显示单条笔记内容 |
| `search "<query>" [--limit=N] [--json]` | 搜索笔记内容（支持 `tag:` 过滤器） |
| `edit <id> "<content>" [--json]` | 替换笔记内容（也支持 `--content=` 或 `--file=`） |
| `create "<content>" [--tags=a,b] [--json]` | 创建笔记（也支持 `--content=` 或 `--file=`） |
| `add --file=notes.json [--json]` | 从 JSON 数组文件批量创建笔记（幂等） |
| `export [--format=all\|json\|markdown\|zip] [--output=DIR]` | 导出笔记 |

通用标志（所有命令可用，位置任意）：

- `-v, --version`：打印 CLI 版本后退出
- `-h, --help`：全局帮助；`cli <command> --help` 查看单命令细节
- `--verbose`：向 stderr 输出请求级诊断（或设置 `SIMPLENOTE_CLI_DEBUG=1`）

`list`/`search` 默认跳过回收站；加 `--include-trashed` 保留。`--` 终止标志解析，例如 `create -- "--not-a-flag"` 会创建内容为 `--not-a-flag` 的笔记。

`list`/`search` 需要拉取账户的**全量索引**（Simperium index 按 storage order 返回，无法在服务端排序或截断），成本与账户笔记总量成正比，`--limit` 只控制输出条数。大账户请优先使用 `search` 或 `export`。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 用法错误 |
| 2 | 认证失败（登录被限流 HTTP 429 时按 3 而非 2 退出） |
| 3 | 网络错误 |
| 4 | 笔记不存在 |
| 5 | 冲突 |
| 6 | 中断（Ctrl-C） |
| 7 | 部分完成（批量命令遇错） |
| 99 | 未预期错误 |

退出码是脚本可依赖的公开契约，不随错误消息文案变化。认证失败（2）优先于参数值错误（1）：同一参数错误在未登录时按 2 退出、已登录时按 1 退出（未知旗标在凭证加载前校验，恒按 1 退出）；脚本分支请以 2 优先判断。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `SIMPLENOTE_USER` | `login` 的用户名 |
| `SIMPLENOTE_PASSWORD` | `login` 的密码（设置后走密码登录，否则走 magic-link） |
| `SIMPLENOTE_APP_KEY` | 覆盖密码登录所用的 app_key（优先级高于 config.json） |
| `SIMPLENOTE_CLI_TIMEOUT_MS` | 单请求超时（默认 15000；分页拉取的剩余预算下限 1000ms） |
| `SIMPLENOTE_CLI_TOTAL_TIMEOUT_MS` | 整个分页拉取的预算（默认 120000） |
| `SIMPLENOTE_CLI_DEBUG` | 设为 `1` 等效于 `--verbose` |
| `SIMPLENOTE_APP_ID` | 覆盖 Simperium app id（高级选项，默认生产 app id） |
| `SIMPLENOTE_ACCOUNT_BASE` | 覆盖账户服务基址（高级选项，默认 app.simplenote.com） |

## 输出通道契约

- `--json` 的机器输出一律走 **stdout**；诊断、进度、警告一律走 **stderr**。
- `--help` / `<command> --help` 输出走 **stderr**（保证 stdout 留给管道数据；`--version` 走 stdout）。
- 非 JSON 模式下 `create` 将新笔记 id 输出到 **stdout**（脚本消费 id 时同样用 `npm run --silent`）；其余命令非 JSON 模式 stdout 无输出（`edit` 仅 stderr 提示）。
- 管道消费 `--json` 时请用 `npm run --silent cli -- list --json` 或直接调用 `node dist/cli.js`（构建后），否则 npm 自己的 banner 会混入 stdout 破坏载荷。

## 安全

- 登录凭据以**明文**存储在 `~/.simplenote-cli/credentials.json`。
- POSIX 上写入强制 `0600`，通过「私有临时文件 + 原子 rename」落盘，写失败会清理临时文件，避免泄漏包含有效 token 的残留文件。
- `loadCredentials()` 每次读取会做权限自检：若文件被 group/other 可读（如 `0644`），向 stderr 告警并提示 `chmod 600` 修复。该自检是缓解而非根治——不要在共享机器上把该文件权限放宽。
- **Windows 局限**：chmod 是 no-op，访问控制由 ACL 决定，权限自检在 Windows 上跳过。请通过 NTFS ACL 限制该文件的访问。
- 生产 app_key 建议经 `SIMPLENOTE_APP_KEY` 环境注入：仓库根 `config.json` 默认携带的是开发 key，直接用于密码登录会因 app 失配而 401。
- 密码登录持续失败时改用 magic-link 登录（取消 `SIMPLENOTE_PASSWORD`，交互输入验证码）。

## 开发与测试

- 单元测试：`cd lib/cli && npm test`（或 `npx jest lib/cli`，走仓库根配置，无覆盖率门禁）
- 覆盖率门禁：`cd lib/cli && npm run coverage`（等价 `npx jest --config lib/cli/jest.config.cjs --coverage`，阈值 80/75/80/80）
- 契约测试：`npx jest lib/cli/__tests__/contract`（本地回环服务器，离线可跑）
- 代码规范：`npx eslint lib/cli`（0 error；`no-console` warning 为既有基线）
- 凭据测试注意：权限告警用例通过 mock `process.platform` 与 `fs.stat` 覆盖，Windows 宿主上真实 chmod 为 no-op，不影响断言。
