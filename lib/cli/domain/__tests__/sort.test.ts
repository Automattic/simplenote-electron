import { byModificationDateDesc } from '../sort.ts';
import type { BucketObject } from '../../vendor/types.ts';
import type * as T from '../../vendor/types.ts';

// ---------------------------------------------------------------------------
// byModificationDateDesc：list/search 共用的“最近优先”排序。
//
// timestampOf 用 Number()+isFinite 守卫，避免 NaN 比较让 sort 实现定义化
// （V8 会停止交换），从而打乱整张列表。七大维度：入参边界 / 分支 / 异常故障。
// ---------------------------------------------------------------------------

type Note = BucketObject<T.Note>;

function note(id: string, modificationDate?: number): Note {
  return {
    id,
    data: {
      content: id,
      creationDate: 0,
      modificationDate: (modificationDate ?? 0) as T.SecondsEpoch,
      deleted: false,
      systemTags: [],
      tags: [],
    },
  };
}

describe('byModificationDateDesc 入参边界', () => {
  it('【场景】单条记录  【目的】不崩溃  【校验点】返回自身  【预期】顺序不变', () => {
    const arr = [note('only', 5)];
    expect([...arr].sort(byModificationDateDesc)).toEqual(arr);
  });

  it('【场景】空数组  【目的】不崩溃  【校验点】返回空  【预期】[]', () => {
    expect([].sort(byModificationDateDesc)).toEqual([]);
  });

  it('【场景】modificationDate 缺失（undefined）  【目的】降级为 0 排末尾  【校验点】该记录排最后  【预期】undefined 的排在最末', () => {
    const arr = [
      note('old', 10),
      {
        id: 'no-date',
        data: {
          content: 'x',
          creationDate: 0,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      } as unknown as Note,
      note('new', 20),
    ];
    const sorted = [...arr].sort(byModificationDateDesc);
    expect(sorted[0].id).toBe('new');
    expect(sorted[sorted.length - 1].id).toBe('no-date');
  });

  it('【场景】modificationDate 为字符串化日期  【目的】降级为 0  【校验点】不污染排序  【预期】排末尾', () => {
    const arr = [
      {
        id: 'str',
        data: {
          content: 'x',
          creationDate: 0,
          modificationDate: 'soon' as unknown as number,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      },
      note('real', 3),
    ];
    const sorted = [...arr].sort(byModificationDateDesc);
    expect(sorted[0].id).toBe('real');
    expect(sorted[1].id).toBe('str');
  });

  it('【场景】modificationDate 为 NaN  【目的】降级为 0  【校验点】不污染排序  【预期】排末尾', () => {
    const arr = [
      {
        id: 'nan',
        data: {
          content: 'x',
          creationDate: 0,
          modificationDate: NaN,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      },
      note('real', 7),
    ];
    const sorted = [...arr].sort(byModificationDateDesc);
    expect(sorted[0].id).toBe('real');
    expect(sorted[1].id).toBe('nan');
  });

  it('【场景】modificationDate 为负数  【目的】仍为有限数  【校验点】参与比较  【预期】负数排在正常正数之前但晚于更大负数', () => {
    const arr = [note('a', -5), note('b', 5), note('c', 0)];
    const sorted = [...arr].sort(byModificationDateDesc);
    expect(sorted.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('byModificationDateDesc 分支逻辑与业务规则', () => {
  it('【场景】正常多记录  【目的】最新优先  【校验点】降序  【预期】由新到旧', () => {
    const arr = [note('old', 1), note('new', 9), note('mid', 5)];
    expect([...arr].sort(byModificationDateDesc).map((n) => n.id)).toEqual([
      'new',
      'mid',
      'old',
    ]);
  });

  it('【场景】两条修改时间相等  【目的】稳定排序（V8 稳定）  【校验点】原顺序保持  【预期】相对顺序不变', () => {
    const arr = [note('first', 5), note('second', 5), note('third', 5)];
    expect([...arr].sort(byModificationDateDesc).map((n) => n.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('【场景】全部缺失时间  【目的】全部降级为 0  【校验点】顺序稳定  【预期】保持原顺序', () => {
    const arr = [note('a'), note('b'), note('c')];
    expect([...arr].sort(byModificationDateDesc).map((n) => n.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('【场景】混合可信与脏时间戳  【目的】脏值不越位  【校验点】可信记录正确降序  【预期】脏值沉底', () => {
    const arr = [
      note('real-new', 100),
      {
        id: 'nan',
        data: {
          content: 'x',
          creationDate: 0,
          modificationDate: NaN,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      },
      note('real-old', 1),
      {
        id: 'str',
        data: {
          content: 'x',
          creationDate: 0,
          modificationDate: 'x' as unknown as number,
          deleted: false,
          systemTags: [],
          tags: [],
        },
      },
    ];
    const sorted = [...arr].sort(byModificationDateDesc);
    expect(sorted.map((n) => n.id)).toEqual([
      'real-new',
      'real-old',
      'nan',
      'str',
    ]);
  });

  it('【场景】比较器符号正确  【目的】a 较旧→a 排在 b 后（正）  【校验点】返回值  【预期】byModificationDateDesc(旧,新)>0，反之<0，相等为0', () => {
    // byModificationDateDesc(a,b) = timestampOf(b) - timestampOf(a)
    expect(byModificationDateDesc(note('a', 1), note('b', 2))).toBeGreaterThan(
      0
    );
    expect(byModificationDateDesc(note('a', 2), note('b', 1))).toBeLessThan(0);
    expect(byModificationDateDesc(note('a', 3), note('b', 3))).toBe(0);
  });

  it('【场景】极端时间戳（±1e12） 【目的】三态比较顺序确定，不受减法溢出影响 【校验点】降序 【预期】正值在前', () => {
    const arr = [note('neg', -1e12), note('pos', 1e12), note('zero', 0)];
    expect([...arr].sort(byModificationDateDesc).map((n) => n.id)).toEqual([
      'pos',
      'zero',
      'neg',
    ]);
  });

  it('【场景】契约外超大时间戳 【目的】不产生 NaN 排序 【校验点】顺序确定 【预期】有限值降序', () => {
    const arr = [
      note('huge', Number.MAX_VALUE),
      note('normal', 5),
      note('low', 1),
    ];
    expect([...arr].sort(byModificationDateDesc).map((n) => n.id)).toEqual([
      'huge',
      'normal',
      'low',
    ]);
  });
});
