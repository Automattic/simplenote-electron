import { combineReducers } from 'redux';
import { v4 as uuid } from 'uuid';

import * as A from '../action-types';
import * as T from '../../types';

export const analyticsAllowed: A.Reducer<boolean | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'SET_ANALYTICS':
      return action.allowAnalytics;

    default:
      return state;
  }
};

export const notes: A.Reducer<Map<T.EntityId, T.Note>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'ADD_NOTE_TAG': {
      const note = state.get(action.noteId);
      if (!note) {
        return state;
      }

      return new Map(state).set(action.noteId, {
        ...note,
        tags: [...note.tags, action.tagName],
      });
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

    case 'CONFIRM_NEW_NOTE': {
      const next = new Map(state).set(action.newNoteId, action.note);
      next.delete(action.originalNoteId);

      return next;
    }

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

    case 'EDIT_NOTE':
    case 'NOTE_BUCKET_UPDATE':
    case 'REMOTE_NOTE_UPDATE': {
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

      return new Map(state).set(action.noteId, {
        ...prev,
        ...('EDIT_NOTE' === action.type ? action.changes : action.note),
      });
    }

    case 'RESTORE_NOTE_REVISION':
      return action.note
        ? new Map(state).set(action.noteId, action.note)
        : state;

    case 'IMPORT_NOTE_WITH_ID': {
      return new Map(state).set(action.noteId, action.note);
    }

    case 'INSERT_TASK_INTO_NOTE': {
      const note = state.get(action.noteId);
      if (!note) {
        return state;
      }

      const rawOffset = Math.min(action.selection[0], action.selection[1]);
      const offset =
        note.content[rawOffset] === '\n' ? rawOffset - 1 : rawOffset;
      const closestLineStart = note.content.lastIndexOf('\n', offset) + 1;

      if (/^(\s*- \[ |x] )/i.test(note.content.slice(closestLineStart))) {
        // we already got one - zap it
        return new Map(state).set(action.noteId, {
          ...note,
          content:
            note.content.slice(0, closestLineStart) +
            note.content
              .slice(closestLineStart)
              .replace(/^(\s*- \[(?: |x)\] )/i, ''),
        });
      }

      return new Map(state).set(action.noteId, {
        ...note,
        content:
          note.content.slice(0, closestLineStart) +
          ' - [ ] ' +
          note.content.slice(closestLineStart),
      });
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

      return new Map(state).set(action.noteId, { ...note, systemTags });
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

      return new Map(state).set(action.noteId, { ...note, systemTags });
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

      return new Map(state).set(action.noteId, { ...note, systemTags });
    }

    case 'REMOVE_NOTE_TAG': {
      const note = state.get(action.noteId);
      if (!note) {
        return state;
      }

      return new Map(state).set(action.noteId, {
        ...note,
        tags: note.tags.filter((tag) => tag !== action.tagName),
      });
    }

    case 'RESTORE_NOTE':
      if (!state.has(action.noteId)) {
        return state;
      }

      return new Map(state).set(action.noteId, {
        ...state.get(action.noteId)!,
        deleted: false,
      });

    case 'TRASH_NOTE':
      if (!state.has(action.noteId)) {
        return state;
      }

      return new Map(state).set(action.noteId, {
        ...state.get(action.noteId)!,
        deleted: true,
      });

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

export const tags: A.Reducer<[
  Map<T.EntityId, T.Tag>,
  Map<string, T.EntityId>
]> = (state = [new Map(), new Map()], action) => {
  const [tagIds, tagNames] = state;

  switch (action.type) {
    case 'ADD_NOTE_TAG':
      if (tagNames.has(action.tagName.toLocaleLowerCase())) {
        return state;
      } else {
        const tagId = uuid();
        const nextTags = new Map(tagIds).set(tagId, { name: action.tagName });
        const nextNames = new Map(tagNames).set(
          action.tagName.toLocaleLowerCase(),
          tagId
        );

        return [nextTags, nextNames];
      }

    case 'CONFIRM_NEW_TAG': {
      const nextTags = new Map(tagIds).set(action.newTagId, action.tag);
      const nextNames = new Map(tagNames);
      nextTags.delete(action.originalTagId);
      nextNames.delete(action.tagName);

      nextNames.set(action.tag.name.toLocaleLowerCase(), action.newTagId);

      return [nextTags, nextNames];
    }

    case 'EDIT_NOTE': {
      if (
        !action.changes.tags?.some(
          (tag) => !tagNames.has(tag.toLocaleLowerCase())
        )
      ) {
        return state;
      }

      const nextIds = new Map(tagIds);
      const nextNames = new Map(tagNames);

      action.changes.tags.forEach((tag) => {
        if (!nextNames.has(tag)) {
          const id = uuid();
          nextIds.set(id, { name: tag });
          nextNames.set(tag.toLocaleLowerCase(), id);
        }
      });

      return [nextIds, nextNames];
    }

    case 'IMPORT_NOTE_WITH_ID': {
      if (
        !action.note.tags?.some((tag) => !tagNames.has(tag.toLocaleLowerCase()))
      ) {
        return state;
      }

      const nextIds = new Map(tagIds);
      const nextNames = new Map(tagNames);

      action.note.tags.forEach((tag) => {
        if (!nextNames.has(tag)) {
          const id = uuid();
          nextIds.set(id, { name: tag });
          nextNames.set(tag.toLocaleLowerCase(), id);
        }
      });

      return [nextIds, nextNames];
    }

    case 'REMOTE_TAG_DELETE':
    case 'TAG_BUCKET_REMOVE': {
      if (!tagIds.has(action.tagId)) {
        return state;
      }

      const nextTags = new Map(tagIds);
      nextTags.delete(action.tagId);

      const nextNames = new Map(tagNames);
      nextNames.delete(tagIds.get(action.tagId).name.toLocaleLowerCase());

      return [nextTags, nextNames];
    }

    case 'REMOTE_TAG_UPDATE':
    case 'TAG_BUCKET_UPDATE':
      if (tagIds.has(action.tagId)) {
        const nextTags = new Map(tagIds);
        nextTags.set(action.tagId, action.tag);

        const nextNames = new Map(tagNames);
        nextNames.delete(tagIds.get(action.tagId).name.toLocaleLowerCase());
        nextNames.set(action.tag.name.toLocaleLowerCase(), action.tagId);

        return [nextTags, nextNames];
      } else {
        // insert a new tag
        return [
          new Map(tagIds).set(action.tagId, action.tag),
          new Map(tagNames).set(
            action.tag.name.toLocaleLowerCase(),
            action.tagId
          ),
        ];
      }

    case 'RENAME_TAG': {
      const tagId = tagNames.get(action.oldTagName.toLocaleLowerCase());
      if (!tagId) {
        return state;
      }

      const tag = tagIds.get(tagId);
      if (!tag) {
        return state;
      }

      const nextTags = new Map(tagIds).set(tagId, {
        ...tag,
        name: action.newTagName,
      });
      const nextNames = new Map(tagNames);
      nextNames.delete(action.oldTagName);
      nextNames.set(action.newTagName.toLocaleLowerCase(), tagId);

      return [nextTags, nextNames];
    }

    case 'REORDER_TAG': {
      const actionTagId = tagNames.get(action.tagName.toLocaleLowerCase());
      if (!actionTagId) {
        return state;
      }

      const actionTag = tagIds.get(actionTagId);
      if (!actionTag) {
        return state;
      }

      const nextTags = new Map(tagIds);
      nextTags.delete(actionTagId);
      ([...nextTags.entries()] as [T.EntityId, T.Tag][])
        .sort((a, b) =>
          'undefined' !== typeof a[1].index && 'undefined' !== typeof b[1].index
            ? a[1].index - b[1].index
            : 'undefined' === typeof a[1].index
            ? 1
            : -1
        )
        .forEach(([tagId, tag], index) => {
          nextTags.set(tagId, {
            ...tag,
            index: index < action.newIndex ? index : index + 1,
          });
        });
      nextTags.set(actionTagId, { ...actionTag, index: action.newIndex });

      return [nextTags, tagNames];
    }

    case 'TRASH_TAG': {
      const nextTags = new Map(tagIds);
      const nextNames = new Map(tagNames);
      const tagId = tagNames.get(action.tagName.toLocaleLowerCase());

      if (!tagId) {
        return state;
      }

      nextTags.delete(tagId);
      nextNames.delete(action.tagName.toLocaleLowerCase());

      return [nextTags, nextNames];
    }

    default:
      return state;
  }
};

export default combineReducers({
  analyticsAllowed,
  notes,
  noteRevisions,
  tags,
});
