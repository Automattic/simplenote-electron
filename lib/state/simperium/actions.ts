import * as A from '../action-types';
import * as T from '../../types';

export const remoteNoteUpdate: A.ActionCreator<A.RemoteNoteUpdate> = (
  noteId: T.EntityId,
  note: T.Note
) => ({
  type: 'REMOTE_NOTE_UPDATE',
  noteId,
  note,
});

export const reallyLogOut: A.ActionCreator<A.ReallyLogOut> = () => ({
  type: 'REALLY_LOG_OUT',
});
