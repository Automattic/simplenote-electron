import { debounce } from 'lodash';

import analytics from '../../analytics';
import getConfig from '../../../get-config';
import isDevConfig from '../../utils/is-dev-config';

const config = getConfig();

import type * as A from '../action-types';
import type * as S from '../';
import type * as T from '../../types';

let eventQueue: T.AnalyticsRecord[] = [];

let Sentry;

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

  const recordNoteEdit = debounce(() => record('editor_note_edited'), 2000);

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
      case 'REMOTE_ANALYTICS_UPDATE':
      case 'SET_ANALYTICS':
        // Global to be checked in analytics.tracks.recordEvent()
        window.analyticsEnabled = action.allowAnalytics;

        if (action.allowAnalytics) {
          // make sure that tracking starts after preferences are loaded
          if (!isDevConfig(config?.development)) {
            import(/* webpackChunkName: 'sentry' */ '@sentry/react').then(
              (SentryModule) => {
                Sentry = SentryModule;
                Sentry.init({
                  dsn:
                    'https://e5349c4269ef4665bfc44be218a786c2@o248881.ingest.sentry.io/5378892',
                });
              }
            );
          }
          eventQueue.forEach(([name, properties]) =>
            analytics.tracks.recordEvent(name, properties)
          );
        } else {
          Sentry?.close(0);
        }

        eventQueue = [];

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
      case 'UPDATE_ACCOUNT_VERIFICATION':
        if (action.state === 'dismissed') {
          record('verification_dismissed');
        }
        break;
      case 'EDIT_NOTE':
        recordNoteEdit();
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
        if (action.name === 'SHARE') {
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
