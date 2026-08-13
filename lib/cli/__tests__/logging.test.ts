import { debug, isVerbose, setVerbose } from '../logging.ts';

describe('logging (verbose diagnostics)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setVerbose(false);
  });

  afterEach(() => {
    setVerbose(false);
    jest.restoreAllMocks();
  });

  it('【场景】verbose 关闭 【目的】诊断默认静默  【校验点】console.error 调用 【预期】debug 不输出任何内容', () => {
    debug('HTTP GET https://example.test/x');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(isVerbose()).toBe(false);
  });

  it('【场景】setVerbose(true) 后 【目的】诊断走 stderr 且带 [cli] 前缀  【校验点】console.error 入参 【预期】完整前缀行输出', () => {
    setVerbose(true);

    debug('HTTP GET https://example.test/x');

    expect(isVerbose()).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      '[cli] HTTP GET https://example.test/x'
    );
  });

  it('【场景】setVerbose(false) 复位后 【目的】开关可逆、无状态泄漏  【校验点】console.error 调用 【预期】再次静默', () => {
    setVerbose(true);
    setVerbose(false);

    debug('should be swallowed');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('【场景】多次 debug 调用 【目的】逐条输出互不覆盖  【校验点】调用次数与内容 【预期】每条均完整输出', () => {
    setVerbose(true);

    debug('first');
    debug('second');

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenNthCalledWith(1, '[cli] first');
    expect(errorSpy).toHaveBeenNthCalledWith(2, '[cli] second');
  });
});
