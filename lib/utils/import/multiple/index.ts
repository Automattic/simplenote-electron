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

    // Loop through each of the files to import and process them with the appropriate importer
    this.importFiles.forEach(async (files, name) => {
      if (files.length > 0) {
        totalImporters++;
        const { default: Importer } = await importers.load(name);
        const importer = new Importer(
          this.addNote,
          this.options,
          this.recordEvent
        );
        importer.on('status', (type, arg) => {
          if (type === 'complete') {
            importersCompleted++;
            importedNoteCount += arg;
            if (totalImporters === importersCompleted) {
              this.emit('status', 'complete', importedNoteCount);
            }
          } else {
            this.emit('status', type, arg);
          }
        });
        importer.importNotes(this.importFiles.get(name));
      }
    });
  };
}

export default MultipleImporter;
