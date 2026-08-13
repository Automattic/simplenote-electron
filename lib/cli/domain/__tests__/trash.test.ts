import { isTrashed } from '../trash.ts';
import type * as T from '../../vendor/types.ts';

// ---------------------------------------------------------------------------
// trash 规则：Simperium 的 deleted 为 boolean | 0 | 1，且 list/search 必须把
// 回收站排除在工作集之外（除非显式 opt-in）。
// 七大维度：入参边界 / 分支逻辑 / 业务规则 / 资源（不改动入参）。
// ---------------------------------------------------------------------------

type Wrapped = { data: T.Note };

function wrap(deleted: unknown, extra: Partial<T.Note> = {}): Wrapped {
  return {
    data: {
      content: 'x',
      creationDate: 0,
      modificationDate: 0,
      deleted: deleted as T.Note['deleted'],
      systemTags: [],
      tags: [],
      ...extra,
    },
  };
}

describe('isTrashed 入参边界与分支', () => {
  it('【场景】未删除（false/0/缺失）  【目的】布尔约定  【校验点】false  【预期】均视为未删', () => {
    expect(isTrashed(wrap(false).data)).toBe(false);
    expect(isTrashed(wrap(0).data)).toBe(false);
    expect(isTrashed(wrap(undefined).data)).toBe(false);
  });

  it('【场景】已删（true/1）  【目的】覆盖 0|1|true 全部表示  【校验点】true  【预期】均视为已删', () => {
    expect(isTrashed(wrap(true).data)).toBe(true);
    expect(isTrashed(wrap(1).data)).toBe(true);
  });

  it('【场景】note 为 undefined  【目的】空指针保护  【校验点】安全返回 false  【预期】false', () => {
    expect(isTrashed(undefined)).toBe(false);
    expect(isTrashed(null as unknown as T.Note | undefined)).toBe(false);
  });

  it('【场景】契约外真值（字符串/越界数字）  【目的】与 note.ts 边界归一化一致  【校验点】不视为已删  【预期】"false"/"0"/"yes"/2 均按未删', () => {
    expect(isTrashed(wrap('false' as unknown).data)).toBe(false);
    expect(isTrashed(wrap('0' as unknown).data)).toBe(false);
    expect(isTrashed(wrap('yes' as unknown).data)).toBe(false);
    expect(isTrashed(wrap(2).data)).toBe(false);
  });
});
