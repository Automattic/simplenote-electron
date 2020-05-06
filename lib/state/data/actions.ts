import * as A from '../action-types';
import * as T from '../../types';

export const addNote: A.ActionCreator<A.NoteAction> = (
  noteId: T.EntityId,
  data: T.Note
) => ({
  type: 'ADD_NOTE',
  noteId,
  data,
});

export const removeNote: A.ActionCreator<A.NoteAction> = (
  noteId: T.EntityId
) => ({
  type: 'REMOVE_NOTE',
  noteId,
});

export const remoteNoteUpdate: A.ActionCreator<A.RemoteNoteUpdate> = (
  noteId: T.EntityId,
  data: T.Note
) => ({
  type: 'REMOTE_NOTE_UPDATE',
  noteId,
  data,
});
