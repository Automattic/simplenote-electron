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

export const markdownNote: A.ActionCreator<A.MarkdownNote> = (
  noteId: T.EntityId,
  shouldEnableMarkdown: boolean
) => ({
  type: 'MARKDOWN_NOTE',
  noteId,
  shouldEnableMarkdown,
});

export const pinNote: A.ActionCreator<A.PinNote> = (
  noteId: T.EntityId,
  shouldPin: boolean
) => ({
  type: 'PIN_NOTE',
  noteId,
  shouldPin,
});

export const publishNote: A.ActionCreator<A.PublishNote> = (
  noteId: T.EntityId,
  shouldPublish: boolean
) => ({
  type: 'PUBLISH_NOTE',
  noteId,
  shouldPublish,
});

export const toggleAnalytics: A.ActionCreator<A.ToggleAnalytics> = () => ({
  type: 'TOGGLE_ANALYTICS',
});
