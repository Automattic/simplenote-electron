import { partition } from 'lodash';

import * as A from '../action-types';
import * as T from '../../types';

const notes: A.Reducer<T.NoteEntity[]> = (state = [], action) => {
  switch (action.type) {
    case 'NOTES_LOADED': {
      const [pinned, notPinned] = partition(
        action.notes,
        (note: T.NoteEntity) => note.data.systemTags.includes('pinned')
      );
      return [...pinned, ...notPinned];
    }
    default:
      return state;
  }
};

export default notes;
