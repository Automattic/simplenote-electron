import normalizeLineBreak from './normalize-line-break';
import { prepareNotes } from '../../export-naming.ts';
import type { ExportNote, GroupedExportNotes } from './types';

type ZipNote = ExportNote & { fileName: string; lastModified?: string };

export const noteExportToZip = (notes: GroupedExportNotes) => {
  return import(/* webpackChunkName: 'jszip' */ 'jszip').then(
    ({ default: JSZip }) => {
      const zip = new JSZip();

      zip.file(
        'source/notes.json',
        normalizeLineBreak(JSON.stringify(notes, null, 2))
      );

      prepareNotes(notes.activeNotes).forEach((note) => {
        const { content, fileName, lastModified } = note as ZipNote;
        zip.file(`${fileName}.txt`, content, {
          date: new Date(lastModified as string),
        });
      });

      prepareNotes(notes.trashedNotes).forEach((note) => {
        const { content, fileName, lastModified } = note as ZipNote;
        zip.file(`trash/${fileName}.txt`, content, {
          date: new Date(lastModified as string),
        });
      });

      return zip;
    }
  );
};

export default noteExportToZip;
