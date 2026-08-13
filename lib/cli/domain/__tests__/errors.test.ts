import {
  UsageError,
  AuthError,
  NetworkError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  AbortedError,
  PartialError,
  CliError,
  exitCodeFor,
  messageOf,
  EXIT_OK,
  EXIT_ARG,
  EXIT_AUTH,
  EXIT_NETWORK,
  EXIT_NOT_FOUND,
  EXIT_CONFLICT,
  EXIT_ABORTED,
  EXIT_PARTIAL,
  EXIT_UNKNOWN,
} from '../errors.ts';

describe('CliError exit-code mapping', () => {
  it('maps each typed error to its declared exit code', () => {
    expect(new UsageError('x').code).toBe(EXIT_ARG);
    expect(new AuthError('x').code).toBe(2);
    expect(new NetworkError('x').code).toBe(EXIT_NETWORK);
    // RateLimitError inherits NetworkError's exit code but is its own class
    // so batch callers can tell "rate limited" from "backend down".
    expect(new RateLimitError('x').code).toBe(EXIT_NETWORK);
    expect(new NotFoundError('x').code).toBe(4);
    expect(new ConflictError('x').code).toBe(5);
    expect(new AbortedError('x').code).toBe(6);
    expect(new PartialError('x').code).toBe(EXIT_PARTIAL);
  });

  it('exitCodeFor returns the CliError code', () => {
    expect(exitCodeFor(new UsageError('u'))).toBe(EXIT_ARG);
    expect(exitCodeFor(new PartialError('p'))).toBe(EXIT_PARTIAL);
  });

  it('exitCodeFor falls back to network (3) for untyped errors', () => {
    expect(exitCodeFor(new Error('boom'))).toBe(EXIT_NETWORK);
    expect(exitCodeFor('string')).toBe(EXIT_NETWORK);
  });

  it('typed errors are instances of CliError', () => {
    expect(new UsageError('x')).toBeInstanceOf(CliError);
    expect(new PartialError('x')).toBeInstanceOf(CliError);
  });
});

describe('CliError identity and Error semantics', () => {
  it('【场景】new.target 全部分支 【目的】验证子类命名 【校验点】name 属性 【预期】等于具体子类名', () => {
    expect(new UsageError('x').name).toBe('UsageError');
    expect(new AuthError('x').name).toBe('AuthError');
    expect(new NetworkError('x').name).toBe('NetworkError');
    expect(new RateLimitError('x').name).toBe('RateLimitError');
    expect(new NotFoundError('x').name).toBe('NotFoundError');
    expect(new ConflictError('x').name).toBe('ConflictError');
    expect(new AbortedError('x').name).toBe('AbortedError');
    expect(new PartialError('x').name).toBe('PartialError');
    expect(new CliError(0, 'x').name).toBe('CliError');
  });

  it('【场景】构造 Error 基类 【目的】验证 instanceof/message/stack 【校验点】继承关系与字段 【预期】真 Error 且带栈', () => {
    const error = new UsageError('bad args');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('bad args');
    expect(typeof error.stack).toBe('string');
  });

  it('【场景】code 与 message 分离 【目的】验证退出码独立承载 【校验点】code/message 双字段 【预期】互不混淆', () => {
    const error = new NetworkError('network down');
    expect(error.code).toBe(EXIT_NETWORK);
    expect(error.message).toBe('network down');
  });

  it('【场景】全量常量取值 【目的】防止退出码冲突 【校验点】九枚常量互不相同 【预期】无重复', () => {
    const codes = [
      EXIT_OK,
      EXIT_ARG,
      EXIT_AUTH,
      EXIT_NETWORK,
      EXIT_NOT_FOUND,
      EXIT_CONFLICT,
      EXIT_ABORTED,
      EXIT_PARTIAL,
      EXIT_UNKNOWN,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('messageOf', () => {
  it('【场景】Error 输入 【目的】验证取 .message 【校验点】返回值 【预期】等于 message 字段', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
    expect(messageOf(new CliError(3, 'net'))).toBe('net');
  });

  it('【场景】非 Error 输入 【目的】验证兜底字符串化不崩溃 【校验点】string/number/boolean/null/undefined/object 【预期】String() 语义', () => {
    expect(messageOf('oops')).toBe('oops');
    expect(messageOf(42)).toBe('42');
    expect(messageOf(false)).toBe('false');
    expect(messageOf(null)).toBe('null');
    expect(messageOf(undefined)).toBe('undefined');
    expect(messageOf({ a: 1 })).toBe('[object Object]');
  });
});

describe('exitCodeFor fallback', () => {
  it('【场景】全量 CliError 子类 【目的】验证每类错误映射声明码 【校验点】code 【预期】与常量一致', () => {
    expect(exitCodeFor(new UsageError('x'))).toBe(EXIT_ARG);
    expect(exitCodeFor(new AuthError('x'))).toBe(EXIT_AUTH);
    expect(exitCodeFor(new NetworkError('x'))).toBe(EXIT_NETWORK);
    expect(exitCodeFor(new RateLimitError('x'))).toBe(EXIT_NETWORK);
    expect(exitCodeFor(new NotFoundError('x'))).toBe(EXIT_NOT_FOUND);
    expect(exitCodeFor(new ConflictError('x'))).toBe(EXIT_CONFLICT);
    expect(exitCodeFor(new AbortedError('x'))).toBe(EXIT_ABORTED);
    expect(exitCodeFor(new PartialError('x'))).toBe(EXIT_PARTIAL);
  });

  it('【场景】非 CliError 输入 【目的】验证缺省兜底退出码 【校验点】Error/string/number/null/undefined/object 【预期】一律网络码 3', () => {
    expect(exitCodeFor(new Error('x'))).toBe(EXIT_NETWORK);
    expect(exitCodeFor('oops')).toBe(EXIT_NETWORK);
    expect(exitCodeFor(42)).toBe(EXIT_NETWORK);
    expect(exitCodeFor(null)).toBe(EXIT_NETWORK);
    expect(exitCodeFor(undefined)).toBe(EXIT_NETWORK);
    expect(exitCodeFor({ x: 1 })).toBe(EXIT_NETWORK);
  });

  it('【场景】CliError 直接实例 【目的】验证携带显式 code 【校验点】返回值 【预期】等于构造时传入的码', () => {
    expect(exitCodeFor(new CliError(9, 'custom'))).toBe(9);
  });
});
