import analytics from '../../analytics';
import actions from '../actions';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

export const middleware: S.Middleware = store => {
  return next => (action: A.ActionType) => {
    const result = next(action);

    // @todo uncomment to ship, this breaks debugging :)
    // if (!window.sendAnalytics) {
    //   return result;
    // }

    // const nextState = store.getState();

    // @todo events that don't have a corresponding action and aren't in redux
    // - editor_checklist_inserted
    // - importer_import_completed

    switch (action.type) {
      /* catch-all action used by redux components for these events:
         - editor_note_collaborator_added
         - editor_note_collaborator_removed
         - editor_note_edited
         - list_tag_deleted
         - user_account_created
      */
      case 'RECORD_EVENT':
        if (action.eventName) {
          analytics.tracks.recordEvent(action.eventName);
        }

      /* events that map to an action directly */
      case 'AUTH_SET':
        if (action.status === 'authorized') {
          analytics.tracks.recordEvent('user_signed_in');
        }
      // @todo figure out proper user_signed_out action
      // AUTH_SET 'not-authorized' is called with every
      // character typed on the login screen
      // if (action.status === 'not-authorized') {
      // case 'App.setAccountName': ??
      case 'App.authChanged':
        console.log('auth changed');
        // if setAccount w/account of null ??
        // analytics.tracks.recordEvent('user_signed_out');
        break;
      case 'CREATE_NOTE':
        analytics.tracks.recordEvent('list_note_created');
        break;
      case 'OPEN_TAG':
        analytics.tracks.recordEvent('list_tag_viewed');
        break;
      case 'RESTORE_NOTE':
        analytics.tracks.recordEvent('editor_note_restored');
        break;
      case 'SEARCH':
        if (action.searchQuery) {
          // @todo this gets called for each character typed
          // in search field, possibly also happening in develop?
          analytics.tracks.recordEvent('list_notes_searched');
        }
        break;
      case 'SELECT_NOTE':
        analytics.tracks.recordEvent('list_note_opened');
        break;
      case 'SELECT_TRASH':
        analytics.tracks.recordEvent('list_trash_viewed');
        break;
      case 'SET_SYSTEM_TAG':
        if (action.shouldHaveTag) {
          analytics.tracks.recordEvent('editor_tag_added');
        } else {
          analytics.tracks.recordEvent('editor_tag_removed');
        }
        break;
      case 'SHOW_DIALOG':
        if (action.dialog === 'SHARE') {
          analytics.tracks.recordEvent('editor_share_dialog_viewed');
        }
        break;
      // case 'DELETE_NOTE_FOREVER': @todo not sure if we should track this too?
      case 'TRASH_NOTE':
        analytics.tracks.recordEvent('editor_note_deleted');
        break;
    }
    return result;
  };
};

export default middleware;
