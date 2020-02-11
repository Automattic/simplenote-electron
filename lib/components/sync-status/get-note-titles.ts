import noteTitleAndPreview from '../../utils/note-utils';

import * as T from '../../types';

type NoteTitle = {
  id: String;
  title: String;
};

const getNoteTitles = (
  ids: String[] = [],
  notes: T.NoteEntity[] = [],
  limit: number = Infinity
) => {
  const matchedNotes = ids.reduce((acc: NoteTitle[], id: String) => {
    const note = notes.find((thisNote: T.NoteEntity) => thisNote.id === id);
    return note
      ? [...acc, { id, title: noteTitleAndPreview(note).title }]
      : acc;
  }, []);

  return matchedNotes.slice(0, limit);
};

export default getNoteTitles;
