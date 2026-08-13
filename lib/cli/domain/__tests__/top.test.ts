import { topBy } from '../top.ts';
import { byModificationDateDesc } from '../sort.ts';
import type { BucketObject } from '../../vendor/types.ts';
import type * as T from '../../vendor/types.ts';

// A number comparator with a clear "newest first" sign convention, matching
// byModificationDateDesc (comparator(a, b) < 0 => a comes first).
const desc = (a: number, b: number) => b - a;

describe('topBy 入参边界', () => {
  it('limit <= 0 返回空数组', () => {
    expect(topBy([1, 2, 3], 0, desc)).toEqual([]);
    expect(topBy([1, 2, 3], -1, desc)).toEqual([]);
  });

  it('非整数 limit（NaN/小数）返回空数组而不是静默退化', () => {
    expect(topBy([1, 2, 3], NaN, desc)).toEqual([]);
    expect(topBy([1, 2, 3], 2.5, desc)).toEqual([]);
  });

  it('空输入返回空数组', () => {
    expect(topBy([], 5, desc)).toEqual([]);
  });

  it('limit >= 长度返回全排序', () => {
    expect(topBy([3, 1, 2], 3, desc)).toEqual([3, 2, 1]);
    expect(topBy([3, 1, 2], 99, desc)).toEqual([3, 2, 1]);
  });
});

describe('topBy 结果等价于 sort + slice', () => {
  it('小 k 二分插入与全排序一致', () => {
    const items = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9];
    expect(topBy(items, 5, desc)).toEqual([...items].sort(desc).slice(0, 5));
  });

  it('重复值保持与稳定排序相同的相对顺序', () => {
    // sort 是稳定的：相等的 5 保持它们的输入顺序。
    const items = [5, 3, 5, 1, 5];
    expect(topBy(items, 5, desc)).toEqual([...items].sort(desc));
    expect(topBy(items, 3, desc)).toEqual([...items].sort(desc).slice(0, 3));
  });

  it('大 k 回退全排序（结果一致）', () => {
    const items = Array.from({ length: 300 }, (_, i) => (i * 7919) % 101);
    expect(topBy(items, 100, desc)).toEqual(
      [...items].sort(desc).slice(0, 100)
    );
  });
});

describe('topBy 与 byModificationDateDesc 集成', () => {
  function note(id: string, modificationDate: number): BucketObject<T.Note> {
    return {
      id,
      data: {
        content: id,
        creationDate: modificationDate as T.SecondsEpoch,
        modificationDate: modificationDate as T.SecondsEpoch,
        deleted: false,
        systemTags: [],
        tags: [],
      },
    };
  }

  it('最新优先 top-k 与全排序一致', () => {
    const notes = [
      note('old', 1),
      note('new', 9),
      note('mid-a', 5),
      note('mid-b', 5),
      note('ancient', 0),
    ];
    expect(topBy(notes, 3, byModificationDateDesc)).toEqual(
      [...notes].sort(byModificationDateDesc).slice(0, 3)
    );
  });

  it('相同修改时间的笔记保持输入顺序（稳定性）', () => {
    const notes = [note('first', 5), note('second', 5), note('third', 5)];
    expect(topBy(notes, 2, byModificationDateDesc).map((n) => n.id)).toEqual([
      'first',
      'second',
    ]);
  });
});
