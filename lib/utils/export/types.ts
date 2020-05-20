import * as T from '../../types';

export type ExportNote = {
  content: string;
  collaboratorEmails: T.TagName[];
  creationDate: T.SecondsEpoch;
  id: T.EntityId;
  markdown?: boolean;
  modificationDate: T.SecondsEpoch;
  pinned?: boolean;
  publicURL?: string;
  tags: T.TagName[];
};

export type GroupedExportNotes = {
  activeNotes: ExportNote[];
  trashedNotes: ExportNote[];
};
