jest.mock('../vendor/export/to-zip.ts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import noteExportToZip from '../vendor/export/to-zip.ts';
import { writeZipExport } from '../export-helpers.ts';
import { NetworkError } from '../domain/errors.ts';
import type { GroupedExportNotes } from '../vendor/export/types.ts';

const grouped: GroupedExportNotes = { activeNotes: [], trashedNotes: [] };

// writeZipExport only touches the file system after the archive is built, so a
// null/undefined zip (generation failed upstream) must surface as a NetworkError
// before any staging write happens. These cases are not exercised by the
// command-level export tests, which always supply a working zip double.
describe('writeZipExport', () => {
  it('【场景】zip 生成为 null  【目的】上游失败兜底  【校验点】异常类型  【预期】抛 NetworkError', async () => {
    (noteExportToZip as jest.Mock).mockResolvedValue(null);
    await expect(writeZipExport(grouped, '/tmp/out')).rejects.toBeInstanceOf(
      NetworkError
    );
  });

  it('【场景】zip 生成为 undefined  【目的】上游失败兜底  【校验点】异常类型  【预期】抛 NetworkError', async () => {
    (noteExportToZip as jest.Mock).mockResolvedValue(undefined);
    await expect(writeZipExport(grouped, '/tmp/out')).rejects.toBeInstanceOf(
      NetworkError
    );
  });
});
