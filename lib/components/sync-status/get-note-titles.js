import { compact } from 'lodash';
import noteTitleAndPreview from '../../utils/note-utils';

const getNoteTitles = (ids, notes, limit = Infinity) => {
  const matchedNotes = ids.map((id, i) => {
    if (i >= limit) {
      return;
    }

    const note = notes.find(thisNote => thisNote.id === id);

    if (!note) {
      // eslint-disable-next-line no-console
      console.log(`Could not find note with id '${id}'`);
      return null;
    }

    return { id, title: noteTitleAndPreview(note).title };
  });

  return compact(matchedNotes);
};

export default getNoteTitles;
