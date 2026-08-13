import { normalizeTags } from '../tags.ts';
import { UsageError } from '../errors.ts';

// ---------------------------------------------------------------------------
// tags 规范化：create --tags / add --file 的标签是系统边界输入。空白或逗号
// 标签会被拒收（tag: 查询的 [^\s,]+ 永远匹配不到它，且与桌面端分隔符语义
// 冲突）；空白标签跳过；重复标签去重；NFC 折叠保证跨平台同一标签。
// 七大维度：入参边界 / 分支逻辑 / 异常故障 / 业务规则 / 资源（不改入参）。
// ---------------------------------------------------------------------------

describe('normalizeTags 入参边界与分支', () => {
  it('【场景】合法标签 【目的】trim + 保序 【校验点】返回数组 【预期】trim 后按原序', () => {
    expect(normalizeTags([' Work ', 'home'], 'note')).toEqual(['Work', 'home']);
  });

  it('【场景】纯空白标签 【目的】跳过空标签而非报错 【校验点】结果 【预期】被剔除', () => {
    expect(normalizeTags(['', '   ', 'ok'], 'note')).toEqual(['ok']);
  });

  it('【场景】全部空白 【目的】空输入等价 【校验点】结果 【预期】空数组', () => {
    expect(normalizeTags([' ', '  '], 'note')).toEqual([]);
    expect(normalizeTags([], 'note')).toEqual([]);
  });

  it('【场景】空入参数组 【目的】无标签创建合法 【校验点】结果 【预期】空数组且不抛错', () => {
    expect(normalizeTags([], 'create --tags')).toEqual([]);
  });

  it('【场景】非法标签（内部空格） 【目的】边界拒收 【校验点】异常类型与消息 【预期】UsageError 且消息含序号与来源', () => {
    expect(() => normalizeTags(['a', 'b c'], 'create --tags')).toThrow(
      UsageError
    );
    expect(() => normalizeTags(['a', 'b c'], 'create --tags')).toThrow(
      'Tag 2 for create --tags contains whitespace or a comma'
    );
  });

  it('【场景】非法标签（逗号） 【目的】与 tag: 查询模式一致 【校验点】异常消息 【预期】UsageError', () => {
    expect(() => normalizeTags(['a,b'], 'add --file')).toThrow(
      'Tag 1 for add --file contains whitespace or a comma'
    );
  });

  it('【场景】重复标签 【目的】去重保证幂等 【校验点】结果 【预期】仅保留首次出现', () => {
    expect(normalizeTags(['a', 'a', 'b', 'a'], 'note')).toEqual(['a', 'b']);
  });

  it('【场景】NFD 与 NFC 同标签 【目的】跨平台折叠 【校验点】结果 【预期】折叠为 NFC 形式且去重', () => {
    // 'e\u0301'（e + combining acute）normalize('NFC') 后为 '\u00e9'。
    expect(normalizeTags(['\u00e9', 'e\u0301'], 'note')).toEqual(['\u00e9']);
  });

  it('【场景】大小写差异 【目的】标签大小写敏感语义保持 【校验点】结果 【预期】不折叠大小写', () => {
    expect(normalizeTags(['Work', 'work'], 'note')).toEqual(['Work', 'work']);
  });
});
