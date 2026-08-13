import {
  DEFAULT_APP_ID,
  LIST_DEFAULT_LIMIT,
  SEARCH_DEFAULT_LIMIT,
  PREVIEW_WIDTH,
  FLUSH_GUARD_MS,
  MAX_PAGES,
  DEFAULT_TOTAL_TIMEOUT_MS,
  INDEX_PAGE_SIZE,
  WRITE_CONCURRENCY,
  FILENAME_LENGTH,
  TAG_LINE_LENGTH,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MIN_BACKOFF_MS,
  MIN_ATTEMPT_TIMEOUT_MS,
  MAX_CONSECUTIVE_FAILURES,
  envPositiveInt,
} from '../cli-constants.ts';

// ---------------------------------------------------------------------------
// cli-constants：集中管理的魔法数值。纯常量模块，单测聚焦于“合理性不变量”
// （边界关系 / 正值 / 单调性），防止有人误改导致退避、分页、并发预算错乱。
// 七大维度：业务规则（数值不变量）/ 资源（无状态）。
// ---------------------------------------------------------------------------

describe('cli-constants 数值不变量', () => {
  it('【场景】分页与窗口  【目的】正值一致  【校验点】LIST<SEARCH 默认窗口，页大小大  【预期】>0 且关系成立', () => {
    expect(LIST_DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(SEARCH_DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(INDEX_PAGE_SIZE).toBeGreaterThan(0);
    expect(LIST_DEFAULT_LIMIT).toBeLessThanOrEqual(SEARCH_DEFAULT_LIMIT);
  });

  it('【场景】退避曲线  【目的】floor<=base<=ceil  【校验点】单调性  【预期】MIN<=BASE<=MAX 且均为正', () => {
    expect(MIN_BACKOFF_MS).toBeGreaterThan(0);
    expect(BASE_BACKOFF_MS).toBeGreaterThan(0);
    expect(MAX_BACKOFF_MS).toBeGreaterThan(0);
    expect(MIN_BACKOFF_MS).toBeLessThanOrEqual(BASE_BACKOFF_MS);
    expect(BASE_BACKOFF_MS).toBeLessThanOrEqual(MAX_BACKOFF_MS);
  });

  it('【场景】单次尝试最小超时  【目的】不为负/不回退  【校验点】下限约束  【预期】MIN_ATTEMPT_TIMEOUT_MS 在合理范围', () => {
    expect(MIN_ATTEMPT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MIN_ATTEMPT_TIMEOUT_MS).toBeLessThanOrEqual(
      DEFAULT_TOTAL_TIMEOUT_MS
    );
  });

  it('【场景】全局预算与防失控  【目的】总超时远大于单页、最大页数有界  【校验点】量级  【预期】均为正且 MAX_PAGES 有上界', () => {
    expect(DEFAULT_TOTAL_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MAX_PAGES).toBeGreaterThan(0);
    expect(FLUSH_GUARD_MS).toBeGreaterThan(0);
    expect(MAX_CONSECUTIVE_FAILURES).toBeGreaterThan(0);
  });

  it('【场景】写入并发与文件名长度  【目的】边界值合理  【校验点】正值  【预期】均为正', () => {
    expect(WRITE_CONCURRENCY).toBeGreaterThan(0);
    expect(FILENAME_LENGTH).toBeGreaterThan(0);
    expect(TAG_LINE_LENGTH).toBeGreaterThan(0);
    expect(PREVIEW_WIDTH).toBeGreaterThan(0);
  });

  it('【场景】生产 app id 常量  【目的】与 auth/config 约定一致  【校验点】值  【预期】等于 chalk-bump-f49', () => {
    expect(DEFAULT_APP_ID).toBe('chalk-bump-f49');
  });
});

describe('envPositiveInt', () => {
  const name = 'SIMPLENOTE_CLI_TEST_ENV';

  afterEach(() => {
    delete process.env[name];
  });

  it('returns the value for a positive number', () => {
    process.env[name] = '150';
    expect(envPositiveInt(name, 20)).toBe(150);
  });

  // `Number()` coercion is preserved from the call sites this helper unifies,
  // so "0x10" behaves the same as it did before the extraction.
  it('keeps the Number() coercion of the call sites it replaced', () => {
    process.env[name] = '0x10';
    expect(envPositiveInt(name, 20)).toBe(16);
  });

  it.each([['missing'], ['not-a-number'], ['0'], ['-3']])(
    'falls back when the variable is %s',
    (raw) => {
      if (raw !== 'missing') {
        process.env[name] = raw;
      }
      expect(envPositiveInt(name, 20)).toBe(20);
    }
  );
});
