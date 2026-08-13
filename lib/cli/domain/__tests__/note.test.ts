import { sanitizeNote } from '../note.ts';
import type * as T from '../../vendor/types.ts';

// ---------------------------------------------------------------------------
// sanitizeNote：系统边界（Simperium index/get 返回）的归一化。
//
// 下游消费者（vendor 的 export-notes / note-utils）直接解引用
// note.systemTags.includes / note.content.split，脏记录会让 export/search
// 以 TypeError 崩溃并伪装成“网络错误”退出。这里一次性把边界数据修成稳定形状。
//
// 七大维度覆盖：入参边界 / 分支逻辑 / 异常故障 / 业务规则 / 资源（无状态纯函数）。
// ---------------------------------------------------------------------------

describe('sanitizeNote 入参边界', () => {
  it('【场景】原始数据为 null  【目的】无可用记录  【校验点】返回 undefined  【预期】不崩溃、返回 undefined', () => {
    expect(sanitizeNote(null)).toBeUndefined();
  });

  it('【场景】原始数据 undefined  【目的】缺失记录  【校验点】返回 undefined  【预期】undefined', () => {
    expect(sanitizeNote(undefined)).toBeUndefined();
  });

  it('【场景】原始数据是数组（非对象）  【目的】拒绝非对象载荷  【校验点】返回 undefined  【预期】undefined', () => {
    expect(sanitizeNote([{ content: 'x' }])).toBeUndefined();
  });

  it('【场景】原始数据是字符串/数字  【目的】拒绝标量载荷  【校验点】返回 undefined  【预期】undefined', () => {
    expect(sanitizeNote('garbage' as unknown)).toBeUndefined();
    expect(sanitizeNote(42 as unknown)).toBeUndefined();
  });
});

describe('sanitizeNote 字段归一化（分支逻辑）', () => {
  it('【场景】content 缺失或非字符串  【目的】安全默认值  【校验点】content 为空串  【预期】content 为 ""', () => {
    expect(sanitizeNote({})?.content).toBe('');
    expect(sanitizeNote({ content: 123 } as unknown)?.content).toBe('');
    expect(sanitizeNote({ content: null })?.content).toBe('');
  });

  it('【场景】content 为正常字符串  【目的】原样保留  【校验点】返回值  【预期】content 透传', () => {
    expect(sanitizeNote({ content: 'hello\nworld' })?.content).toBe(
      'hello\nworld'
    );
  });

  it('【场景】creationDate 为字符串化日期或 NaN  【目的】防 NaN 污染比较  【校验点】epoch 落地为 0  【预期】creationDate===0', () => {
    expect(
      sanitizeNote({ content: 'x', creationDate: 'soon' })?.creationDate
    ).toBe(0);
    expect(
      sanitizeNote({ content: 'x', creationDate: NaN })?.creationDate
    ).toBe(0);
    expect(
      sanitizeNote({ content: 'x', creationDate: Infinity })?.creationDate
    ).toBe(0);
  });

  it('【场景】modificationDate 为合法数字  【目的】保留可信时间戳  【校验点】原值  【预期】modificationDate 透传', () => {
    expect(
      sanitizeNote({ content: 'x', modificationDate: 1700000001 })
        ?.modificationDate
    ).toBe(1700000001);
  });

  it('【场景】时间戳超出 Date 可表示范围  【目的】防 RangeError 击穿导出  【校验点】epoch 落地为 0  【预期】越界值归 0，边界值保留', () => {
    expect(
      sanitizeNote({ content: 'x', creationDate: 1e20 })?.creationDate
    ).toBe(0);
    expect(
      sanitizeNote({ content: 'x', creationDate: -1e20 })?.creationDate
    ).toBe(0);
    expect(
      sanitizeNote({ content: 'x', modificationDate: 9e12 })?.modificationDate
    ).toBe(0);
    expect(
      sanitizeNote({ content: 'x', creationDate: 8.64e12 })?.creationDate
    ).toBe(8.64e12);
    expect(
      sanitizeNote({ content: 'x', creationDate: -8.64e12 })?.creationDate
    ).toBe(-8.64e12);
  });

  it('【场景】deleted 为布尔/0/1 多种表示  【目的】统一布尔约定  【校验点】Boolean() 包裹  【预期】1 与 true 都视为已删', () => {
    expect(sanitizeNote({ content: 'x', deleted: true })?.deleted).toBe(true);
    expect(sanitizeNote({ content: 'x', deleted: false })?.deleted).toBe(false);
    expect(sanitizeNote({ content: 'x', deleted: 1 })?.deleted).toBe(true);
    expect(sanitizeNote({ content: 'x', deleted: 0 })?.deleted).toBe(false);
    expect(sanitizeNote({ content: 'x' })?.deleted).toBe(false);
  });

  it('【场景】deleted 为契约外字符串 "false"/"0"  【目的】拒绝字符串真值误判  【校验点】不视为已删  【预期】Boolean() 曾把 "false"/"0" 转 true，现按契约只认 true/1', () => {
    expect(sanitizeNote({ content: 'x', deleted: 'false' })?.deleted).toBe(
      false
    );
    expect(sanitizeNote({ content: 'x', deleted: '0' })?.deleted).toBe(false);
    expect(sanitizeNote({ content: 'x', deleted: 'true' })?.deleted).toBe(
      false
    );
    expect(sanitizeNote({ content: 'x', deleted: '1' })?.deleted).toBe(false);
  });

  it('【场景】systemTags 非数组/含非字符串  【目的】只保留字符串标签  【校验点】过滤后数组  【预期】非数组→[]，脏元素被剔除', () => {
    expect(
      sanitizeNote({ content: 'x', systemTags: 'markdown' } as unknown)
        ?.systemTags
    ).toEqual([]);
    expect(
      sanitizeNote({
        content: 'x',
        systemTags: ['markdown', 7, null],
      } as unknown)?.systemTags
    ).toEqual(['markdown']);
    expect(sanitizeNote({ content: 'x' })?.systemTags).toEqual([]);
  });

  it('【场景】tags 非数组/含非字符串  【目的】只保留字符串标签  【校验点】过滤后数组  【预期】非数组→[]，脏元素被剔除', () => {
    expect(
      sanitizeNote({ content: 'x', tags: 'work' } as unknown)?.tags
    ).toEqual([]);
    expect(
      sanitizeNote({ content: 'x', tags: ['work', 9, 'home'] } as unknown)?.tags
    ).toEqual(['work', 'home']);
    expect(sanitizeNote({ content: 'x' })?.tags).toEqual([]);
  });
});

describe('sanitizeNote 业务规则：未知字段保留与完整形状', () => {
  it('【场景】API 未来新增字段  【目的】edit POST 不丢字段  【校验点】未知字段原样往返  【预期】futureField 留存', () => {
    const out = sanitizeNote({
      content: 'x',
      futureField: { nested: 1 },
      another: 'kept',
    });
    expect((out as Record<string, unknown>).futureField).toEqual({ nested: 1 });
    expect((out as Record<string, unknown>).another).toBe('kept');
  });

  it('【场景】完整合法记录  【目的】端到端形状一致  【校验点】全部字段  【预期】与桌面端期望形状吻合', () => {
    const raw = {
      content: 'body',
      creationDate: 100,
      modificationDate: 200,
      deleted: false,
      systemTags: ['markdown'],
      tags: ['work'],
      publishURL: 'https://x',
    };
    const out = sanitizeNote(raw) as T.Note;
    expect(out.content).toBe('body');
    expect(out.creationDate).toBe(100);
    expect(out.modificationDate).toBe(200);
    expect(out.deleted).toBe(false);
    expect(out.systemTags).toEqual(['markdown']);
    expect(out.tags).toEqual(['work']);
    expect(out.publishURL).toBe('https://x');
  });

  it('【场景】脏记录同时有多处问题  【目的】一次修复而非崩溃  【校验点】逐项修复  【预期】字符串日期/非数组标签/1-deleted 全部归位', () => {
    const out = sanitizeNote({
      content: 'b',
      creationDate: 'soon',
      modificationDate: 'x',
      deleted: 1,
      systemTags: null,
      tags: 'work',
    });
    expect(out?.creationDate).toBe(0);
    expect(out?.modificationDate).toBe(0);
    expect(out?.deleted).toBe(true);
    expect(out?.systemTags).toEqual([]);
    expect(out?.tags).toEqual([]);
  });
});

describe('sanitizeNote 异常故障：顶层对象一律归一再返回', () => {
  // 注意：drop 规则（返回 undefined）只在 find() 对 entry.d 调用时生效，
  // sanitizeNote 本身对“顶层就是个对象”的情况总是返回一个归一化记录，
  // 把脏字段修复成中性默认值，而不是整条丢弃。
  it('【场景】顶层对象但字段全脏  【目的】修复而非丢弃  【校验点】返回归一化记录  【预期】返回对象，content 回退为空串', () => {
    const out = sanitizeNote({ id: 'x', d: 'garbage' } as unknown);
    expect(out).toBeDefined();
    expect(out?.content).toBe('');
  });

  it('【场景】对象仅含 null data  【目的】修复而非丢弃  【校验点】返回对象  【预期】返回带中性默认值的记录', () => {
    const out = sanitizeNote({ d: null } as unknown);
    expect(out).toBeDefined();
    expect(out?.tags).toEqual([]);
    expect(out?.systemTags).toEqual([]);
  });
});
