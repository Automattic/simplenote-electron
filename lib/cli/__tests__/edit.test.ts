jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import { createNoteSource } from '../note-source.ts';
import { editCommand, parseEditOptions } from '../commands/edit.ts';
import type { Credentials } from '../domain/types.ts';

const mockUpdate = jest.fn();
const mockSource = {
  update: mockUpdate,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('parseEditOptions', () => {
  it('uses the positional content', () => {
    expect(parseEditOptions(['hello world'])).toEqual({
      content: 'hello world',
      fromFile: false,
      json: false,
    });
  });

  it('parses --content=', () => {
    expect(parseEditOptions(['--content=hello'])).toEqual({
      content: 'hello',
      fromFile: false,
      json: false,
    });
  });

  it('parses --file=', () => {
    expect(parseEditOptions(['--file=/tmp/x.md'])).toEqual({
      content: '/tmp/x.md',
      fromFile: true,
      json: false,
    });
  });

  it('detects --json', () => {
    expect(parseEditOptions(['x', '--json']).json).toBe(true);
  });

  it('throws when no content source is provided', () => {
    expect(() => parseEditOptions([])).toThrow('edit requires new content');
  });

  it('throws when multiple content sources are provided', () => {
    expect(() => parseEditOptions(['x', '--content=y'])).toThrow(
      'Provide the new content once'
    );
  });

  it('throws a precise message when --content has no value', () => {
    // A bare `--content` is a forgotten value, not an absent content source;
    // the error names the flag instead of saying "requires new content".
    expect(() => parseEditOptions(['n1', '--content'])).toThrow(
      '--content requires a value, e.g. --content=new content'
    );
  });

  it('throws a precise message when --file has no value', () => {
    expect(() => parseEditOptions(['n1', '--file'])).toThrow(
      '--file requires a value, e.g. --file=notes.json'
    );
  });
});

describe('editCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockUpdate.mockReset();
  });

  it('updates the note content', async () => {
    mockUpdate.mockResolvedValue({ version: 5 });

    await editCommand(credentials, ['n1', 'new content']);

    expect(createNoteSource).toHaveBeenCalledWith('tok');
    expect(mockUpdate).toHaveBeenCalledWith('n1', 'new content');
  });

  it('prints the version in json mode', async () => {
    mockUpdate.mockResolvedValue({ version: 5 });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await editCommand(credentials, ['n1', 'x', '--json']);

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'n1', version: 5 })
    );
  });

  it('reads content from a file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('file content');
    mockUpdate.mockResolvedValue({ version: 2 });

    await editCommand(credentials, ['n1', '--file=/tmp/x.md']);

    expect(fs.readFile).toHaveBeenCalledWith('/tmp/x.md', 'utf8');
    expect(mockUpdate).toHaveBeenCalledWith('n1', 'file content');
  });

  it('accepts flags before the note id', async () => {
    mockUpdate.mockResolvedValue({ version: 5 });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await editCommand(credentials, ['--json', 'n1', 'new content']);

    expect(mockUpdate).toHaveBeenCalledWith('n1', 'new content');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'n1', version: 5 })
    );
  });

  it('throws when the note id is missing', async () => {
    await expect(editCommand(credentials, [])).rejects.toThrow(
      'edit requires a note id'
    );
  });

  it('rejects blank content', async () => {
    await expect(editCommand(credentials, ['n1', '   '])).rejects.toThrow(
      'blank'
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects when update rejects', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'));

    await expect(editCommand(credentials, ['n1', 'x'])).rejects.toThrow('boom');
  });
});
