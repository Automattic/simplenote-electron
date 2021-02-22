type ImporterName = 'simplenote' | 'evernote' | 'text-files';

type Importer = {
  name: ImporterName;
  errorMessage: String;
  fileTypes: Array<String>;
  multiple: boolean;
};

const simplenoteImporter: Importer = {
  name: 'simplenote',
  errorMessage: 'Only one Simplenote file (.json) can be imported at a time.',
  fileTypes: ['json'],
  multiple: false,
};

const evernoteImporter: Importer = {
  name: 'evernote',
  errorMessage: 'Only one Evernote file (.enex) can be imported at a time.',
  fileTypes: ['enex'],
  multiple: false,
};

const textImporter: Importer = {
  name: 'text-files',
  errorMessage: '',
  fileTypes: ['txt', 'md'],
  multiple: true,
};

export const importers: Array<Importer> = [
  simplenoteImporter,
  evernoteImporter,
  textImporter,
];

export const forFilename = (file: String): Importer => {
  const fileExtension =
    file.substring(file.lastIndexOf('.') + 1, file.length) || file;

  switch (fileExtension) {
    case 'json':
      return simplenoteImporter;

    case 'enex':
      return evernoteImporter;

    case 'txt':
    case 'md':
      return textImporter;
  }

  throw new Error(`No importer found for file ${file}`);
};

/** Async-loads importer JS bundle
 *
 * Warning! Don't replace the static strings with string-interpolation
 * or else they won't be as easy to find and webpack will generate
 * more than we expect.
 */
export const load = (name: ImporterName): Promise<object> => {
  switch (name) {
    case 'simplenote':
      return import(
        /* webpackChunkName: 'utils-import-simplenote' */ '../../utils/import/simplenote'
      );

    case 'evernote':
      return import(
        /* webpackChunkName: 'utils-import-evernote' */ '../../utils/import/evernote'
      );

    case 'text-files':
      return import(
        /* webpackChunkName: 'utils-import-text-files' */ '../../utils/import/text-files'
      );
  }

  throw new Error(`Unrecognized importer named ${name}`);
};
