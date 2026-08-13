import { writeJsonExport, writeMarkdownExport } from '../export-helpers.ts';
import {
  addFilename,
  appendTags,
  prepareNotes,
  toUniqueNames,
  type PreparedNote,
} from '../export-naming.ts';
import type { ExportNote } from '../vendor/export/types.ts';
import type * as T from '../vendor/types.ts';
import { CliError, AbortedError } from '../domain/errors.ts';
import { setExternalAbortSignal } from '../infra/http.ts';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// Minimal ExportNote factory: no tags, so appendTags leaves content untouched
// and the filename is derived purely from the first non-blank line.
function note(content: string): ExportNote {
  return {
    content,
    collaboratorEmails: [],
    creationDate: 0,
    id: 'x' as T.EntityId,
    modificationDate: 0,
    tags: [],
  };
}

describe('prepareNotes filename de-duplication', () => {
  it('leaves a unique filename without a suffix', () => {
    const prepared = prepareNotes([note('Solo')]);
    expect(prepared[0].fileName).toBe('Solo');
  });

  // The previous toUniqueNames double-counted the base name on the first
  // occurrence (1 -> 2), so the second duplicate read 2 and produced
  // "Meeting (2)" — skipping "(1)" entirely. The sequence is now consecutive.
  it('numbers duplicate filenames consecutively from (1)', () => {
    const prepared = prepareNotes([
      note('Meeting notes\nbody'),
      note('Meeting notes\nother'),
      note('Meeting notes\nthird'),
    ]);
    expect(prepared.map((p) => p.fileName)).toEqual([
      'Meeting notes',
      'Meeting notes (1)',
      'Meeting notes (2)',
    ]);
  });

  // An input whose own first line already looks like "Meeting (1)" must not
  // collide with the generated "(1)" from an earlier duplicate: the probe
  // pushes it forward instead of overwriting the existing file.
  it('does not collide when an input name already ends with (n)', () => {
    const prepared = prepareNotes([
      note('Meeting'),
      note('Meeting'),
      note('Meeting (1)'),
    ]);
    const names = prepared.map((p) => p.fileName);
    expect(new Set(names).size).toBe(3);
    expect(names).toContain('Meeting');
    expect(names).toContain('Meeting (1)');
  });

  // 分支逻辑：命名去重的 while 探测路径——第二个重复名生成的 "(1)" 恰被一个
  // 独立输入占用时，必须继续递增到 "(2)"，而不是覆盖既有文件名。
  it('pushes past a generated (n) that is already taken by an input', () => {
    const prepared = prepareNotes([
      note('Meeting'),
      note('Meeting (1)'),
      note('Meeting'),
    ]);
    expect(prepared.map((p) => p.fileName)).toEqual([
      'Meeting',
      'Meeting (1)',
      'Meeting (2)',
    ]);
  });

  // H-01: case-insensitive file systems (Windows/macOS) write "Meeting" and
  // "meeting" to the same path; writeFile's default 'w' flag would silently
  // overwrite one note with the other unless the de-dup key is case-folded.
  it('case-folds de-duplication so case-insensitive file systems cannot overwrite', () => {
    const prepared = prepareNotes([note('Meeting'), note('meeting')]);
    expect(prepared.map((p) => p.fileName)).toEqual(['Meeting', 'meeting (1)']);
  });

  // N-4：markdown 与 zip 对同一批笔记各跑一次 prepareNotes；memoize 后同一
  // 数组引用第二次调用命中缓存（format=all 时 4 次调用降为 2 次计算）。
  it('【场景】同一数组两次 prepareNotes 【目的】N-4 memoize 【校验点】引用相等/不同数组不串扰 【预期】同引用、各自独立', () => {
    const notes = [note('Same title')];
    const first = prepareNotes(notes);
    expect(prepareNotes(notes)).toBe(first);
    // 内容相同但引用不同的数组不命中缓存，各自计算。
    expect(prepareNotes([note('Same title')])).not.toBe(first);
  });
});

describe('addFilename', () => {
  it('【场景】取首行非空文本  【目的】文件名来源  【校验点】首行  【预期】返回首行', () => {
    expect(addFilename(note('Hello\nworld')).fileName).toBe('Hello');
  });

  it('【场景】CRLF 首行  【目的】跨平台一致性  【校验点】首行  【预期】剥离 \\r 后取 Title（生产链路已先 normalizeLineBreak，此处为等价性验证）', () => {
    expect(addFilename(note('\r\nTitle\nbody')).fileName).toBe('Title');
  });

  it('【场景】前导空行  【目的】跳过空白  【校验点】首个非空行  【预期】返回真实标题', () => {
    expect(addFilename(note('\n\n  \nReal title')).fileName).toBe('Real title');
  });

  it('【场景】全为空  【目的】兜底  【校验点】回退名  【预期】untitled', () => {
    expect(addFilename(note('   \n\n')).fileName).toBe('untitled');
  });

  it('【场景】含非法文件名字符  【目的】sanitize  【校验点】不含路径分隔符  【预期】安全名', () => {
    expect(addFilename(note('a/b:c')).fileName).not.toContain('/');
  });

  it('【场景】首行超长  【目的】截断  【校验点】长度上限  【预期】不超过 FILENAME_LENGTH', () => {
    expect(
      addFilename(note('x'.repeat(100))).fileName.length
    ).toBeLessThanOrEqual(40);
  });

  it('【场景】截断边界落在代理对中间  【目的】不产生孤立代理  【校验点】末尾无孤立高代理  【预期】回退一位保留完整字符', () => {
    const out = addFilename(note('a'.repeat(39) + '😀\nbody'));
    const last = out.fileName.charCodeAt(out.fileName.length - 1);
    expect(out.fileName.length).toBeLessThanOrEqual(40);
    expect(last >= 0xd800 && last <= 0xdfff).toBe(false);
    expect(out.fileName).toBe('a'.repeat(39));
  });
});

describe('appendTags', () => {
  it('【场景】无标签  【目的】原样返回  【校验点】引用相等且内容不变  【预期】返回同一对象', () => {
    const n = note('body');
    expect(appendTags(n)).toBe(n);
  });

  it('【场景】单个短标签  【目的】追加 Tags 块  【校验点】内容含 Tags 与标签  【预期】保留正文并追加', () => {
    const out = appendTags({ ...note('body'), tags: ['work'] as T.TagName[] });
    expect(out.content).toContain('Tags:');
    expect(out.content).toContain('work');
    expect(out.content.startsWith('body')).toBe(true);
  });

  it('【场景】大量标签  【目的】按宽度换行  【校验点】多行缩进  【预期】超过一行', () => {
    const tags = Array.from({ length: 30 }, (_, i) => `tag-${i}` as T.TagName);
    const out = appendTags({ ...note('body'), tags });
    const tagLines = out.content
      .split('\n')
      .filter((line) => line.startsWith('  '));
    expect(tagLines.length).toBeGreaterThan(1);
    expect(out.content).toContain('Tags:');
  });

  // C.3：空/空白/含换行 tag 必须被过滤，不能进入导出文件（含换行 tag 会
  // 破坏 markdown 格式，且 tag: 模式 `[^\s,]+` 永远搜不到它）。
  it('【场景】脏标签（空/空白/含换行） 【目的】过滤不进入导出 【校验点】仅干净标签输出 【预期】脏标签被剔除', () => {
    const out = appendTags({
      ...note('body'),
      tags: ['', '  ', 'work', 'a\nb'] as T.TagName[],
    });
    expect(out.content).toContain('Tags:');
    expect(out.content).toContain('work');
    expect(out.content).not.toContain('a\nb');
    const tagLines = out.content
      .split('\n')
      .filter((line) => line.startsWith('  '));
    expect(tagLines).toEqual(['  work']);
  });

  it('【场景】全脏标签 【目的】等价于无标签 【校验点】引用相等 【预期】返回原对象不加 Tags 区', () => {
    const n = { ...note('body'), tags: ['', '\nx'] as T.TagName[] };
    expect(appendTags(n)).toBe(n);
  });
});

describe('toUniqueNames', () => {
  const base: PreparedNote = { ...note('Title'), fileName: 'Title' };

  it('【场景】首次出现  【目的】基础名  【校验点】不追加后缀  【预期】原文件名', () => {
    const acc: [PreparedNote[], Map<string, number>] = [[], new Map()];
    const [notes] = toUniqueNames(acc, base);
    expect(notes[0].fileName).toBe('Title');
  });

  it('【场景】第二次重复  【目的】顺序编号  【校验点】后缀 (1)  【预期】Title (1)', () => {
    const acc: [PreparedNote[], Map<string, number>] = [[], new Map()];
    toUniqueNames(acc, base);
    const [notes] = toUniqueNames(acc, { ...base });
    expect(notes[1].fileName).toBe('Title (1)');
  });

  it('【场景】输入名已含 (n)  【目的】不冲突  【校验点】探测后推  【预期】保留生成 (1) 并将输入名标为 (1) (1)', () => {
    const acc: [PreparedNote[], Map<string, number>] = [[], new Map()];
    toUniqueNames(acc, base);
    toUniqueNames(acc, { ...base });
    const [notes] = toUniqueNames(acc, { ...base, fileName: 'Title (1)' });
    const names = notes.map((n) => n.fileName);
    expect(names).toContain('Title (1)');
    // The user-supplied "Title (1)" is distinguished from the generated one by
    // appending another suffix, never by reusing "(1)" or jumping to "(2)".
    expect(names).toContain('Title (1) (1)');
    expect(new Set(names).size).toBe(3);
  });
});

function noteWithId(content: string, id: string): ExportNote {
  return {
    ...note(content),
    id: id as T.EntityId,
  };
}

describe('writeJsonExport', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simplenote-json-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('【场景】常规导出 【目的】验证 JSON 发布与 staging 清理 【校验点】文件内容/无 .part 残留 【预期】缩进 JSON 且干净落盘', async () => {
    const grouped = {
      activeNotes: [noteWithId('a', 'n1')],
      trashedNotes: [noteWithId('t', 'n2')],
    };

    await writeJsonExport(grouped, tmpDir);

    const raw = await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual(grouped);
    expect(
      (await fs.readdir(tmpDir)).filter((name) => name.endsWith('.part'))
    ).toEqual([]);
  });

  it('【场景】新写入失败 【目的】验证失败回滚与旧文件保留 【校验点】notes.json 旧内容/无 staging 残留 【预期】旧文件原样保留', async () => {
    const target = path.join(tmpDir, 'notes.json');
    await fs.writeFile(target, '{"previous":true}', 'utf8');
    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));

    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    expect(await fs.readFile(target, 'utf8')).toBe('{"previous":true}');
    expect(
      (await fs.readdir(tmpDir)).filter((name) => name.endsWith('.part'))
    ).toEqual([]);
  });

  it('【场景】上次运行遗留 staging/backup 【目的】验证启动清理 【校验点】残留被移除且新文件生成 【预期】孤本删除、notes.json 产出', async () => {
    const orphan = path.join(tmpDir, '.notes.json.999.deadbeef.part');
    const orphanBackup = path.join(tmpDir, '.notes.json.999.deadbeef.bak');
    await fs.writeFile(orphan, 'half a file', 'utf8');
    await fs.writeFile(orphanBackup, 'old backup', 'utf8');

    await writeJsonExport({ activeNotes: [], trashedNotes: [] }, tmpDir);

    await expect(fs.access(orphan)).rejects.toBeTruthy();
    await expect(fs.access(orphanBackup)).rejects.toBeTruthy();
    await expect(
      fs.access(path.join(tmpDir, 'notes.json'))
    ).resolves.toBeUndefined();
  });

  // B.7：isStagingOf 只识别自有 pid.hex 中段格式；同名前缀的用户文件即使
  // 带 .part/.bak 后缀也绝不能被视为残留去删除或恢复。
  it('【场景】同名前缀用户文件 【目的】谓词收紧后不误伤用户文件 【校验点】用户 .part/.bak 保留 【预期】两文件原样存在', async () => {
    const userPart = path.join(tmpDir, '.notes.json.my-notes.part');
    const userBackup = path.join(tmpDir, '.notes.json.my-notes.bak');
    await fs.writeFile(userPart, 'user data', 'utf8');
    await fs.writeFile(userBackup, 'user data', 'utf8');

    await writeJsonExport({ activeNotes: [], trashedNotes: [] }, tmpDir);

    await expect(fs.access(userPart)).resolves.toBeUndefined();
    await expect(fs.access(userBackup)).resolves.toBeUndefined();
  });

  // C.1：崩溃窗口（target 缺失 + backup 唯一副本）下，sweepStale 必须把
  // backup 恢复为 target 而不是删除 —— 旧实现删掉 .bak 会永久丢失最后一份
  // 完好导出。这里让新导出构建失败，验证恢复的旧导出在失败后仍被保留。
  it('【场景】崩溃窗口残留（target 缺失 + backup 唯一副本） 【目的】恢复而非删除最后完好导出 【校验点】notes.json 内容 【预期】旧导出被恢复且在后续失败后保留', async () => {
    const orphan = path.join(tmpDir, '.notes.json.999.deadbeef.part');
    const orphanBackup = path.join(tmpDir, '.notes.json.999.deadbeef.bak');
    await fs.writeFile(orphan, 'half a file', 'utf8');
    await fs.writeFile(orphanBackup, 'old backup', 'utf8');

    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));
    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    // backup 被 rename 回 notes.json（而非删除），构建失败后旧导出仍在。
    expect(await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8')).toBe(
      'old backup'
    );
    await expect(fs.access(orphan)).rejects.toBeTruthy();
    await expect(fs.access(orphanBackup)).rejects.toBeTruthy();
  });

  it('【场景】commit 完成态残留（target 存在 + backup） 【目的】backup 为冗余可清理 【校验点】backup 删除、导出成功 【预期】仅 target 保留', async () => {
    await fs.writeFile(path.join(tmpDir, 'notes.json'), 'new export', 'utf8');
    const orphanBackup = path.join(tmpDir, '.notes.json.999.deadbeef.bak');
    await fs.writeFile(orphanBackup, 'old backup', 'utf8');

    await writeJsonExport(
      { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
      tmpDir
    );

    await expect(fs.access(orphanBackup)).rejects.toBeTruthy();
    expect(
      JSON.parse(await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8'))
    ).toEqual({ activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] });
  });

  it('【场景】仅 staging 残留 【目的】清理不误伤现有 target 【校验点】.part 删除、导出正常 【预期】清理成功', async () => {
    const orphan = path.join(tmpDir, '.notes.json.888.abcdef01.part');
    await fs.writeFile(orphan, 'half a file', 'utf8');

    await writeJsonExport({ activeNotes: [], trashedNotes: [] }, tmpDir);

    await expect(fs.access(orphan)).rejects.toBeTruthy();
    await expect(
      fs.access(path.join(tmpDir, 'notes.json'))
    ).resolves.toBeUndefined();
  });

  // B.7：多次崩溃会留下多个 .bak，恢复必须选 mtime 最新的那一个，而不是
  // readdir 顺序里的第一个。
  it('【场景】多 backup 残留 【目的】恢复最新的 backup 【校验点】notes.json 内容 【预期】mtime 最新的被恢复', async () => {
    const older = path.join(tmpDir, '.notes.json.111.aabbccdd.bak');
    const newer = path.join(tmpDir, '.notes.json.222.eeff0011.bak');
    await fs.writeFile(older, 'older backup', 'utf8');
    await fs.writeFile(newer, 'newer backup', 'utf8');
    const past = new Date('2020-01-01T00:00:00Z');
    const recent = new Date('2024-01-01T00:00:00Z');
    await fs.utimes(older, past, past);
    await fs.utimes(newer, recent, recent);

    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));
    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    expect(await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8')).toBe(
      'newer backup'
    );
  });

  // E1：本地写失败（权限、输出路径是文件、磁盘满）必须包成指向输出目录的
  // 类型化错误，而不是上抛裸 EACCES/ENOENT——后者经 exitCodeFor 显示为网络
  // 失败，用户无从区分是磁盘问题还是网络问题。
  it('【场景】mkdir 失败 【目的】E1 本地写失败包错 【校验点】CliError code 3 + 消息含路径 【预期】类型化错误且路径可见', async () => {
    const mkdir = jest
      .spyOn(fs, 'mkdir')
      .mockRejectedValue(new Error('EACCES: permission denied'));
    const thrown = await writeJsonExport(
      { activeNotes: [], trashedNotes: [] },
      tmpDir
    ).catch((error) => error);
    mkdir.mockRestore();

    expect(thrown).toBeInstanceOf(CliError);
    expect((thrown as CliError).code).toBe(3);
    expect(thrown.message).toContain(tmpDir);
    expect(thrown.message).toContain('EACCES');
  });

  // E3：同一文件系统粒度内生成的两个 backup（mtime 相等）必须确定地恢复
  // 同一个，而不是依赖 readdir 的任意顺序——两次扫描同一目录必须同结果。
  it('【场景】两 backup mtime 相等 【目的】E3 确定性 tie-break 【校验点】notes.json 内容 【预期】名较大者被恢复', async () => {
    const a = path.join(tmpDir, '.notes.json.111.aabbccdd.bak');
    const b = path.join(tmpDir, '.notes.json.222.eeff0011.bak');
    await fs.writeFile(a, 'backup A', 'utf8');
    await fs.writeFile(b, 'backup B', 'utf8');
    const same = new Date('2024-06-01T12:00:00Z');
    await fs.utimes(a, same, same);
    await fs.utimes(b, same, same);

    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));
    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();

    expect(await fs.readFile(path.join(tmpDir, 'notes.json'), 'utf8')).toBe(
      'backup B'
    );
  });

  // E3：恢复 backup 失败是数据恢复事件（用户唯一的旧导出留在 .bak 里），
  // 必须 stderr 可见并指明位置，而不是淹没在 debug 日志里。
  it('【场景】恢复 backup 失败 【目的】E3 告警可见 【校验点】console.error 调用 【预期】含 backup 与 target 路径', async () => {
    const orphanBackup = path.join(tmpDir, '.notes.json.999.deadbeef.bak');
    await fs.writeFile(orphanBackup, 'last good export', 'utf8');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const rename = jest
      .spyOn(fs, 'rename')
      .mockRejectedValue(new Error('EACCES: permission denied'));

    const writeFile = jest
      .spyOn(fs, 'writeFile')
      .mockRejectedValue(new Error('ENOSPC: no space left on device'));
    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('ENOSPC');
    writeFile.mockRestore();
    rename.mockRestore();

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain(orphanBackup);
    expect(errorSpy.mock.calls[0][0]).toContain(
      path.join(tmpDir, 'notes.json')
    );
    errorSpy.mockRestore();
  });

  // F-11：commitAll 回滚期间的 rename 失败过去被静默吞掉——磁盘可能停在
  // "部分新部分旧"的混合状态而用户毫不知情，唯一的旧导出还留在 .bak 里。
  // 与 sweepStale 的恢复失败一样是数据恢复事件，必须 stderr 可见并指明
  // backup 位置，同时原错误仍按原路径抛出。
  it('【场景】回滚恢复失败 【目的】F-11 告警可见 【校验点】console.error + 主错误 【预期】告警含 target 路径且 EEXIST 仍抛出', async () => {
    // 第一次成功导出，留下旧 notes.json 供回滚恢复。
    await writeJsonExport(
      { activeNotes: [noteWithId('old', 'n0')], trashedNotes: [] },
      tmpDir
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // 第一次 rename（target -> backup）成功；此后（staging -> target，以及
    // 回滚中的 backup -> target）全部失败。
    const rename = jest
      .spyOn(fs, 'rename')
      .mockImplementationOnce(() => Promise.resolve())
      .mockRejectedValue(new Error('EEXIST: file already exists'));

    await expect(
      writeJsonExport(
        { activeNotes: [noteWithId('new', 'n1')], trashedNotes: [] },
        tmpDir
      )
    ).rejects.toThrow('EEXIST');

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain('rollback could not restore');
    expect(errorSpy.mock.calls[0][0]).toContain(
      path.join(tmpDir, 'notes.json')
    );
    rename.mockRestore();
    errorSpy.mockRestore();
  });

  // B-5：export 本地阶段的中断没有在途 fetch 可取消，必须按 artifact 检查
  // 进程级信号并转成 AbortedError —— 中断从"静默完成、exit 0"变为"exit 6"。
  it('【场景】本地写阶段收到中断信号 【目的】B-5 abort 传播 【校验点】异常类型/无产出 【预期】AbortedError 且不产出 notes.json', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    controller.abort();

    const thrown = await writeJsonExport(
      { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
      tmpDir
    ).catch((error) => error);
    setExternalAbortSignal(null);

    expect(thrown).toBeInstanceOf(AbortedError);
    await expect(
      fs.access(path.join(tmpDir, 'notes.json'))
    ).rejects.toBeTruthy();
  });

  // 入参边界：sweepStale 只识别自有 staging/backup 命名（pid.hex 中段），
  // 目录里的普通无后缀文件必须原样保留，不能因不含目标后缀之外的形态被误判。
  it('【场景】目录含普通文件 【目的】sweepStale 不误删无后缀文件 【校验点】random.txt 保留 【预期】普通文件原样存在', async () => {
    const userFile = path.join(tmpDir, 'random.txt');
    await fs.writeFile(userFile, 'data', 'utf8');
    const orphan = path.join(tmpDir, '.notes.json.999.deadbeef.part');
    await fs.writeFile(orphan, 'half a file', 'utf8');

    await writeJsonExport({ activeNotes: [], trashedNotes: [] }, tmpDir);

    await expect(fs.access(userFile)).resolves.toBeUndefined();
    await expect(fs.access(orphan)).rejects.toBeTruthy();
  });

  // 异常故障：清理目录不可读时 sweepStale 必须静默放弃（best-effort 契约），
  // 导出主流程照常完成，而不是被 EACCES 打断。
  it('【场景】目录不可读 【目的】清理失败不阻断导出 【校验点】导出完成 【预期】正常产出 notes.json', async () => {
    const readdir = jest
      .spyOn(fs, 'readdir')
      .mockRejectedValue(new Error('EACCES: permission denied'));

    try {
      await writeJsonExport({ activeNotes: [], trashedNotes: [] }, tmpDir);
    } finally {
      readdir.mockRestore();
    }

    await expect(
      fs.access(path.join(tmpDir, 'notes.json'))
    ).resolves.toBeUndefined();
  });

  // 异常故障：备份重命名被拒绝（非"无旧文件"）属于真实 IO 故障，必须向上
  // 抛出，而不是被当作"首次导出没有旧文件"静默吞掉。
  it('【场景】备份重命名被拒绝 【目的】非 ENOENT 错误向上抛 【校验点】异常 【预期】EACCES 抛出', async () => {
    await fs.writeFile(path.join(tmpDir, 'notes.json'), 'old', 'utf8');
    const rename = jest
      .spyOn(fs, 'rename')
      .mockRejectedValue(new Error('EACCES: permission denied'));

    try {
      await expect(
        writeJsonExport(
          { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
          tmpDir
        )
      ).rejects.toThrow('EACCES');
    } finally {
      rename.mockRestore();
    }
  });

  // 异常故障：回滚阶段删除半成品失败时，主错误照常抛出、告警走 stderr 可见
  // （包含 target 路径），不留静默的部分删除状态。commitAll 内 staging -> target
  // 发布失败才会进入回滚（writeJson 阶段失败时 backups 为空，无回滚可走）。
  it('【场景】回滚清理失败 【目的】告警可见且不吞主错误 【校验点】console.error 含 target 【预期】告警 + EEXIST 抛出', async () => {
    await writeJsonExport(
      { activeNotes: [noteWithId('old', 'n0')], trashedNotes: [] },
      tmpDir
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // 第一次 rename（target -> backup）成功入 backups；staging -> target 与
    // 回滚的 backup -> target 全部失败。
    const rename = jest
      .spyOn(fs, 'rename')
      .mockImplementationOnce(() => Promise.resolve())
      .mockRejectedValue(new Error('EEXIST: file already exists'));
    const rm = jest
      .spyOn(fs, 'rm')
      .mockRejectedValue(new Error('EACCES: permission denied'));

    let warnings: string[];
    try {
      await expect(
        writeJsonExport(
          { activeNotes: [noteWithId('new', 'n1')], trashedNotes: [] },
          tmpDir
        )
      ).rejects.toThrow('EEXIST');
      warnings = errorSpy.mock.calls.map((call) => String(call[0]));
    } finally {
      rename.mockRestore();
      rm.mockRestore();
      errorSpy.mockRestore();
    }

    expect(
      warnings.some((message) => message.includes('rollback could not remove'))
    ).toBe(true);
  });
});

describe('writeMarkdownExport', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simplenote-md-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('【场景】活动与回收站笔记分流 【目的】验证双目录发布 【校验点】active/trash 目录文件名 【预期】各归其位', async () => {
    const grouped = {
      activeNotes: [noteWithId('Active title\nbody', 'n1')],
      trashedNotes: [noteWithId('Trash title', 'n2')],
    };

    await writeMarkdownExport(grouped, tmpDir);

    expect(await fs.readdir(path.join(tmpDir, 'active'))).toEqual([
      'Active title.md',
    ]);
    expect(await fs.readdir(path.join(tmpDir, 'trash'))).toEqual([
      'Trash title.md',
    ]);
  });

  it('【场景】目标目录已有旧导出 【目的】验证整目录替换而非合并 【校验点】残留文件 【预期】旧文件消失', async () => {
    const activeDir = path.join(tmpDir, 'active');
    await fs.mkdir(activeDir, { recursive: true });
    await fs.writeFile(path.join(activeDir, 'ghost.md'), 'stale', 'utf8');

    await writeMarkdownExport(
      { activeNotes: [noteWithId('Fresh', 'n1')], trashedNotes: [] },
      tmpDir
    );

    expect(await fs.readdir(activeDir)).toEqual(['Fresh.md']);
  });

  it('【场景】大量同标题笔记 【目的】验证并发分区写入与命名去重 【校验点】文件数与唯一性 【预期】40 个互不覆盖文件', async () => {
    const notes = Array.from({ length: 40 }, (_, i) =>
      noteWithId(`Same title ${i % 2}`, `id-${i}`)
    );

    await writeMarkdownExport({ activeNotes: notes, trashedNotes: [] }, tmpDir);

    const files = await fs.readdir(path.join(tmpDir, 'active'));
    expect(files.length).toBe(40);
    expect(new Set(files).size).toBe(40);
  });

  it('【场景】成功导出后 【目的】验证无 staging/backup 残留 【校验点】根目录 .part/.bak 【预期】无', async () => {
    await writeMarkdownExport(
      { activeNotes: [noteWithId('a', 'n1')], trashedNotes: [] },
      tmpDir
    );

    expect(
      (await fs.readdir(tmpDir)).filter(
        (name) => name.endsWith('.part') || name.endsWith('.bak')
      )
    ).toEqual([]);
  });

  // 生命周期/时序：本地写盘阶段的 Ctrl-C 必须在每个文件之间被感知（而不是
  // 等到整个 artifact 写完后才检查）——中断落在多文件 markdown 导出中途时，
  // 已写文件保留、剩余文件停止、整体抛 AbortedError。
  it('【场景】导出中途收到中断 【目的】逐文件中止检查 【校验点】异常类型 【预期】AbortedError', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    const realWriteFile = fs.writeFile.bind(fs);
    const writeFile = jest.spyOn(fs, 'writeFile').mockImplementation((async (
      ...args: unknown[]
    ) => {
      controller.abort();
      await realWriteFile(
        args[0] as Parameters<typeof fs.writeFile>[0],
        args[1] as Parameters<typeof fs.writeFile>[1],
        args[2] as Parameters<typeof fs.writeFile>[2]
      );
    }) as unknown as typeof fs.writeFile);

    try {
      const thrown = await writeMarkdownExport(
        {
          activeNotes: [noteWithId('a', 'n1'), noteWithId('b', 'n2')],
          trashedNotes: [],
        },
        tmpDir
      ).catch((error) => error);

      expect(thrown).toBeInstanceOf(AbortedError);
    } finally {
      writeFile.mockRestore();
      setExternalAbortSignal(null);
    }
  });
});
