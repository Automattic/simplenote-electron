jest.mock('../note-source.ts', () => ({
  createNoteSource: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import * as fs from 'fs/promises';
import { createNoteSource } from '../note-source.ts';
import { createCommand, parseCreateOptions } from '../commands/create.ts';
import type { Credentials } from '../domain/types.ts';

const mockCreate = jest.fn();
const mockSource = {
  create: mockCreate,
};

const credentials: Credentials = {
  access_token: 'tok',
  username: 'user@example.com',
};

describe('parseCreateOptions', () => {
  it('uses the positional content', () => {
    expect(parseCreateOptions(['hello world'])).toEqual({
      content: 'hello world',
      fromFile: false,
      tags: [],
      json: false,
    });
  });

  it('parses --content=', () => {
    expect(parseCreateOptions(['--content=hello'])).toEqual({
      content: 'hello',
      fromFile: false,
      tags: [],
      json: false,
    });
  });

  it('parses --file=', () => {
    expect(parseCreateOptions(['--file=/tmp/x.md'])).toEqual({
      content: '/tmp/x.md',
      fromFile: true,
      tags: [],
      json: false,
    });
  });

  it('parses --tags and --json', () => {
    expect(parseCreateOptions(['x', '--tags=a, b ,c', '--json'])).toEqual({
      content: 'x',
      fromFile: false,
      tags: ['a', 'b', 'c'],
      json: true,
    });
  });

  it('throws when no content source is provided', () => {
    expect(() => parseCreateOptions([])).toThrow('create requires content');
  });

  it('throws when multiple content sources are provided', () => {
    expect(() => parseCreateOptions(['x', '--content=y'])).toThrow(
      'Provide the content once'
    );
  });

  it('throws when --tags has no value', () => {
    // `--tags` without `=` used to fold into an empty array and create a note
    // with no tags at all, silently dropping the user's intent.
    expect(() => parseCreateOptions(['x', '--tags'])).toThrow(
      '--tags requires a value, e.g. --tags=a,b'
    );
  });

  it('throws when --file has no value', () => {
    expect(() => parseCreateOptions(['x', '--file'])).toThrow(
      '--file requires a value, e.g. --file=notes.json'
    );
  });
});

describe('createCommand', () => {
  beforeEach(() => {
    (createNoteSource as jest.Mock).mockReturnValue(mockSource);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockCreate.mockReset();
  });

  it('creates a note and prints its id', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await createCommand(credentials, ['hello world']);

    expect(createNoteSource).toHaveBeenCalledWith('tok');
    expect(mockCreate).toHaveBeenCalledWith({
      content: 'hello world',
      tags: [],
    });
    expect(logSpy).toHaveBeenCalledWith('n1');
  });

  it('passes tags through', async () => {
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await createCommand(credentials, ['x', '--tags=work,home']);

    expect(mockCreate).toHaveBeenCalledWith({
      content: 'x',
      tags: ['work', 'home'],
    });
  });

  it('reads content from a file', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('file content');
    mockCreate.mockResolvedValue({ id: 'n1', version: 1 });

    await createCommand(credentials, ['--file=/tmp/x.md']);

    expect(fs.readFile).toHaveBeenCalledWith('/tmp/x.md', 'utf8');
    expect(mockCreate).toHaveBeenCalledWith({
      content: 'file content',
      tags: [],
    });
  });

  it('prints JSON output when --json is passed', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockResolvedValue({ id: 'n1', version: 3 });

    await createCommand(credentials, ['x', '--json']);

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'n1', version: 3 })
    );
  });

  it('rejects blank content', async () => {
    await expect(createCommand(credentials, ['   '])).rejects.toThrow('blank');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a bare --tags without touching the network', async () => {
    await expect(createCommand(credentials, ['x', '--tags'])).rejects.toThrow(
      '--tags requires a value'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a bare --file without touching the network', async () => {
    await expect(createCommand(credentials, ['x', '--file'])).rejects.toThrow(
      '--file requires a value'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects when create rejects', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));

    await expect(createCommand(credentials, ['x'])).rejects.toThrow('boom');
  });
});
