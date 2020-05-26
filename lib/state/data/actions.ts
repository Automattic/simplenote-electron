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

export const toggleAnalytics: A.ActionCreator<A.ToggleAnalytics> = () => ({
  type: 'TOGGLE_ANALYTICS',
});
