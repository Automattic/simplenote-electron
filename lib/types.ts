type EntityId = string;
type SecondsEpoch = number;

export type NoteEntity = {
  id: EntityId;
  data: Note;
  version: number;
};

export type Note = {
  content: string;
  modificationDate: SecondsEpoch;
  tags: string[];
};
