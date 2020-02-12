import noteTitleAndPreview from '../../utils/note-utils';

import * as T from '../../types';

type NoteTitle = {
  id: T.EntityId;
  title: string;
};

const getNoteTitles = (
  ids: T.EntityId[] = [],
  notes: T.NoteEntity[] = [],
  limit: number = Infinity
) => {
  const matchedNotes = ids.reduce((acc: NoteTitle[], id): NoteTitle[] => {
    const note = notes.find(thisNote => thisNote.id === id);
    return note
      ? [...acc, { id, title: noteTitleAndPreview(note).title }]
      : acc;
  }, []);

  return matchedNotes.slice(0, limit);
};

export default getNoteTitles;
