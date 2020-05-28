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
      });

    case 'EDIT_NOTE':
      return state.has(action.noteId)
        ? new Map(state).set(action.noteId, {
            ...state.get(action.noteId)!,
            ...action.changes,
          })
        : state;

    case 'IMPORT_NOTE_WITH_ID':
      return new Map(state).set(action.noteId, action.note);

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

    default:
      return state;
  }
};

export default combineReducers({
  analyticsAllowed,
  notes,
  tags,
});
