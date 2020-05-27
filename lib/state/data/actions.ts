import * as A from '../action-types';
import * as T from '../../types';

export const editNote: A.ActionCreator<A.EditNote> = (
  noteId: T.EntityId,
  changes: Partial<T.Note>
) => ({
  type: 'EDIT_NOTE',
  noteId,
  changes,
});

export const importNote: A.ActionCreator<A.ImportNote> = (note: T.Note) => ({
  type: 'IMPORT_NOTE',
  note,
});

export const toggleAnalytics: A.ActionCreator<A.ToggleAnalytics> = () => ({
  type: 'TOGGLE_ANALYTICS',
});
