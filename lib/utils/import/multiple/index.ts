import { EventEmitter } from 'events';

import * as importers from '../../../dialogs/import/importers';

import * as T from '../../../types';

class MultipleImporter extends EventEmitter {
  private addNote;
  private options;
  private recordEvent;
  private importFiles: Map<String, Array<File>>;

  constructor(
    addNote: (note: T.Note) => any,
    options,
    recordEvent: (eventName: string, eventProperties: T.JSONSerializable) => any
  ) {
    super();
    this.addNote = addNote;
    this.options = options;
    this.recordEvent = recordEvent;
    this.importFiles = new Map();
    // Initiate a map to keep track of files for each type of importer
    importers.importers.forEach((importer) => {
      this.importFiles.set(importer.name, []);
    });
  }

  importNotes = (filesArray) => {
    let importedNoteCount = 0;

    if (!filesArray) {
      this.emit('status', 'error', 'No files to import.');
      return;
    }

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const theImporter = importers.forFilename(file.name);
      const currentFiles = this.importFiles.get(theImporter.name);
      currentFiles.push(file);
      this.importFiles.set(theImporter.name, currentFiles);
    }

    let importersCompleted = 0;
    let totalImporters = 0;

    const importerListener = (done) => (type, arg) => {
      if (type === 'complete') {
        importersCompleted++;
        importedNoteCount += arg;
        if (totalImporters === importersCompleted) {
          this.emit('status', 'complete', importedNoteCount);
        }
        done();
      } else {
        this.emit('status', type, arg);
      }
    };

    // Loop through each of the set of files to import and process them with the appropriate importer
    this.importFiles.forEach(async (files, name) => {
      if (files.length > 0) {
        const { default: Importer } = await importers.load(name);
        const importer = new Importer(
          this.addNote,
          this.options,
          this.recordEvent
        );

        // If the importer supports multiple files send them all at once,
        // if not send them one at a time.
        if (importers.getImporter(name).multiple) {
          totalImporters++;
          await new Promise((resolve) => {
            const listener = importerListener(() => {
              importer.off('status', listener);
              resolve(true);
            });
            importer.on('status', listener);
            importer.importNotes(files);
          });
        } else {
          for (let x = 0; x < files.length; x++) {
            await new Promise((resolve) => {
              totalImporters++;
              const listener = importerListener(() => {
                importer.off('status', listener);
                resolve(true);
              });
              importer.on('status', listener);
              importer.importNotes([files[x]]);
            });
          }
        }
      }
    });
  };
}

export default MultipleImporter;
