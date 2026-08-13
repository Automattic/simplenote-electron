jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

import { createNoteSource } from '../note-source.ts';
import { showCommand } from '../commands/show.ts';
import type { Credentials } from '../domain/types.ts';

const mockGet = jest.fn();
const mockSource = {
  get: mockGet,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('showCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGet.mockReset();
  });

  it('prints the note content as markdown text', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGet.mockResolvedValue({
      id: 'n1',
      data: { content: '# Title\n\nbody text' },
    });

    await showCommand(credentials, ['n1']);

    expect(logSpy).toHaveBeenCalledWith('# Title\n\nbody text');
    expect(mockGet).toHaveBeenCalledWith('n1');
  });

  it('prints the full object as JSON when --json is passed', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const note = { id: 'n1', data: { content: 'x' } };
    mockGet.mockResolvedValue(note);

    await showCommand(credentials, ['n1', '--json']);

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(note, null, 2));
  });

  it('accepts the note id after a flag', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const note = { id: 'n1', data: { content: 'x' } };
    mockGet.mockResolvedValue(note);

    await showCommand(credentials, ['--json', 'n1']);

    expect(mockGet).toHaveBeenCalledWith('n1');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(note, null, 2));
  });

  it('throws when no note id is provided', async () => {
    await expect(showCommand(credentials, [])).rejects.toThrow(
      'show requires a note id'
    );
  });

  it('throws when the note does not exist', async () => {
    mockGet.mockResolvedValue(null);

    await expect(showCommand(credentials, ['nope'])).rejects.toThrow(
      'Note not found: nope'
    );
  });

  // `show n1 n2` used to fetch n1 and silently ignore n2.
  it('rejects a second positional argument', async () => {
    await expect(showCommand(credentials, ['n1', 'n2'])).rejects.toThrow(
      'Too many arguments for show'
    );
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('rejects when the source rejects', async () => {
    mockGet.mockRejectedValue(new Error('boom'));

    await expect(showCommand(credentials, ['n1'])).rejects.toThrow('boom');
  });

  it('【场景】展示回收站内笔记（非 JSON 模式） 【目的】验证垃圾箱告警 【校验点】stderr 告警与 stdout 正文 【预期】告警+内容均输出', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockResolvedValue({
      id: 'n1',
      data: { content: 'x', deleted: true },
    });

    await showCommand(credentials, ['n1']);

    expect(errorSpy).toHaveBeenCalledWith(
      'Warning: this note is in the trash.'
    );
    expect(logSpy).toHaveBeenCalledWith('x');
  });

  it('【场景】展示回收站笔记且 --json 【目的】验证机器可读输出不被告警污染 【校验点】stderr 【预期】无告警', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockResolvedValue({
      id: 'n1',
      data: { content: 'x', deleted: 1 },
    });

    await showCommand(credentials, ['n1', '--json']);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('【场景】笔记无 content 字段 【目的】验证空内容兜底 【校验点】stdout 【预期】输出空行', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGet.mockResolvedValue({ id: 'n1', data: {} });

    await showCommand(credentials, ['n1']);

    expect(logSpy).toHaveBeenCalledWith('');
  });
});
