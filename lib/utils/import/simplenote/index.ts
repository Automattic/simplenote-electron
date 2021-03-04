import { EventEmitter } from 'events';
import CoreImporter from '../';
import { endsWith, isEmpty } from 'lodash';
import Ajv, { JSONSchemaType } from 'ajv';

const ajv = new Ajv();

import * as T from '../../../types';
import { GroupedExportNotes } from '../../export/types';

class SimplenoteImporter extends EventEmitter {
  constructor(addNote: (note: T.Note) => any, options) {
    super();
    this.addNote = addNote;
    this.options = options;
  }

  importNotes = (filesArray) => {
    const coreImporter = new CoreImporter(this.addNote);

    if (isEmpty(filesArray)) {
      this.emit('status', 'error', 'No file to import.');
      return;
    }

    const file = filesArray[0];

    if (!endsWith(file.name.toLowerCase(), '.json')) {
      this.emit('status', 'error', 'File name does not end in ".json".');
      return;
    }

    // Limit file size we will read to 5mb
    if (file.size > 5000000) {
      this.emit('status', 'error', 'File should be less than 5 MB.');
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = (event) => {
      const fileContent = event.target.result;

      if (!fileContent) {
        this.emit('status', 'error', 'File was empty.');
        return;
      }

      const exportNoteElements = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          creationDate: { type: 'timestamp' },
          lastModified: { type: 'timestamp' },

          pinned: { type: 'boolean' },
          markdown: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          publicURL: { type: 'string' },
          collaboratorEmails: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'content', 'creationDate', 'lastModified'],
      };
      const schema: JSONSchemaType<GroupedExportNotes> = {
        type: 'object',
        properties: {
          activeNotes: { type: 'array', items: exportNoteElements },
          trashedNotes: { type: 'array', items: exportNoteElements },
        },
        required: ['activeNotes', 'trashedNotes'],
      };
      const validate = ajv.compile(schema);

      let dataObj;
      try {
        dataObj = JSON.parse(fileContent);
        if (!validate(dataObj)) {
          this.emit('status', 'error', 'Invalid json file schema.');
          return;
        }
      } catch (error) {
        this.emit('status', 'error', 'Invalid json file.');
        return;
      }

      const noteCount =
        dataObj.activeNotes.length + dataObj.trashedNotes.length;
      const processedNotes = {
        activeNotes: convertModificationDates(dataObj.activeNotes),
        trashedNotes: convertModificationDates(dataObj.trashedNotes),
      };

      coreImporter.importNotes(processedNotes, this.options).then(() => {
        this.emit('status', 'complete', noteCount);
      });
    };

    fileReader.readAsText(file);
  };
}

export function convertModificationDates(notes) {
  return notes.map(({ lastModified, ...note }) => {
    // Account for Simplenote's exported `lastModified` date
    let modificationDate = note.modificationDate || lastModified;

    // Convert to timestamp
    if (modificationDate && isNaN(modificationDate)) {
      modificationDate = new Date(modificationDate).getTime() / 1000;
    }
    const resultNote = { ...note };
    if (modificationDate) {
      resultNote.modificationDate = modificationDate;
    }
    return resultNote;
  });
}

export default SimplenoteImporter;
