import filterAtMost from '../../utils/filter-at-most';
import noteTitleAndPreview from '../../utils/note-utils';

import * as T from '../../types';

type NoteTitle = {
  id: T.EntityId;
  title: string;
};

const getNoteTitles = (
  ids: T.EntityId[],
  notes: T.NoteEntity[] | null,
  limit: number = Infinity
): NoteTitle[] => {
  if (!notes) {
    return [];
  }
  const wantedIds = new Set(ids);
  const wantedNotes = filterAtMost(
    notes,
    ({ id }: { id: T.EntityId }) => wantedIds.has(id),
    limit
  );

  return wantedNotes.map((note: T.NoteEntity) => ({
    id: note.id,
    title: noteTitleAndPreview(note).title,
  }));
};

export default getNoteTitles;
