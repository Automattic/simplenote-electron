import { combineReducers } from 'redux';

import { tagHashOf as t, tagNameOf } from '../../utils/tag-hash';

import type * as A from '../action-types';
import type * as T from '../../types';

// @TODO: Move this into some framework spot
// still no IE support
// https://tc39.github.io/ecma262/#sec-array.prototype.findindex
/* eslint-disable */
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function (predicate: Function) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    },
    configurable: true,
    writable: true,
  });
}
/* eslint-enable */

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

    case 'RENAME_TAG': {
      const oldHash = t(action.oldTagName);

      const next = new Map(state);
      next.forEach((note, noteId) => {
        const tagAt = note.tags.findIndex((tagName) => t(tagName) === oldHash);

        if (-1 !== tagAt) {
          next.set(noteId, {
            ...note,
            tags: [
              ...note.tags.slice(0, tagAt),
              action.newTagName,
              ...note.tags.slice(tagAt + 1),
            ],
          });
        }
      });

      return next;
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

    case 'TRASH_TAG': {
      const tagHash = t(action.tagName);
      const next = new Map(state);

      next.forEach((note, noteId) => {
        const tagAt = note.tags.findIndex((tagName) => t(tagName) === tagHash);

        if (-1 !== tagAt) {
          next.set(noteId, {
            ...note,
            tags: [...note.tags.slice(0, tagAt), ...note.tags.slice(tagAt + 1)],
          });
        }
      });

      return next;
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

export const tags: A.Reducer<Map<T.TagHash, T.Tag>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'ADD_NOTE_TAG':
      return state.has(t(action.tagName))
        ? state
        : new Map(state).set(t(action.tagName), { name: action.tagName });

    case 'CONFIRM_NEW_TAG': {
      const next = new Map(state).set(
        (action.newTagId as string) as T.TagHash,
        action.tag
      );
      next.delete((action.originalTagId as string) as T.TagHash);
      return next;
    }

    case 'CONFIRM_NEW_NOTE':
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
    case 'ADD_NOTE_TAG': {
      const tagHash = t(action.tagName);
      return new Map(state).set(
        tagHash,
        (state.get(tagHash) ?? new Set()).add(action.noteId)
      );
    }

    case 'CONFIRM_NEW_NOTE': {
      const next = new Map(state);

      next.forEach((notes, tagHash) => {
        if (notes.has(action.originalNoteId)) {
          const nextNotes = new Set(notes);
          nextNotes.delete(action.originalNoteId);
          nextNotes.add(action.newNoteId);

          next.set(tagHash, nextNotes);
        }
      });

      return next;
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

    case 'REMOVE_NOTE_TAG': {
      const tagHash = t(action.tagName);
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
  analyticsAllowed,
  notes,
  noteRevisions,
  noteTags,
  tags,
});
