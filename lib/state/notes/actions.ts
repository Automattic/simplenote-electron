import * as A from '../action-types';
import * as T from '../../types';

export const notesLoaded: A.ActionCreator<A.NotesLoaded> = (
  notes: T.NoteEntity[]
) => ({
  type: 'NOTES_LOADED',
  notes,
});
