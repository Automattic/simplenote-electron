import { completeLogin, login, requestLoginEmail } from '../auth.ts';
import { AuthError, NetworkError, RateLimitError } from '../domain/errors.ts';

/**
 * A stand-in for a real `fetch` Response.
 *
 * infra/http.ts buffers the body with a single `text()` call inside the
 * request deadline, so a double that only implements `json()` no longer
 * reflects how the code is actually driven.
 */
function fakeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

describe('login', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns credentials when authorize succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, {
        access_token: 'tok-123',
        username: 'user@example.com',
      })
    );

    const credentials = await login('user@example.com', 'password');

    expect(credentials).toEqual({
      access_token: 'tok-123',
      username: 'user@example.com',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.simperium.com/1/chalk-bump-f49/authorize/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Simperium-API-Key': expect.any(String),
        }),
      })
    );
  });

  it('throws when authorize returns a non-200 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(401, { error: 'bad credentials' })
    );

    await expect(login('user@example.com', 'wrong')).rejects.toThrow(
      'Auth failed: HTTP 401'
    );
  });

  it('【场景】401 认证失败 【目的】F-1 缓解：引导改用 magic-link 登录 【校验点】异常文案 【预期】含 magic-link 引导句', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(401, { error: 'invalid app credentials' })
    );

    await expect(login('user@example.com', 'wrong')).rejects.toThrow(
      'use magic-link login instead (unset SIMPLENOTE_PASSWORD)'
    );
  });

  it('【场景】非 401 认证失败 【目的】非凭据类失败不误导用户 【校验点】异常文案 【预期】不含 magic-link 引导句', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(403, { error: 'forbidden' })
    );

    await expect(login('user@example.com', 'wrong')).rejects.toThrow(
      'Auth failed: HTTP 403'
    );
    await expect(login('user@example.com', 'wrong')).rejects.not.toThrow(
      'magic-link'
    );
  });

  it('throws when the response body is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, { unexpected: 'shape' })
    );

    await expect(login('user@example.com', 'password')).rejects.toThrow(
      'Auth response malformed'
    );
  });

  it('classifies auth failures as exit code 2', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(401));

    let thrown: unknown;
    try {
      await login('user@example.com', 'wrong');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AuthError);
    expect((thrown as AuthError).code).toBe(2);
  });

  it('never retries the authorize call', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(503));

    await expect(login('user@example.com', 'pw')).rejects.toThrow('HTTP 503');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Magic-link flows (requestLoginEmail/completeLogin) already normalized the
  // username; the password flow must behave the same so whoami prints one
  // address regardless of which flow produced the login.
  it('【场景】用户名含大小写与空白 【目的】与 magic-link 流程保持用户名归一化一致 【校验点】请求体与返回凭证 【预期】trim 后小写', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, {
        access_token: 'tok-123',
        username: 'user@example.com',
      })
    );

    const credentials = await login('  User@Example.COM ', 'password');

    expect(credentials.username).toBe('user@example.com');
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string
    );
    expect(body.username).toBe('user@example.com');
  });
});

describe('requestLoginEmail', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POSTs the username to the request-login endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(200));

    await requestLoginEmail('user@example.com');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.simplenote.com/account/request-login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user@example.com',
          request_source: 'electron',
        }),
      })
    );
  });

  it('throws when the endpoint is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(500));

    await expect(requestLoginEmail('user@example.com')).rejects.toThrow(
      'Request login failed: HTTP 500'
    );
  });
});

describe('completeLogin', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns credentials from sync_token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, { sync_token: 'sync-xyz' })
    );

    const credentials = await completeLogin('user@example.com', 'ABCDEF');

    expect(credentials).toEqual({
      access_token: 'sync-xyz',
      username: 'user@example.com',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.simplenote.com/account/complete-login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user@example.com',
          auth_code: 'ABCDEF',
        }),
      })
    );
  });

  it('throws when the endpoint is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(400));

    await expect(completeLogin('user@example.com', 'ABCDEF')).rejects.toThrow(
      'Complete login failed: HTTP 400'
    );
  });

  it('rejects an empty code locally without touching the server', async () => {
    await expect(completeLogin('user@example.com', '')).rejects.toThrow(
      'Login code is empty'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only code locally without touching the server', async () => {
    await expect(completeLogin('user@example.com', '   ')).rejects.toThrow(
      'Login code is empty'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('strips internal whitespace from the code before sending', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, { sync_token: 'sync-xyz' })
    );

    await completeLogin('user@example.com', 'ABC DEF');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.simplenote.com/account/complete-login',
      expect.objectContaining({
        body: JSON.stringify({
          username: 'user@example.com',
          auth_code: 'ABCDEF',
        }),
      })
    );
  });

  it('reports a friendly message when rate-limited', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(429));

    let thrown: unknown;
    try {
      await completeLogin('user@example.com', 'ABCDEF');
    } catch (error) {
      thrown = error;
    }

    // A 429 is a throttle, not a bad credential: it keeps the network exit
    // code (3) and its own class so CI can tell "slow down" from "wrong code".
    expect(thrown).toBeInstanceOf(RateLimitError);
    expect((thrown as RateLimitError).code).toBe(3);
    expect((thrown as Error).message).toContain(
      'Too many login requests in a short time. Wait a few minutes and try again.'
    );
  });

  it('throws when the response body is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(200, {}));

    await expect(completeLogin('user@example.com', 'ABCDEF')).rejects.toThrow(
      'Complete login response malformed'
    );
  });
});

describe('requestLoginEmail normalization', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('【场景】用户名含大小写与空白 【目的】验证邮箱归一化 【校验点】请求体 username 【预期】trim 后小写', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(200));

    await requestLoginEmail('  User@Example.COM ');

    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string
    );
    expect(body.username).toBe('user@example.com');
  });

  it('【场景】传输层故障 【目的】验证网络错误分类 【校验点】异常类型/退出码 【预期】NetworkError 且 code 3', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));

    let thrown: unknown;
    try {
      await requestLoginEmail('user@example.com');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NetworkError);
    expect((thrown as NetworkError).code).toBe(3);
  });

  it('【场景】429 限流 【目的】验证限流与凭据错误区分 【校验点】异常类型/退出码 【预期】RateLimitError 且 code 3', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(429));

    let thrown: unknown;
    try {
      await requestLoginEmail('user@example.com');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RateLimitError);
    expect((thrown as RateLimitError).code).toBe(3);
    expect((thrown as Error).message).toContain(
      'Too many login requests in a short time'
    );
  });
});

describe('completeLogin normalization', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('【场景】用户名与验证码含空白/大小写 【目的】验证归一化后入库 【校验点】请求体与返回凭证 【预期】username 小写、code 大写', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      fakeResponse(200, { sync_token: 'sync-xyz' })
    );

    const credentials = await completeLogin('  User@Example.com ', ' abcd ');

    expect(credentials).toEqual({
      access_token: 'sync-xyz',
      username: 'user@example.com',
    });
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string
    );
    expect(body.username).toBe('user@example.com');
    expect(body.auth_code).toBe('ABCD');
  });

  it('【场景】传输层故障 【目的】验证网络错误分类 【校验点】异常类型 【预期】NetworkError', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      completeLogin('user@example.com', 'ABCDEF')
    ).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('login failure classification', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('【场景】429 限流 【目的】分类为网络错误而非凭据无效 【校验点】异常类型与退出码 【预期】RateLimitError 且 code 3', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(fakeResponse(429));

    let thrown: unknown;
    try {
      await login('user@example.com', 'pw');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RateLimitError);
    expect((thrown as RateLimitError).code).toBe(3);
    expect((thrown as Error).message).toContain(
      'Too many login requests in a short time'
    );
  });

  it('【场景】传输层故障 【目的】区分网络故障与认证失败 【校验点】异常类型与退出码 【预期】NetworkError 且 code 3', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNRESET'));

    let thrown: unknown;
    try {
      await login('user@example.com', 'pw');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NetworkError);
    expect((thrown as NetworkError).code).toBe(3);
  });

  it('【场景】成功响应但 body 非 JSON 【目的】验证非 JSON 响应兜底 【校验点】异常类型与文案 【预期】NetworkError 且含 non-JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      text: async () => '<html>captive portal</html>',
    } as unknown as Response);

    let thrown: unknown;
    try {
      await login('user@example.com', 'pw');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(NetworkError);
    expect((thrown as NetworkError).message).toContain('non-JSON body');
  });
});
