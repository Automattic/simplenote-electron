jest.mock('jszip', () => {
  class MockJSZip {
    files: Array<{ name: string; content: string; opts?: unknown }> = [];
    file(name: string, content: string, opts?: unknown) {
      this.files.push({ name, content, opts });
      return this;
    }
  }
  return { __esModule: true, default: MockJSZip };
});

import noteExportToZip from '../vendor/export/to-zip.ts';
import type { ExportNote, GroupedExportNotes } from '../vendor/export/types.ts';
import type * as T from '../vendor/types.ts';

// Minimal ExportNote factory. `lastModified` is not part of ExportNote; it is
// carried through from the note source and read by the zip writer via its
// ZipNote cast, so it is supplied here to pin the date option.
function note(
  content: string,
  lastModified = '2024-01-01T00:00:00.000Z'
): ExportNote & { lastModified: string } {
  return {
    content,
    collaboratorEmails: [],
    creationDate: 0,
    id: `id-${content}` as T.EntityId,
    lastModified,
    modificationDate: 0,
    tags: [],
  };
}

type CapturedZip = {
  files: Array<{ name: string; content: string; opts?: { date?: Date } }>;
};

describe('noteExportToZip', () => {
  it('【场景】活动与回收站分流 【目的】验证 zip 条目路径与 trash/ 前缀 【校验点】文件名列表 【预期】source/notes.json 在前，活动笔记在后，回收站带 trash/ 前缀', async () => {
    const grouped: GroupedExportNotes = {
      activeNotes: [note('Active title\nbody')],
      trashedNotes: [note('Trash title')],
    };

    const zip = (await noteExportToZip(grouped)) as unknown as CapturedZip;

    expect(zip.files.map((file) => file.name)).toEqual([
      'source/notes.json',
      'Active title.txt',
      'trash/Trash title.txt',
    ]);
  });

  it('【场景】同标题笔记 【目的】复用 export-naming 去重（R4）【校验点】条目名 【预期】同标题按 (n) 编号互不覆盖', async () => {
    const grouped: GroupedExportNotes = {
      activeNotes: [note('Meeting'), note('Meeting')],
      trashedNotes: [],
    };

    const zip = (await noteExportToZip(grouped)) as unknown as CapturedZip;

    expect(zip.files.map((file) => file.name)).toEqual([
      'source/notes.json',
      'Meeting.txt',
      'Meeting (1).txt',
    ]);
  });

  it('【场景】导出失败 【目的】验证构造错误向上传播而非被 catch 吞掉 【校验点】rejects 【预期】调用方沿既有错误处理链分类（H-03）', async () => {
    const grouped: GroupedExportNotes = {
      activeNotes: [note('a')],
      trashedNotes: [],
    };
    const jszipMock = require('jszip') as { default: new () => unknown };
    const original = jszipMock.default;
    class ExplodingZip {
      constructor() {
        throw new Error('zip build failed');
      }
    }
    (jszipMock as { default: new () => unknown }).default = ExplodingZip;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await expect(noteExportToZip(grouped)).rejects.toThrow(
        'zip build failed'
      );
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      (jszipMock as { default: new () => unknown }).default = original;
      logSpy.mockRestore();
    }
  });
});
