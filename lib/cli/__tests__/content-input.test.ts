jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import { readContentSource } from '../content-input.ts';
import { UsageError } from '../domain/errors.ts';

// ---------------------------------------------------------------------------
// readContentSource：把解析出的内容源（内联 or --file=）落地为真实文本。
// --file 读取失败是“命令行错误”，故映射为 UsageError(1) 而非 NetworkError(3)。
// 七大维度：入参边界 / 分支逻辑 / 异常故障（IO）。
// ---------------------------------------------------------------------------

describe('readContentSource', () => {
  beforeEach(() => {
    (fs.readFile as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('【场景】内联内容（fromFile=false）  【目的】直接返回、零 IO  【校验点】返回值与是否触碰 fs  【预期】返回原内容且 readFile 未被调用', async () => {
    const out = await readContentSource({
      content: 'inline text',
      fromFile: false,
    });
    expect(out).toBe('inline text');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('【场景】空内联内容  【目的】原样透传  【校验点】返回值  【预期】空串', async () => {
    const out = await readContentSource({ content: '', fromFile: false });
    expect(out).toBe('');
  });

  it('【场景】--file 指向可读文件  【目的】按 utf8 读取  【校验点】读取路径与编码  【预期】返回文件内容', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('file body\nline2');
    const out = await readContentSource({
      content: '/tmp/x.md',
      fromFile: true,
    });
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/x.md', 'utf8');
    expect(out).toBe('file body\nline2');
  });

  it('【场景】--file 路径不存在/不可读  【目的】归为 usage 错误  【校验点】异常类型/消息含路径  【预期】抛 UsageError 且消息含路径', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(
      Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
    );
    let thrown: unknown;
    try {
      await readContentSource({ content: '/missing/x.md', fromFile: true });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UsageError);
    expect((thrown as UsageError).code).toBe(1);
    expect((thrown as Error).message).toContain('/missing/x.md');
    expect((thrown as Error).message).toContain('Cannot read --file=');
  });

  it('【场景】--file 读取抛非 Error 对象  【目的】messageOf 兜底  【校验点】不崩溃  【预期】仍抛 UsageError', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue('string failure');
    await expect(
      readContentSource({ content: '/x', fromFile: true })
    ).rejects.toBeInstanceOf(UsageError);
  });
});
