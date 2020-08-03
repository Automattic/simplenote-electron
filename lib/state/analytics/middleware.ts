import analytics from '../../analytics';

import type * as A from '../action-types';
import type * as S from '../';
import type * as T from '../../types';

let eventQueue: T.AnalyticsRecord[] = [];

export const recordEvent = (
  name: string,
  properties: T.JSONSerializable = {}
) => {
  eventQueue.push([name, properties]);
};

export const middleware: S.Middleware = (store) => {
  const record = (name: string, properties: T.JSONSerializable = {}) => {
    switch (store.getState().data.analyticsAllowed) {
      case true:
        analytics.tracks.recordEvent(name, properties);
        return;

      case false:
        return;

      case null:
        eventQueue.push([name, properties]);
        return;
    }
  };

  return (next) => (action: A.ActionType) => {
    const result = next(action);
    const nextState = store.getState();

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
        if (nextState.data.analyticsAllowed === true) {
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
