/**
 * bootstrap.ts is the executable entry point: importing it runs `main()` and
 * wires the outcome — or an unexpected failure — into `process.exit`.
 *
 * This suite never lets a real timer or a real `process.exit` fire. `main`
 * and `flushStdio` are controlled through mocks, and `setTimeout` is replaced
 * with a capture so the "exit after the event loop goes idle" behaviour can be
 * asserted deterministically.
 */
jest.mock('../app.ts', () => {
  const actual = jest.requireActual('../app.ts') as typeof import('../app.ts');
  return {
    ...actual,
    main: jest.fn(),
    flushStdio: jest.fn(),
  };
});

import { flushStdio as mockFlushStdio, main as mockMain } from '../app.ts';
import { EXIT_OK, EXIT_UNKNOWN } from '../domain/errors.ts';

type CapturedTimer = { fn: () => void; ms: number };
let captured: CapturedTimer[];
const realSetTimeout = global.setTimeout.bind(global);

/**
 * Drains the microtask chain started by `main()` without touching timers.
 * The real `setTimeout` captured at load time is used (jsdom has no
 * `setImmediate`), and a 0ms timer fires only after the microtask queue is
 * empty — by then both the success chain (`main().then(exitWhenIdle)`) and
 * the failure chain (`catch(async ...)` with its awaited `flushStdio`)
 * have settled.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => realSetTimeout(resolve, 0));
}

beforeEach(() => {
  captured = [];
  (mockMain as jest.Mock).mockReset();
  (mockMain as jest.Mock).mockResolvedValue(EXIT_OK);
  (mockFlushStdio as jest.Mock).mockReset();
  (mockFlushStdio as jest.Mock).mockResolvedValue(undefined);

  // jsdom's setTimeout returns a number (no unref()); bootstrap relies on
  // `setTimeout(...).unref()` to leave the event loop free. Capture the
  // callback instead of scheduling it, so the exit path is fully controlled.
  global.setTimeout = ((fn: (...args: unknown[]) => void, ms?: number) => {
    captured.push({ fn: fn as () => void, ms: ms ?? 0 });
    return {
      unref: () => {},
      ref: () => {},
      hasRef: () => false,
    } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
});

afterEach(() => {
  global.setTimeout = realSetTimeout;
  process.exitCode = undefined;
  jest.restoreAllMocks();
});

describe('bootstrap entry point', () => {
  it('【场景】main 正常完成 【目的】验证优雅退出编排 【校验点】main 调用次数/定时器参数/process.exit 【预期】以返回值调度 exit', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const code = 4;
    (mockMain as jest.Mock).mockResolvedValue(code);

    jest.isolateModules(() => {
      require('../bootstrap.ts');
    });
    await settle();

    expect(mockMain).toHaveBeenCalledTimes(1);
    expect(mockMain).toHaveBeenCalledWith();
    expect(captured).toHaveLength(1);
    // 默认宽限期：仅在事件循环确实非空时才强制退出。
    expect(captured[0].ms).toBe(250);
    expect(process.exitCode).toBeUndefined();

    captured[0].fn();
    expect(exitSpy).toHaveBeenCalledWith(code);
  });

  it('【场景】main 抛出 Error 【目的】验证兜底上报与退出码 【校验点】stderr 内容/exitCode/定时器 【预期】99 并调度退出', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    (mockMain as jest.Mock).mockRejectedValue(new Error('boom'));

    jest.isolateModules(() => {
      require('../bootstrap.ts');
    });
    await settle();
    await settle();

    expect(errorSpy).toHaveBeenCalledWith('Unexpected error: boom');
    expect(process.exitCode).toBe(EXIT_UNKNOWN);
    expect(mockFlushStdio).toHaveBeenCalledTimes(1);
    expect(captured).toHaveLength(1);
    expect(captured[0].ms).toBe(250);

    captured[0].fn();
    expect(exitSpy).toHaveBeenCalledWith(EXIT_UNKNOWN);
  });

  it('【场景】main 抛出非 Error 值 【目的】验证 messageOf 兜底字符串化 【校验点】stderr 文案 【预期】不崩溃且输出字符串', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockMain as jest.Mock).mockRejectedValue('raw string failure');

    jest.isolateModules(() => {
      require('../bootstrap.ts');
    });
    await settle();
    await settle();

    expect(errorSpy).toHaveBeenCalledWith(
      'Unexpected error: raw string failure'
    );
  });

  it('【场景】flushStdio 挂起未完成 【目的】验证失败兜底先排空 stdio 再调度退出 【校验点】定时器捕获时机/调用顺序 【预期】排空完成后才捕获 exit 定时器', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let releaseFlush: (value: unknown) => void = () => {};
    (mockFlushStdio as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        releaseFlush = resolve;
      })
    );
    (mockMain as jest.Mock).mockRejectedValue(new Error('boom'));

    jest.isolateModules(() => {
      require('../bootstrap.ts');
    });
    await settle();

    // flushStdio 尚未完成 → 退出定时器不得提前调度。
    expect(captured).toHaveLength(0);
    expect(process.exitCode).toBe(EXIT_UNKNOWN);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    releaseFlush(undefined);
    await settle();
    await settle();

    expect(captured).toHaveLength(1);
    expect(captured[0].ms).toBe(250);
  });

  it('【场景】成功退出也先排空 stdio 外的不确定状态 【目的】确认成功路径不触碰 stderr 【校验点】console.error 未被调用 【预期】静默退出', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockMain as jest.Mock).mockResolvedValue(EXIT_OK);

    jest.isolateModules(() => {
      require('../bootstrap.ts');
    });
    await settle();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(mockFlushStdio).not.toHaveBeenCalled();
  });
});
