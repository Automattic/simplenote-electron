type ImporterName = 'simplenote' | 'evernote' | 'text-files';

type Importer = {
  name: ImporterName;
  fileTypes: Array<String>;
};

const simplenoteImporter: Importer = {
  name: 'simplenote',
  fileTypes: ['json'],
};

const evernoteImporter: Importer = {
  name: 'evernote',
  fileTypes: ['enex'],
};

const textImporter: Importer = {
  name: 'text-files',
  fileTypes: ['txt', 'md'],
};

export const importers: Array<Importer> = [
  simplenoteImporter,
  evernoteImporter,
  textImporter,
];

export const getImporter = (name: String): Importer => {
  switch (name) {
    case 'simplenote':
      return simplenoteImporter;

    case 'evernote':
      return evernoteImporter;

    case 'text-files':
      return textImporter;
  }

  throw new Error(`No importer found named ${name}`);
};

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
