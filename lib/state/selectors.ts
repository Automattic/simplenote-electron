import * as S from './';
import * as T from '../types';
import isEmailTag from '../utils/is-email-tag';
import { tagHashOf } from '../utils/tag-hash';

/**
 * "Narrow" views hide the note editor
 *
 * @see _variables.scss for 750 constant as $single-column value
 */
export const isSmallScreen: S.Selector<boolean> = (state) =>
  state.browser.windowWidth <= 750;

export const getTheme: S.Selector<'light' | 'dark'> = (state) =>
  state.settings.theme === 'system'
    ? state.browser.systemTheme
    : state.settings.theme;

export const notesAreEqual = (
  a: T.Note | undefined,
  b: T.Note | undefined
): boolean =>
  !!(
    a &&
    b &&
    a.content === b.content &&
    a.creationDate === b.creationDate &&
    a.modificationDate === b.modificationDate &&
    !!a.deleted === !!b.deleted &&
    a.publishURL === b.publishURL &&
    a.shareURL === b.shareURL &&
    a.tags.length === b.tags.length &&
    a.systemTags.length === b.systemTags.length &&
    a.tags.every((tag) => b.tags.includes(tag)) &&
    a.systemTags.every((tag) => b.systemTags.includes(tag))
  );

export const noteHasPendingChanges: S.Selector<boolean> = (
  state,
  noteId: T.EntityId
) =>
  !notesAreEqual(
    state.data.notes.get(noteId),
    state.simperium.ghosts[1].get('note')?.get(noteId)?.data
  );

export const shouldShowEmailVerification: S.Selector<boolean> = ({
  data: { accountVerification: status },
}) => status === 'unverified' || status === 'pending';

export const openedTag: S.Selector<T.TagName | null> = ({
  ui: { collection },
}) => (collection.type === 'tag' && collection.tagName) || null;

export const showTrash: S.Selector<boolean> = ({ ui: { collection } }) =>
  collection.type === 'trash';
export const isDialogOpen = (state: S.State, name: T.DialogType['type']) =>
  state.ui.dialogs.find(({ type }) => type === name) !== undefined;

export const numberOfNonEmailTags: S.Selector<number> = ({ data }) =>
  [...data.tags.values()].filter((tag) => !isEmailTag(tag.name)).length;

export const noteCanonicalTags: S.Selector<T.TagName[]> = (
  { data },
  note: T.Note
) => {
  return note.tags.filter((tagName) => !isEmailTag(tagName));
};

export const getRevision: S.Selector<T.Note | null> = (
  state,
  noteId: T.EntityId,
  revisionVersion: number,
  includeDeletedTags: boolean
) => {
  const note = state.data.notes.get(noteId);
  const revisions = state.data.noteRevisions.get(noteId);
  const revision = revisions?.get(revisionVersion);

  if (!note || !revision) {
    return null;
  }

  const noteEmailTags = note.tags.filter((tagName) => isEmailTag(tagName));
  const revisionCanonicalTags = revision.tags.filter((tagName) => {
    const tagHash = tagHashOf(tagName);
    const hasTag = state.data.tags.has(tagHash);
    return !isEmailTag(tagName) && (hasTag || includeDeletedTags);
  });

  return {
    ...revision,
    tags: [...noteEmailTags, ...revisionCanonicalTags],
    systemTags: note.systemTags,
  };
};
