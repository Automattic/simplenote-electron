import { combineReducers } from 'redux';

import {
  tagHashOf as t,
  tagNameOf,
  withTag,
  withoutTag,
} from '../../utils/tag-hash';

import type * as A from '../action-types';
import type * as T from '../../types';

export const analyticsAllowed: A.Reducer<boolean | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'REMOTE_ANALYTICS_UPDATE':
    case 'SET_ANALYTICS':
      return action.allowAnalytics;

    default:
      return state;
  }
};

const accountVerification: A.Reducer<T.VerificationState> = (
  state = 'unknown',
  action
) => (action.type === 'UPDATE_ACCOUNT_VERIFICATION' ? action.state : state);

const modified = <Entity extends { modificationDate: number }>(
  entity: Entity
): Entity => ({
  ...entity,
  modificationDate: Date.now() / 1000,
});

export const notes: A.Reducer<Map<T.EntityId, T.Note>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'ADD_COLLABORATOR':
    case 'ADD_NOTE_TAG': {
      const note = state.get(action.noteId);
      if (!note) {
        return state;
      }

      const tagName =
        action.type === 'ADD_COLLABORATOR'
          ? action.collaboratorAccount
          : action.tagName;

      const tags = withTag(note.tags, tagName);

      return tags !== note.tags
        ? new Map(state).set(action.noteId, modified({ ...note, tags }))
        : state;
    }

    case 'CREATE_NOTE_WITH_ID':
      return new Map(state).set(action.noteId, {
        content: '',
        creationDate: Date.now() / 1000,
        modificationDate: Date.now() / 1000,
        deleted: false,
        publishURL: '',
        shareURL: '',
        systemTags: [],
        tags: [],
        ...action.note,
      });

    case 'DELETE_NOTE_FOREVER':
    case 'NOTE_BUCKET_REMOVE':
    case 'REMOTE_NOTE_DELETE_FOREVER': {
      if (!state.has(action.noteId)) {
        return state;
      }

      const next = new Map(state);
      next.delete(action.noteId);
      return next;
    }

    case 'EDIT_NOTE': {
      const prev = state.get(action.noteId) ?? {
        content: '',
        creationDate: Date.now() / 1000,
        modificationDate: Date.now() / 1000,
        deleted: false,
        publishURL: '',
        shareURL: '',
        systemTags: [],
        tags: [],
      };

      return new Map(state).set(
        action.noteId,
        modified({ ...prev, ...action.changes })
      );
    }

    case 'NOTE_BUCKET_UPDATE':
    case 'REMOTE_NOTE_UPDATE':
      return new Map(state).set(action.noteId, action.note);

    case 'RESTORE_NOTE_REVISION':
      // don't update the modified stamp here. we want to borrow the original
      // to make it clearer that this copy of the note came from history
      return action.note
        ? new Map(state).set(action.noteId, action.note)
        : state;

    case 'IMPORT_NOTE_WITH_ID': {
      return new Map(state).set(action.noteId, action.note);
    }

    case 'MARKDOWN_NOTE': {
      if (!state.has(action.noteId)) {
        return state;
      }

      const note = state.get(action.noteId)!;
      const alreadyMarkdown = note.systemTags.includes('markdown');
      if (alreadyMarkdown === action.shouldEnableMarkdown) {
        return state;
      }

      const systemTags = action.shouldEnableMarkdown
        ? [...note.systemTags, 'markdown' as T.SystemTag]
        : note.systemTags.filter((tag) => tag !== 'markdown');

      return new Map(state).set(
        action.noteId,
        modified({ ...note, systemTags })
      );
    }

    case 'PIN_NOTE': {
      if (!state.has(action.noteId)) {
        return state;
      }

      const note = state.get(action.noteId)!;
      const alreadyPinned = note.systemTags.includes('pinned');
      if (alreadyPinned === action.shouldPin) {
        return state;
      }

      const systemTags = action.shouldPin
        ? [...note.systemTags, 'pinned' as T.SystemTag]
        : note.systemTags.filter((tag) => tag !== 'pinned');

      return new Map(state).set(
        action.noteId,
        modified({ ...note, systemTags })
      );
    }

    case 'PUBLISH_NOTE': {
      if (!state.has(action.noteId)) {
        return state;
      }

      const note = state.get(action.noteId)!;
      const alreadyPinned = note.systemTags.includes('published');
      if (alreadyPinned === action.shouldPublish) {
        return state;
      }

      const systemTags = action.shouldPublish
        ? [...note.systemTags, 'published' as T.SystemTag]
        : note.systemTags.filter((tag) => tag !== 'published');

      return new Map(state).set(
        action.noteId,
        modified({ ...note, systemTags })
      );
    }

    case 'REMOVE_COLLABORATOR':
    case 'REMOVE_NOTE_TAG': {
      const note = state.get(action.noteId);
      if (!note) {
        return state;
      }

      const tagName =
        action.type === 'REMOVE_COLLABORATOR'
          ? action.collaboratorAccount
          : action.tagName;

      const tags = withoutTag(note.tags, tagName);

      return tags !== note.tags
        ? new Map(state).set(action.noteId, modified({ ...note, tags }))
        : state;
    }

    case 'RENAME_TAG': {
      const oldHash = t(action.oldTagName);
      const newHash = t(action.newTagName);
      const next = new Map(state);
      if (oldHash === newHash) {
        return next;
      }
      next.forEach((note, noteId) => {
        const newTags: T.TagName[] = [];
        const hashes = new Set<T.TagHash>();
        let hasRenamedTag = false;

        note.tags.forEach((tagName) => {
          const hash = t(tagName);

          // if we get through this and haven't seen the renamed tag then we
          // can return the original tag state and avoid modifying the note
          hasRenamedTag = hasRenamedTag || hash === oldHash || hash === newHash;

          if (hashes.has(hash)) {
            return;
          }

          if (oldHash !== hash) {
            hashes.add(hash);
            newTags.push(tagName);
          }

          if (!hashes.has(newHash)) {
            hashes.add(newHash);
            newTags.push(action.newTagName);
          }
        });

        if (!hasRenamedTag) {
          return;
        }

        next.set(noteId, modified({ ...note, tags: newTags }));
      });

      return next;
    }

    case 'RESTORE_NOTE':
      if (!state.has(action.noteId)) {
        return state;
      }

      return new Map(state).set(
        action.noteId,
        modified({
          ...state.get(action.noteId)!,
          deleted: false,
        })
      );

    case 'TRASH_NOTE':
      if (!state.has(action.noteId)) {
        return state;
      }

      return new Map(state).set(
        action.noteId,
        modified({
          ...state.get(action.noteId)!,
          deleted: true,
        })
      );

    case 'TRASH_TAG': {
      const next = new Map(state);
      let changedIt = false;

      next.forEach((note, noteId) => {
        const tags = withoutTag(note.tags, action.tagName);

        if (tags === note.tags) {
          return;
        }

        changedIt = true;
        next.set(noteId, modified({ ...note, tags }));
      });

      return changedIt ? next : state;
    }

    default:
      return state;
  }
};

export const noteRevisions: A.Reducer<Map<T.EntityId, Map<number, T.Note>>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'LOAD_REVISIONS': {
      // merge the new revisions - we might have fewer inbound than we have stored
      const stored = state.get(action.noteId) ?? new Map();
      const next = new Map(stored);
      action.revisions.forEach(([version, note]) => next.set(version, note));

      return new Map(state).set(action.noteId, next);
    }

    default:
      return state;
  }
};

export const preferences: A.Reducer<Map<T.EntityId, T.Preferences>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'SET_ANALYTICS':
      return new Map(state).set('preferences-key', {
        ...(state.get('preferences-key') ?? {}),
        analytics_enabled: action.allowAnalytics,
      });

    case 'PREFERENCES_BUCKET_REMOVE': {
      const next = new Map(state);
      return next.delete(action.id) ? next : state;
    }

    case 'PREFERENCES_BUCKET_UPDATE':
      return new Map(state).set(action.id, action.data);

    default:
      return state;
  }
};

export const tags: A.Reducer<Map<T.TagHash, T.Tag>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'ADD_COLLABORATOR':
    case 'ADD_NOTE_TAG': {
      const tagName =
        action.type === 'ADD_COLLABORATOR'
          ? action.collaboratorAccount
          : action.tagName;

      return state.has(t(tagName))
        ? state
        : new Map(state).set(t(tagName), { name: tagName });
    }

    case 'EDIT_NOTE':
    case 'IMPORT_NOTE_WITH_ID': {
      const newTags =
        'EDIT_NOTE' === action.type ? action.changes.tags : action.note.tags;

      if (!newTags?.length) {
        return state;
      }

      const next = new Map(state);
      let hasUpdates = false;
      newTags.forEach((tagName) => {
        const tagHash = t(tagName);

        if (!state.has(tagHash)) {
          next.set(tagHash, { name: tagName });
          hasUpdates = true;
        }
      });

      return hasUpdates ? next : state;
    }

    case 'REMOTE_TAG_DELETE':
    case 'TAG_BUCKET_REMOVE': {
      const next = new Map(state);
      return next.delete(action.tagHash) ? next : state;
    }

    case 'REMOTE_TAG_UPDATE':
    case 'TAG_BUCKET_UPDATE':
      return new Map(state).set(action.tagHash, action.tag);

    case 'RENAME_TAG': {
      const prevHash = t(action.oldTagName);
      const nextHash = t(action.newTagName);

      const next = new Map(state);
      const prevTag = state.get(prevHash) ?? {};
      next.set(nextHash, { ...prevTag, name: action.newTagName });

      if (prevHash !== nextHash) {
        next.delete(prevHash);
      }

      return next;
    }

    case 'REORDER_TAG': {
      const actionTagHash = t(action.tagName);
      const actionTag = state.get(actionTagHash);
      if (!actionTag) {
        return state;
      }

      const next = new Map(state);
      next.delete(actionTagHash);
      ([...next.entries()] as [T.TagHash, T.Tag][])
        .sort((a, b) =>
          'undefined' !== typeof a[1].index && 'undefined' !== typeof b[1].index
            ? a[1].index - b[1].index
            : 'undefined' === typeof a[1].index
            ? 1
            : -1
        )
        .forEach(([tagId, tag], index) => {
          next.set(tagId, {
            ...tag,
            index: index < action.newIndex ? index : index + 1,
          });
        });
      next.set(actionTagHash, { ...actionTag, index: action.newIndex });

      return next;
    }

    case 'TAG_REFRESH': {
      const next = new Map(state);
      action.noteTags.forEach((noteIds, tagHash) => {
        if (!next.has(tagHash)) {
          next.set(tagHash, { name: tagNameOf(tagHash) });
        }
      });

      return next;
    }

    case 'TRASH_TAG': {
      const next = new Map(state);
      return next.delete(t(action.tagName)) ? next : state;
    }

    default:
      return state;
  }
};

export const noteTags: A.Reducer<Map<T.TagHash, Set<T.EntityId>>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'ADD_COLLABORATOR':
    case 'ADD_NOTE_TAG': {
      const tagHash = t(
        action.type === 'ADD_COLLABORATOR'
          ? action.collaboratorAccount
          : action.tagName
      );
      return new Map(state).set(
        tagHash,
        (state.get(tagHash) ?? new Set()).add(action.noteId)
      );
    }

    case 'EDIT_NOTE':
    case 'IMPORT_NOTE_WITH_ID': {
      const newTags =
        'EDIT_NOTE' === action.type ? action.changes.tags : action.note.tags;

      if (!newTags?.length) {
        return state;
      }

      const { noteId } = action;
      const newHashes = new Set(newTags.map(t));
      const next = new Map(state);
      next.forEach((notes, tagHash) => {
        // the note no longer has this tag
        if (notes.has(noteId) && !newHashes.has(tagHash)) {
          const nextNotes = new Set(notes);
          nextNotes.delete(noteId);
          next.set(tagHash, nextNotes);
          return;
        }

        // the note now has this tag but didn't before
        if (!notes.has(noteId) && newHashes.has(tagHash)) {
          next.set(tagHash, new Set(notes).add(noteId));
        }
      });

      return next;
    }

    case 'TAG_REFRESH':
      return action.noteTags;

    case 'REMOTE_TAG_DELETE':
    case 'TAG_BUCKET_REMOVE': {
      const next = new Map(state);
      return next.delete(action.tagHash) ? next : state;
    }

    case 'REMOVE_COLLABORATOR':
    case 'REMOVE_NOTE_TAG': {
      const tagHash = t(
        action.type === 'REMOVE_COLLABORATOR'
          ? action.collaboratorAccount
          : action.tagName
      );
      const tagNotes = state.get(tagHash);
      if (!tagNotes) {
        return state;
      }

      const next = new Set(tagNotes);
      return next.delete(action.noteId)
        ? new Map(state).set(tagHash, next)
        : state;
    }

    case 'TRASH_TAG': {
      const next = new Map(state);
      return next.delete(t(action.tagName)) ? next : state;
    }

    default:
      return state;
  }
};

export default combineReducers({
  accountVerification,
  analyticsAllowed,
  notes,
  noteRevisions,
  noteTags,
  preferences,
  tags,
});
