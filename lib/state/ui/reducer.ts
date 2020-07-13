import { combineReducers } from 'redux';

import { tagHashOf } from '../../utils/tag-hash';

import type * as A from '../action-types';
import type * as T from '../../types';

const emptyList: unknown[] = [];

const withCheckboxCharacters = (s: string): string =>
  s
    .replace(/^(\s*)- \[ \](\s)/gm, '$1\ue000$2')
    .replace(/^(\s*)- \[x\](\s)/gim, '$1\ue001$2');

const withCheckboxSyntax = (s: string): string =>
  s.replace(/\ue000/g, '- [ ]').replace(/\ue001/g, '- [x]');

const editorSelection: A.Reducer<Map<
  T.EntityId,
  [number, number, 'RTL' | 'LTR']
>> = (state = new Map(), action) => {
  switch (action.type) {
    case 'CONFIRM_NEW_NOTE': {
      const prev = state.get(action.originalNoteId);
      if (!prev) {
        return state;
      }

      const next = new Map(state).set(action.newNoteId, prev);
      next.delete(action.originalNoteId);

      return next;
    }

    case 'REMOTE_NOTE_UPDATE': {
      if (
        action.remoteInfo?.patch?.content?.o !== 'd' ||
        !state.has(action.noteId)
      ) {
        return state;
      }

      const [_prevStart, _prevEnd, direction] = state.get(action.noteId)!;
      const patches = action.remoteInfo.patch.content.v.split('\t');

      const original = action.remoteInfo.original.content;
      const prevStart = withCheckboxSyntax(
        withCheckboxCharacters(original).slice(0, _prevStart)
      ).length;
      const prevEnd = withCheckboxSyntax(
        withCheckboxCharacters(original).slice(0, _prevEnd)
      ).length;

      const [_nextStart, _nextEnd] = patches.reduce(
        (offsets: [number, number, number], patch) => {
          const [start, end, offset] = offsets;

          if (offset > start && offset > end) {
            return offsets;
          }

          const op = patch[0];
          const data = patch.slice(1);

          switch (op) {
            case '=':
              return [start, end, offset + parseInt(data, 10)];

            case '-': {
              const delta = parseInt(data, 10);

              return [
                start > offset ? start - delta : start,
                end > offset ? end - delta : end,
                offset,
              ];
            }

            case '+': {
              const insertion = decodeURIComponent(data);
              const delta = insertion.length;

              return [
                start > offset ? start + delta : start,
                end > offset ? end + delta : end,
                offset,
              ];
            }

            default:
              // this should be unreachable
              return offsets;
          }
        },
        [prevStart, prevEnd, 0]
      );

      const nextStart = withCheckboxCharacters(
        action.note.content.slice(0, _nextStart)
      ).length;
      const nextEnd = withCheckboxCharacters(
        action.note.content.slice(0, _nextEnd)
      ).length;

      return new Map(state).set(action.noteId, [nextStart, nextEnd, direction]);
    }

    case 'STORE_EDITOR_SELECTION':
      return new Map(state).set(action.noteId, [
        action.start,
        action.end,
        action.direction,
      ]);

    default:
      return state;
  }
};

const dialogs: A.Reducer<T.DialogType[]> = (state = [], action) => {
  switch (action.type) {
    case 'CLOSE_DIALOG':
      return state.slice(0, -1);

    case 'SHOW_DIALOG':
      return state.includes(action.dialog) ? state : [...state, action.dialog];

    default:
      return state;
  }
};

const editMode: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'TOGGLE_EDIT_MODE': {
      return !state;
    }
    case 'CREATE_NOTE':
      return true;
    default:
      return state;
  }
};

const editingTags: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'TAG_EDITING_TOGGLE':
      return !state;
    case 'OPEN_NOTE':
    case 'SELECT_NOTE':
    case 'OPEN_TAG':
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
    case 'NAVIGATION_TOGGLE':
      return false;
    default:
      return state;
  }
};

const filteredNotes: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => {
  if ('undefined' === typeof action.meta?.searchResults) {
    return state;
  }

  return action.meta.searchResults.noteIds;
};

const hasLoadedNotes: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'FILTER_NOTES':
      return action.noteIds.length > 0 ? true : state;

    default:
      return state;
  }
};

const openedNote: A.Reducer<T.EntityId | null> = (state = null, action) => {
  switch (action.type) {
    case 'CLOSE_NOTE':
      return null;

    case 'CONFIRM_NEW_NOTE':
      return state === action.originalNoteId ? action.newNoteId : state;

    case 'OPEN_NOTE':
      return action?.noteId ?? state;

    case 'SELECT_NOTE':
      return action.noteId;

    default:
      return 'undefined' !== typeof action.meta?.nextNoteToOpen
        ? action.meta.nextNoteToOpen
        : state;
  }
};

const openedRevision: A.Reducer<[T.EntityId, number] | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'CLOSE_REVISION':
    case 'RESTORE_NOTE_REVISION':
      return null;

    case 'OPEN_REVISION':
      return [action.noteId, action.version];

    default:
      return state;
  }
};

const openedTag: A.Reducer<T.TagHash | null> = (state = null, action) => {
  switch (action.type) {
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
      return null;
    case 'OPEN_TAG':
      return tagHashOf(action.tagName);
    case 'TRASH_TAG':
      return tagHashOf(action.tagName) === state ? null : state;
    default:
      return state;
  }
};

const showNoteList: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'NOTE_LIST_TOGGLE':
      return !state;

    case 'OPEN_NOTE':
      return false;

    default:
      return state;
  }
};

const unsyncedNoteIds: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => ('SET_UNSYNCED_NOTE_IDS' === action.type ? action.noteIds : state);

const searchQuery: A.Reducer<string> = (state = '', action) => {
  switch (action.type) {
    case 'CREATE_NOTE':
      return '';
    case 'SEARCH':
      return action.searchQuery;
    default:
      return state;
  }
};

const simperiumConnected: A.Reducer<boolean> = (state = false, action) =>
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE' === action.type
    ? action.simperiumConnected
    : state;

const showNoteInfo: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'NOTE_INFO_TOGGLE':
      return !state;

    case 'NAVIGATION_TOGGLE':
      return false;

    default:
      return state;
  }
};

const showNavigation: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'NAVIGATION_TOGGLE':
      return !state;

    case 'OPEN_TAG':
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
      return false;
    case 'SHOW_DIALOG':
      if (action.dialog === 'SETTINGS') {
        return false;
      }
      return state;
    default:
      return state;
  }
};

const showRevisions: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'REVISIONS_TOGGLE':
      return !state;
    case 'CLOSE_REVISION':
    case 'OPEN_NOTE':
    case 'SELECT_NOTE':
    case 'CREATE_NOTE':
    case 'RESTORE_NOTE_REVISION':
      return false;
    default:
      return state;
  }
};

const showTrash: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'SELECT_TRASH':
      return true;
    case 'CREATE_NOTE':
    case 'OPEN_TAG':
    case 'SHOW_ALL_NOTES': {
      return false;
    }
    default:
      return state;
  }
};

const tagSuggestions: A.Reducer<T.TagHash[]> = (
  state = emptyList as T.TagHash[],
  action
) => {
  if ('undefined' === typeof action.meta?.searchResults) {
    return state;
  }

  return action.meta.searchResults.tagHashes;
};

export default combineReducers({
  editorSelection,
  dialogs,
  editMode,
  editingTags,
  filteredNotes,
  hasLoadedNotes,
  openedNote,
  openedRevision,
  openedTag,
  searchQuery,
  showNavigation,
  showNoteInfo,
  showNoteList,
  showRevisions,
  showTrash,
  simperiumConnected,
  tagSuggestions,
  unsyncedNoteIds,
});
