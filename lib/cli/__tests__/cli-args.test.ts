import {
  flagValues,
  hasBareFlag,
  hasFlag,
  parseContentSource,
  parseLimit,
  parseSingleValueFlag,
  parseTags,
  rejectExtraPositionals,
  takeFirstPositional,
  tokenize,
  unknownFlags,
} from '../cli-args.ts';
import { UsageError } from '../domain/errors.ts';

describe('flag helpers', () => {
  it('detects boolean flags', () => {
    expect(hasFlag(['--json'], 'json')).toBe(true);
    expect(hasFlag(['--jsonx'], 'json')).toBe(false);
    expect(hasFlag([], 'json')).toBe(false);
  });

  // `--json=1` used to be silently ignored (the value form never matched the
  // bare form), so the user asked for JSON and got tabular output instead.
  it('treats a valued boolean flag as present', () => {
    expect(hasFlag(['--json=1'], 'json')).toBe(true);
    expect(hasFlag(['--include-trashed=true'], 'include-trashed')).toBe(true);
    expect(hasFlag(['--json=1'], 'limit')).toBe(false);
  });

  it('collects repeated flags', () => {
    expect(flagValues(['--file=a', '--file=b'], 'file')).toEqual(['a', 'b']);
  });

  it('does not read flags from after a "--" terminator', () => {
    expect(hasFlag(['--', '--json'], 'json')).toBe(false);
  });

  it('returns an empty list for a repeated flag that is absent', () => {
    expect(flagValues([], 'file')).toEqual([]);
    expect(flagValues(['--json'], 'file')).toEqual([]);
    expect(flagValues(['--', '--file=x'], 'file')).toEqual([]);
  });
});

describe('hasBareFlag', () => {
  it('【场景】裸旗标/带值旗标/缺失 【目的】区分 bare 与 valued 形式 【校验点】布尔返回值 【预期】仅裸旗标为真', () => {
    expect(hasBareFlag(['--json'], 'json')).toBe(true);
    expect(hasBareFlag(['--json=1'], 'json')).toBe(false);
    expect(hasBareFlag(['--limit=5'], 'limit')).toBe(false);
    expect(hasBareFlag([], 'json')).toBe(false);
  });

  it('【场景】分隔符之后的旗标 【目的】避免把字面参数当旗标 【校验点】返回值 【预期】忽略', () => {
    expect(hasBareFlag(['--', '--limit'], 'limit')).toBe(false);
  });
});

describe('parseSingleValueFlag', () => {
  it('【场景】正常取值 【目的】单值旗标取值（含 = 号的值） 【校验点】返回值 【预期】完整值', () => {
    expect(parseSingleValueFlag(['--output=/tmp/a=b'], 'output', './out')).toBe(
      '/tmp/a=b'
    );
  });

  it('【场景】裸旗标无值 【目的】视为用法错误 【校验点】UsageError 【预期】消息含 requires a value', () => {
    expect(() => parseSingleValueFlag(['--format'], 'format', 'json')).toThrow(
      'requires a value'
    );
  });

  it('【场景】同一旗标重复 【目的】拒绝歧义 【校验点】UsageError 【预期】消息含 Provide --…= once', () => {
    expect(() =>
      parseSingleValueFlag(['--limit=5', '--limit=6'], 'limit', '20')
    ).toThrow('Provide --limit= once');
  });

  it('【场景】显式空值 【目的】空值不是请求默认 【校验点】UsageError 【预期】消息含 cannot be empty', () => {
    expect(() =>
      parseSingleValueFlag(['--output='], 'output', './out')
    ).toThrow('cannot be empty');
  });

  it('【场景】旗标缺省 【目的】返回 undefined 【校验点】返回值 【预期】undefined', () => {
    expect(parseSingleValueFlag([], 'format', 'json')).toBeUndefined();
  });
});

describe('tokenize', () => {
  it('splits flags from positionals', () => {
    expect(tokenize(['--json', 'n1', '--limit=2', 'extra'])).toEqual({
      flags: ['--json', '--limit=2'],
      positionals: ['n1', 'extra'],
      hasTerminator: false,
    });
  });

  it('treats everything after "--" as a positional', () => {
    expect(tokenize(['create', '--', '--looks-like-a-flag'])).toEqual({
      flags: [],
      positionals: ['create', '--looks-like-a-flag'],
      hasTerminator: true,
    });
  });
});

describe('parseLimit', () => {
  it('returns the fallback when the flag is absent', () => {
    expect(parseLimit([], 20)).toBe(20);
  });

  it('parses a positive integer', () => {
    expect(parseLimit(['--limit=5'], 20)).toBe(5);
  });

  // Previously each of these silently fell back to the default, so
  // `list --limit=0` printed 20 notes and looked like it had worked.
  it.each([
    ['--limit=abc'],
    ['--limit=0'],
    ['--limit=-3'],
    ['--limit='],
    ['--limit=2.5'],
  ])('rejects %s as a usage error', (arg) => {
    let thrown: unknown;
    try {
      parseLimit([arg], 20);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UsageError);
    expect((thrown as UsageError).code).toBe(1);
    expect((thrown as UsageError).message).toContain('positive integer');
  });

  it('rejects a bare --limit because it carries no value', () => {
    expect(() => parseLimit(['--limit'], 20)).toThrow(
      '--limit requires a value'
    );
  });

  it('rejects a repeated --limit= flag instead of keeping the first value', () => {
    expect(() => parseLimit(['--limit=5', '--limit=10'], 20)).toThrow(
      'Provide --limit= once'
    );
  });

  it('does not count a --limit after a "--" terminator as a duplicate', () => {
    expect(parseLimit(['--limit=5', '--', '--limit=10'], 20)).toBe(5);
  });

  // Number() coerces "0x10" (16), "1e3" (1000), " 5 " (5) and "5.0" (5) into
  // integers, so `Number.isInteger` alone used to let these through as if the
  // user had asked for that value. A positive integer is decimal digits only.
  it.each([
    ['--limit=0x10'],
    ['--limit=1e3'],
    ['--limit= 5 '],
    ['--limit=5.0'],
    ['--limit=+7'],
  ])('rejects %s as a usage error', (arg) => {
    expect(() => parseLimit([arg], 20)).toThrow(
      '--limit must be a positive integer'
    );
  });

  it('still accepts leading-zero forms it previously accepted', () => {
    expect(parseLimit(['--limit=007'], 20)).toBe(7);
  });

  it('ignores a --limit after a "--" terminator', () => {
    expect(parseLimit(['--', '--limit=5'], 20)).toBe(20);
  });
});

describe('unknownFlags', () => {
  it('accepts declared bare and valued flags', () => {
    expect(unknownFlags(['--json', '--limit=5'], ['json', 'limit'])).toEqual(
      []
    );
  });

  it('reports a typo instead of ignoring it', () => {
    expect(unknownFlags(['--limt=5'], ['json', 'limit'])).toEqual(['--limt=5']);
  });

  it('ignores positionals and anything after "--"', () => {
    expect(unknownFlags(['n1', '--', '--whatever'], ['json'])).toEqual([]);
  });

  it('accepts the valued form of a declared flag', () => {
    expect(unknownFlags(['--json=1'], ['json'])).toEqual([]);
    expect(unknownFlags(['--limit=5'], ['limit'])).toEqual([]);
  });
});

describe('takeFirstPositional', () => {
  it('finds the positional after leading flags', () => {
    expect(takeFirstPositional(['--json', 'n1', '--limit=2'])).toEqual({
      value: 'n1',
      rest: ['--json', '--limit=2'],
    });
  });

  it('finds the positional before trailing flags', () => {
    expect(takeFirstPositional(['n1', '--json'])).toEqual({
      value: 'n1',
      rest: ['--json'],
    });
  });

  it('removes only the first positional', () => {
    expect(takeFirstPositional(['n1', 'content'])).toEqual({
      value: 'n1',
      rest: ['content'],
    });
  });

  it('reports no value when every argument is a flag', () => {
    expect(takeFirstPositional(['--json'])).toEqual({ rest: ['--json'] });
  });

  it('re-inserts the "--" terminator so the remainder re-tokenizes losslessly', () => {
    expect(takeFirstPositional(['--', 'n1', '--dashed content'])).toEqual({
      value: 'n1',
      rest: ['--', '--dashed content'],
    });
  });

  it('drops an inert terminator once no literal positional remains', () => {
    expect(takeFirstPositional(['--json', '--', 'n1'])).toEqual({
      value: 'n1',
      rest: ['--json'],
    });
  });
});

describe('parseContentSource', () => {
  it('accepts a positional', () => {
    expect(parseContentSource(['hello'], 'create', 'content')).toEqual({
      content: 'hello',
      fromFile: false,
    });
  });

  it('accepts --content= and --file=', () => {
    expect(parseContentSource(['--content=x'], 'create', 'content')).toEqual({
      content: 'x',
      fromFile: false,
    });
    expect(
      parseContentSource(['--file=/tmp/x'], 'edit', 'new content')
    ).toEqual({ content: '/tmp/x', fromFile: true });
  });

  it('rejects zero sources with a usage error (exit 1)', () => {
    let thrown: unknown;
    try {
      parseContentSource([], 'create', 'content');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UsageError);
    expect((thrown as UsageError).code).toBe(1);
    expect((thrown as UsageError).message).toContain('create requires content');
  });

  it('rejects more than one source', () => {
    expect(() =>
      parseContentSource(['x', '--content=y'], 'edit', 'new content')
    ).toThrow('Provide the new content once');
  });

  // `--content=a --content=b` used to keep only "a" and silently throw "b"
  // away; the same flag twice is almost always a shell-expansion or editing
  // mistake, and guessing which value won can create the wrong note.
  it('rejects a repeated --content= flag instead of keeping the first value', () => {
    expect(() =>
      parseContentSource(['--content=a', '--content=b'], 'create', 'content')
    ).toThrow('--content= appears twice');
  });

  it('rejects a repeated --file= flag instead of keeping the first value', () => {
    expect(() =>
      parseContentSource(
        ['--file=/tmp/a', '--file=/tmp/b'],
        'create',
        'content'
      )
    ).toThrow('--file= appears twice');
  });

  // `create hello world` (unquoted) used to keep "hello" and throw the rest
  // away, silently creating the wrong note.
  it('rejects unquoted multi-word content instead of dropping words', () => {
    expect(() =>
      parseContentSource(['hello', 'world'], 'create', 'content')
    ).toThrow('quote multi-word content');
  });

  it('accepts flag-looking content after a "--" terminator', () => {
    expect(
      parseContentSource(['--', '--not-a-flag'], 'create', 'content')
    ).toEqual({ content: '--not-a-flag', fromFile: false });
  });

  // M-01: everything after `--` is literal by contract, so unquoted multi-word
  // content there folds into one string instead of tripping the "quote
  // multi-word" guard (which exists to catch *forgotten* quotes, not explicit
  // literal intent).
  it('joins unquoted multi-word content after a "--" terminator', () => {
    expect(
      parseContentSource(['--', 'a', 'b', 'c'], 'create', 'content')
    ).toEqual({ content: 'a b c', fromFile: false });
  });

  it('still rejects multi-word content before a "--" terminator', () => {
    expect(() =>
      parseContentSource(
        ['hello', 'world', '--', 'literal'],
        'create',
        'content'
      )
    ).toThrow('quote multi-word content');
  });

  // `--file=` used to fall through to readContentSource, which reported a
  // confusing "Cannot read --file=: ENOENT" for a path the user never wrote.
  it('rejects an empty --content= value instead of treating it as blank text', () => {
    expect(() =>
      parseContentSource(['--content='], 'create', 'content')
    ).toThrow('--content= cannot be empty');
  });

  it('rejects an empty --file= value instead of attempting to read ""', () => {
    expect(() =>
      parseContentSource(['--file='], 'edit', 'new content')
    ).toThrow('--file= cannot be empty');
  });
});

describe('parseTags', () => {
  it('trims and drops blanks', () => {
    expect(parseTags(['--tags=a, b ,,c'])).toEqual(['a', 'b', 'c']);
  });

  it('defaults to an empty list', () => {
    expect(parseTags([])).toEqual([]);
  });

  it('collapses a blank-only list to an empty list', () => {
    expect(parseTags(['--tags= ,  ,'])).toEqual([]);
  });

  // B.4：空白/逗号 tag 无法被 tag: 查询找回（模式 `[^\s,]+`），是输入错误。
  it('rejects a tag containing whitespace or a comma', () => {
    expect(() => parseTags(['--tags=a\nb'])).toThrow('whitespace or a comma');
    expect(() => parseTags(['--tags=ok,a\rb'])).toThrow(
      'whitespace or a comma'
    );
    // An internal space is a separator in the desktop app, so a value like
    // `a b` would be created here but never searchable — reject it too.
    expect(() => parseTags(['--tags=a b'])).toThrow('whitespace or a comma');
  });

  // B.5：重复 tag 去重，`--tags=a,a` 与 `--tags=a` 是同一笔记。
  it('de-duplicates repeated tags', () => {
    expect(parseTags(['--tags=a,a,b,a'])).toEqual(['a', 'b']);
  });

  // `--tags=a --tags=b` used to keep only the first value; parsing once,
  // loudly, beats guessing which tag set the user meant.
  it('rejects a repeated --tags= flag instead of keeping the first value', () => {
    expect(() => parseTags(['--tags=a', '--tags=b'])).toThrow(
      'Provide --tags= once'
    );
  });
});

describe('rejectExtraPositionals', () => {
  it('accepts the expected number of positionals', () => {
    expect(() => rejectExtraPositionals(['--json'], 'list', 0)).not.toThrow();
    expect(() =>
      rejectExtraPositionals(['id', '--json'], 'show', 1)
    ).not.toThrow();
  });

  // `show n1 n2` and `list extra` used to silently drop the extra word.
  it('rejects more positionals than the command takes', () => {
    expect(() => rejectExtraPositionals(['extra'], 'list', 0)).toThrow(
      UsageError
    );
    expect(() => rejectExtraPositionals(['n1', 'n2'], 'show', 1)).toThrow(
      'Too many arguments for show'
    );
  });

  it('counts arguments after a "--" terminator as positionals', () => {
    expect(() => rejectExtraPositionals(['--', 'x'], 'list', 0)).toThrow(
      UsageError
    );
  });

  it('counts positionals the caller already consumed', () => {
    // show consumes the note id (1 positional), so "n2" makes the total 2.
    expect(() => rejectExtraPositionals(['n2'], 'show', 0, 1)).toThrow(
      'Too many arguments for show: got 2, expected at most 1'
    );
  });
});
