import {
  httpRequest,
  isExternalAborted,
  retryAfterMs,
  setExternalAbortSignal,
  DEFAULT_TIMEOUT_MS,
} from '../http.ts';
import { AbortedError, NetworkError } from '../../domain/errors.ts';
import { MAX_BACKOFF_MS, MAX_RETRY_AFTER_MS } from '../../cli-constants.ts';
import { setVerbose } from '../../logging.ts';

function response(
  status: number,
  init: { body?: string; headers?: Record<string, string> } = {}
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(init.headers ?? {}),
    text: () => Promise.resolve(init.body ?? ''),
  } as unknown as Response;
}

describe('httpRequest', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setExternalAbortSignal(null);
    setVerbose(false);
    delete process.env.SIMPLENOTE_CLI_TIMEOUT_MS;
    delete process.env.SIMPLENOTE_CLI_DEBUG;
  });

  it('【场景】verbose 开启时重试路径 【目的】诊断日志覆盖请求/状态/退避 【校验点】console.error 内容 【预期】含 [cli] 前缀与 backoff 信息，stdout 不受影响', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setVerbose(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const res = await httpRequest('https://example.test/x', {}, { retries: 2 });

    expect(res.status).toBe(200);
    const calls = errorSpy.mock.calls.map((call) => String(call[0]));
    expect(
      calls.some((line) =>
        line.includes('[cli] HTTP GET https://example.test/x')
      )
    ).toBe(true);
    expect(
      calls.some((line) => line.includes('HTTP 503 https://example.test/x'))
    ).toBe(true);
    expect(
      calls.some((line) => line.includes('is retryable; backing off'))
    ).toBe(true);
    expect(
      calls.some((line) => line.includes('HTTP 200 https://example.test/x'))
    ).toBe(true);
  });

  it('【场景】verbose 关闭 【目的】诊断默认静默、行为零侵入 【校验点】console.error 调用 【预期】无 [cli] 输出', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValue(response(200));

    await httpRequest('https://example.test/x', {}, { retries: 1 });

    expect(
      errorSpy.mock.calls.some((call) => String(call[0]).startsWith('[cli]'))
    ).toBe(false);
  });

  it('attaches an abort signal to every request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(200));

    await httpRequest('https://example.test/x', { method: 'GET' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('instructs fetch to reject redirects instead of following them', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(200));

    await httpRequest('https://example.test/x', {});

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init as RequestInit).redirect).toBe('error');
  });

  // 入参边界：`Retry-After` 既非 delay-seconds 也非可解析日期（如 `abc`）
  // 时必须回落本地退避（null），而不是把 NaN 当退避时长写进 setTimeout。
  it('falls back to local backoff when Retry-After is unparseable', () => {
    expect(
      retryAfterMs(new Headers({ 'retry-after': 'not-a-date' }))
    ).toBeNull();
  });

  // 异常故障：防御性兜底——mock 出的 Response 缺 `text` 方法时按空 body
  // 处理，而不是 TypeError 打断重试/分页。
  it('tolerates a response object without a text method', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
    } as unknown as Response);

    const res = await httpRequest('https://example.test/x');

    expect(await res.text()).toBe('');
  });

  // 异常故障：fetch 以 AbortError 拒绝但没有任何信号中止（模拟底层实现把
  // 故障包装成 AbortError）——按「取消」分类（exit 6），而不是超时或传输错。
  it('reports a plain AbortError rejection as a cancellation', async () => {
    const error = new Error('boom');
    error.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValue(error);

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 1 })
    ).rejects.toThrow('was cancelled');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // 时序/资源：可重试状态在手、但退避会把整体预算拖过 deadline——再开一次
  // 请求已知无法完成，必须立即交出最后的状态错误而不是白等一程退避。
  it('gives up on a retryable response when the backoff would outrun the budget', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(503, { headers: { 'retry-after': '30' } })
    );

    await expect(
      httpRequest(
        'https://example.test/x',
        {},
        { retries: 3, deadlineAt: Date.now() + 20 }
      )
    ).rejects.toThrow('failed: HTTP 503');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // 时序/资源：transport 错误同样受整体预算约束——剩余预算不足时停止重试，
  // 交出已捕获的传输错误而不是继续开新 socket。
  it('stops retrying a transport error once the budget is exhausted', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      httpRequest(
        'https://example.test/x',
        {},
        { retries: 3, deadlineAt: Date.now() + 20 }
      )
    ).rejects.toThrow('ECONNRESET');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('aborts and reports a timeout when the request outlives the deadline', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    const promise = httpRequest(
      'https://example.test/x',
      {},
      { timeoutMs: 20 }
    );

    await expect(promise).rejects.toThrow('timed out after 20ms');
    await expect(promise).rejects.toBeInstanceOf(NetworkError);
  });

  it('does not retry by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(503));

    const res = await httpRequest('https://example.test/x');

    expect(res.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable status and returns the eventual success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));

    const res = await httpRequest('https://example.test/x', {}, { retries: 2 });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry a plain 500, which is rarely transient', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(500));

    const res = await httpRequest('https://example.test/x', {}, { retries: 2 });

    expect(res.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget and surfaces the last status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response(429));

    const res = await httpRequest('https://example.test/x', {}, { retries: 2 });

    // The final attempt is returned rather than thrown, so the caller keeps
    // ownership of status-to-error mapping.
    expect(res.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('retries transport errors and wraps a terminal one as NetworkError', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 1, label: 'Read' })
    ).rejects.toThrow('Read failed: ECONNRESET');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('honours SIMPLENOTE_CLI_TIMEOUT_MS and falls back to the default', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    process.env.SIMPLENOTE_CLI_TIMEOUT_MS = '15';
    await expect(httpRequest('https://example.test/x')).rejects.toThrow(
      'timed out after 15ms'
    );

    process.env.SIMPLENOTE_CLI_TIMEOUT_MS = 'not-a-number';
    await expect(
      httpRequest('https://example.test/x', {}, { timeoutMs: 5 })
    ).rejects.toThrow('timed out after 5ms');
    expect(DEFAULT_TIMEOUT_MS).toBe(15_000);
  });

  // The body is read inside the deadline and handed back buffered, so a caller
  // can never be left holding an unconsumed stream (which pins a socket) and a
  // server that sends headers then stalls the body still times out.
  it('returns the body already buffered', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(200, { body: '{"a":1}' })
    );

    const res = await httpRequest('https://example.test/x');

    expect(await res.json()).toEqual({ a: 1 });
    expect(await res.text()).toBe('{"a":1}');
  });

  it('times out when the body never finishes arriving', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        Promise.resolve({
          status: 200,
          ok: true,
          headers: new Headers(),
          text: () =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }),
        })
    );

    await expect(
      httpRequest('https://example.test/x', {}, { timeoutMs: 20 })
    ).rejects.toThrow('timed out after 20ms');
  });

  it('consumes a retryable response body so the socket is released', async () => {
    const text = jest.fn().mockResolvedValue('slow down');
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 503,
        ok: false,
        headers: new Headers(),
        text,
      })
      .mockResolvedValueOnce(response(200));

    await httpRequest('https://example.test/x', {}, { retries: 1 });

    expect(text).toHaveBeenCalledTimes(1);
  });

  // A retryable response in hand *and* an interrupt is a cancellation, not a
  // network fault: add.ts's batch loop must stop instead of counting the
  // interrupted attempt as a failure, and the CLI must print "cancelled".
  // Regression: this used to throw the NetworkError for the HTTP status.
  it('reports a cancellation when the signal fires with a retryable response in hand', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 503,
      ok: false,
      headers: new Headers({ 'retry-after': '0.05' }),
      text: async () => {
        controller.abort();
        return 'slow down';
      },
    });

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 3 })
    ).rejects.toBeInstanceOf(AbortedError);
    // One attempt, no retry: the user asked to stop.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('honours Retry-After on a 429 instead of its own backoff', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        response(429, { headers: { 'retry-after': '0.05' } })
      )
      .mockResolvedValueOnce(response(200));

    const started = Date.now();
    const res = await httpRequest('https://example.test/x', {}, { retries: 1 });

    expect(res.status).toBe(200);
    expect(Date.now() - started).toBeGreaterThanOrEqual(40);
  });

  // A transport error that lands *after* the user asked us to stop is
  // reported as a cancellation, not as a network fault. Tearing a socket down
  // mid-flight can surface as ECONNRESET rather than AbortError, and calling
  // that "network error" sends batch callers (add.ts) back around their loop
  // retrying items the user already cancelled.
  it('stops retrying and reports a cancellation once the process-level signal aborts', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    (global.fetch as jest.Mock).mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('ECONNRESET'));
    });

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 3 })
    ).rejects.toBeInstanceOf(AbortedError);
    // One attempt, not four: the user asked us to stop.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // The same transport failure with nobody cancelling stays a NetworkError,
  // so the classification above is driven by cancellation and not by the
  // shape of the transport error.
  it('still reports an uncancelled transport failure as a network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 0 })
    ).rejects.toBeInstanceOf(NetworkError);
  });

  // Regression: the backoff between attempts used to watch only the caller's
  // signal, and no production caller passes one — so a Ctrl-C during a retry
  // wait was ignored until MAX_BACKOFF_MS elapsed. It must now settle at once.
  it('interrupts a retry backoff when the process-level signal aborts', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    (global.fetch as jest.Mock).mockResolvedValue(
      response(503, { headers: { 'retry-after': '30' } })
    );

    const started = Date.now();
    const pending = httpRequest('https://example.test/x', {}, { retries: 3 });
    setTimeout(() => controller.abort(), 10);

    await expect(pending).rejects.toBeInstanceOf(Error);
    // Without the fix this waits out the clamped Retry-After, not ~10ms.
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  // The abort listener is wired onto the per-attempt controller (rather than
  // relying on AbortSignal.any, which only exists on Node 20+), so a Ctrl-C
  // interrupts an in-flight fetch on every supported runtime and is reported
  // as a cancellation, not a timeout.
  it('reports a Ctrl-C mid-request as a cancellation and never retries', async () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
          // A Ctrl-C lands while the request is in flight.
          queueMicrotask(() => controller.abort());
        })
    );

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 3 })
    ).rejects.toThrow('was cancelled');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('【场景】200 但 body 非 JSON 【目的】验证 json() 解析兜底 【校验点】异常类型/退出码/文案 【预期】NetworkError 且含非 JSON 提示与状态码', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(200, { body: '<html>captive portal</html>' })
    );

    const res = await httpRequest(
      'https://example.test/x',
      {},
      { label: 'Index' }
    );

    await expect(res.json()).rejects.toBeInstanceOf(NetworkError);
    await expect(res.json()).rejects.toThrow(
      'Index returned a non-JSON body (HTTP 200)'
    );
  });

  it('【场景】调用方信号已中止 【目的】验证请求发起前取消检查 【校验点】异常类型与 fetch 调用次数 【预期】AbortedError 且零请求', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      httpRequest('https://example.test/x', {}, { signal: controller.signal })
    ).rejects.toThrow('Request was cancelled');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('【场景】剩余预算在首次尝试前已耗尽 【目的】验证零请求快速失败（R3-2） 【校验点】fetch 次数与异常文案 【预期】不发起任何请求即 NetworkError，文案明示预算耗尽', async () => {
    const thrown = await httpRequest(
      'https://example.test/x',
      {},
      { deadlineAt: Date.now() - 1, label: 'Budget test' }
    ).catch((error) => error);

    expect(thrown).toBeInstanceOf(NetworkError);
    expect(String(thrown.message)).toContain('total time budget exhausted');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // P1: Retry-After is the server's explicit instruction and is honored above
  // the local backoff cap, so a 429 with "Retry-After: 30" actually waits 30s
  // instead of retrying in 4s and burning the whole budget on a service that
  // has not recovered. The cap still exists to stop a hostile value.
  it('honours Retry-After far above the local backoff cap', () => {
    expect(retryAfterMs(new Headers({ 'retry-after': '300' }))).toBe(
      MAX_RETRY_AFTER_MS
    );
    expect(MAX_RETRY_AFTER_MS).toBeGreaterThan(MAX_BACKOFF_MS);
  });

  it('keeps a small Retry-After unchanged', () => {
    expect(retryAfterMs(new Headers({ 'retry-after': '2' }))).toBe(2000);
  });

  it('【场景】Retry-After 为 HTTP 日期格式 【目的】验证日期解析分支 【校验点】请求次数与最终状态 【预期】按日期等待后成功', async () => {
    const future = new Date(Date.now() + 60).toUTCString();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        response(429, { headers: { 'retry-after': future } })
      )
      .mockResolvedValueOnce(response(200));

    const res = await httpRequest('https://example.test/x', {}, { retries: 1 });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('【场景】未指定 label 【目的】验证合成错误默认前缀 【校验点】异常文案 【预期】使用 Request 前缀', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      httpRequest('https://example.test/x', {}, { retries: 0 })
    ).rejects.toThrow('Request failed: ENOTFOUND');
  });

  it('【场景】最终一次可重试响应 【目的】验证原样交还且 body 完整 【校验点】状态码/请求次数/body 【预期】429 与缓冲 body 完整返回', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      response(429, { body: '{"n":1}' })
    );

    const res = await httpRequest('https://example.test/x', {}, { retries: 1 });

    expect(res.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(await res.text()).toBe('{"n":1}');
  });
});

describe('isExternalAborted', () => {
  it('【场景】未设置外部信号 【目的】默认不视为中断 【校验点】返回值 【预期】false', () => {
    setExternalAbortSignal(null);
    expect(isExternalAborted()).toBe(false);
  });

  it('【场景】信号触发后 【目的】进程级中断可被本地阶段感知 【校验点】返回值 【预期】触发后为 true', () => {
    const controller = new AbortController();
    setExternalAbortSignal(controller.signal);
    expect(isExternalAborted()).toBe(false);
    controller.abort();
    expect(isExternalAborted()).toBe(true);
    setExternalAbortSignal(null);
  });
});
