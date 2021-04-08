import * as A from '../action-types';
import * as T from '../../types';

export const addCollaborator: A.ActionCreator<A.AddCollaborator> = (
  noteId: T.EntityId,
  collaboratorAccount: T.TagName
) => ({
  type: 'ADD_COLLABORATOR',
  noteId,
  collaboratorAccount,
});

export const editNote: A.ActionCreator<A.EditNote> = (
  noteId: T.EntityId,
  changes: Partial<T.Note>
) => ({
  type: 'EDIT_NOTE',
  noteId,
  changes,
});

export const exportNotes: A.ActionCreator<A.ExportNotes> = () => ({
  type: 'EXPORT_NOTES',
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

export const removeCollaborator: A.ActionCreator<A.RemoveCollaborator> = (
  noteId: T.EntityId,
  collaboratorAccount: T.TagName
) => ({
  type: 'REMOVE_COLLABORATOR',
  noteId,
  collaboratorAccount,
});

export const renameTag: A.ActionCreator<A.RenameTag> = (
  oldTagName: T.TagName,
  newTagName: T.TagName
) => ({
  type: 'RENAME_TAG',
  oldTagName,
  newTagName,
});

export const toggleAnalytics: A.ActionCreator<A.ToggleAnalytics> = () => ({
  type: 'TOGGLE_ANALYTICS',
});

export const restoreNoteRevision: A.ActionCreator<A.RestoreNoteRevision> = (
  noteId: T.EntityId,
  version: number,
  includeDeletedTags: boolean
) => ({
  type: 'RESTORE_NOTE_REVISION',
  noteId,
  version,
  includeDeletedTags,
});
