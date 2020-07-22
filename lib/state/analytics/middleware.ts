import analytics from '../../analytics';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../types';

let eventQueue = [];

export const recordEvent = (
  name: string,
  properties: T.JSONSerializable = {}
) => {
  eventQueue.push([name, properties]);
};

export const middleware: S.Middleware = (store) => {
  let record = recordEvent;
  if (store.getState().data.analyticsAllowed === true) {
    record = analytics.tracks.recordEvent;
  } else if (store.getState().data.analyticsAllowed === false) {
    record = (name: string, properties: T.JSONSerializable = {}) => {
      return; // discard events while analytics is opted-out
    };
  }

  return (next) => (action: A.ActionType) => {
    const result = next(action);

    /* catch-all meta used by redux components for these events:
         - importer_import_completed
    */
    if (action.meta?.analytics?.length) {
      action.meta.analytics.forEach(([eventName, eventProperties]) =>
        record(eventName, eventProperties)
      );
    }

    switch (action.type) {
      case 'SET_ANALYTICS':
        // @todo the simperium middleware SHOULD be dispatching this on preferences loaded, but it never fires
        if (action.allowAnalytics === true) {
          // make sure that tracking starts after preferences are loaded
          eventQueue.forEach(([name, properties]) =>
            analytics.tracks.recordEvent(name, properties)
          );
        }
        eventQueue = [];

        // Global to be checked in analytics.tracks.recordEvent()
        window.analyticsEnabled = action.allowAnalytics;
        break;

      /* events that map to an action directly */
      case 'ADD_COLLABORATOR':
        record('editor_note_collaborator_added');
        break;
      case 'ADD_NOTE_TAG':
        record('editor_tag_added');
        break;
      case 'CREATE_NOTE':
        record('list_note_created');
        break;
      case 'EDIT_NOTE':
        record('editor_note_edited');
        break;
      case 'INSERT_TASK':
        record('editor_checklist_inserted');
        break;
      case 'LOGOUT':
        record('user_signed_out');
        break;
      case 'OPEN_NOTE':
        record('list_note_opened');
        break;
      case 'OPEN_TAG':
        record('list_tag_viewed');
        break;
      case 'REMOVE_COLLABORATOR':
        record('editor_note_collaborator_removed');
        break;
      case 'REMOVE_NOTE_TAG':
        record('editor_tag_removed');
        break;
      case 'RESTORE_OPEN_NOTE':
        record('editor_note_restored');
        break;
      case 'SEARCH':
        if (action.searchQuery) {
          // @todo this gets called for each character typed
          // in search field, possibly also happening in develop?
          record('list_notes_searched');
        }
        break;
      case 'SELECT_TRASH':
        record('list_trash_viewed');
        break;
      case 'setAccountName':
        // @todo this action gets dispatched twice on login. one is in initSimperium and one is in boot.tsx
        // on page refresh when already logged in, it gets dispatched once
        analytics.initialize(action.accountName);
        record('user_signed_in');
        break;
      case 'SHOW_DIALOG':
        if (action.dialog === 'SHARE') {
          record('editor_share_dialog_viewed');
        }
        break;
      case 'TRASH_OPEN_NOTE':
        record('editor_note_deleted');
        break;
      case 'TRASH_TAG':
        record('list_tag_deleted');
        break;
    }
    return result;
  };
};

export default middleware;
