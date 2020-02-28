import * as A from '../action-types';
import * as T from '../../types';

export const remoteNoteUpdate: A.ActionCreator<A.RemoteNoteUpdate> = (
  noteId: T.EntityId,
  data: T.Note
) => ({
  type: 'REMOTE_NOTE_UPDATE',
  noteId,
  data,
});
