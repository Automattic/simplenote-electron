import analytics from '../../analytics';
import actions from '../actions';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

export const middleware: S.Middleware = store => {
  return next => (action: A.ActionType) => {
    const result = next(action);
    const nextState = store.getState();

    // @todo events throughout the app that don't have a corresponding action
    // analytics.tracks.recordEvent('user_account_created');
    // analytics.tracks.recordEvent('editor_checklist_inserted');
    // analytics.tracks.recordEvent('importer_import_completed', {
    // analytics.tracks.recordEvent('editor_note_collaborator_added');
    // analytics.tracks.recordEvent('editor_note_collaborator_removed');
    // analytics.tracks.recordEvent('editor_note_edited');
    // analytics.tracks.recordEvent('list_tag_deleted');

    switch (action.type) {
      case 'AUTH_SET':
        if (action.status === 'authorized') {
          // @todo called twice for some reason
          analytics.tracks.recordEvent('user_signed_in');
        }
        // @todo this might need to be App.setAccountName
        // if (action.status === 'not-authorized') {
        //   analytics.tracks.recordEvent('user_signed_out');
        // }
        break;
      case 'App.loadPreferences':
        // @todo not getting called
        analytics.tracks.recordEvent('application_opened');
        break;
      // case 'DELETE_NOTE_FOREVER': @todo not sure if?
      case 'TRASH_NOTE':
        analytics.tracks.recordEvent('editor_note_deleted');
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
          // @todo this gets called for each character typed,
          // possibly also happening in develop?
          analytics.tracks.recordEvent('list_notes_searched');
        }
        break;
      case 'SELECT_NOTE':
        // @todo this is getting called whenever the note is re-selected
        // e.g. when adding/deleting tags
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
    }
    return result;
  };
};

export default middleware;
