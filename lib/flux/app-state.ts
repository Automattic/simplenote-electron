import { get } from 'lodash';
import update from 'react-addons-update';
import ActionMap from './action-map';

import { AppState, State } from '../state';
import * as T from '../types';

const initialState: AppState = {
  tags: [],
  unsyncedNoteIds: [], // note bucket only
};

export const actionMap = new ActionMap({
  namespace: 'App',
  initialState,
  handlers: {
    authChanged(state: AppState) {
      return update(state, {
        tags: { $set: [] },
      });
    },

    loadPreferences: {
      creator({
        callback,
        preferencesBucket,
      }: {
        callback?: Function;
        preferencesBucket: T.Bucket<T.Preferences>;
      }) {
        return (dispatch) => {
          const objectKey = 'preferences-key';

          preferencesBucket.get(objectKey, (e, preferences) => {
            let analyticsEnabled = get(
              preferences,
              'data.analytics_enabled',
              true
            );

            // Necessary for legacy compatibility with the iOS version
            analyticsEnabled = Boolean(analyticsEnabled);

            // Create empty preferences object in the bucket if not yet there
            if (preferences === undefined) {
              preferencesBucket.update(objectKey, {});
            }

            // Global to be checked in analytics.tracks.recordEvent()
            window.analyticsEnabled = analyticsEnabled;

            // By deferring recordEvent() to this callback, we can make sure
            // that tracking starts only after preferences are loaded
            if (typeof callback === 'function') callback();

            dispatch(
              this.action('preferencesLoaded', {
                analyticsEnabled: analyticsEnabled,
              })
            );
          });
        };
      },
    },

    preferencesLoaded(
      state: AppState,
      { analyticsEnabled }: { analyticsEnabled: boolean }
    ) {
      return update(state, {
        preferences: {
          $set: {
            analyticsEnabled,
          },
        },
      });
    },

    setPreference<K extends keyof T.Preferences>(
      state: AppState,
      {
        key,
        value,
        preferencesBucket,
      }: {
        key: K;
        value: T.Preferences[K];
        preferencesBucket: T.Bucket<T.Preferences>;
      }
    ) {
      const objectKey = 'preferences-key';

      preferencesBucket.get(objectKey, (e, preferences) => {
        preferencesBucket.update(objectKey, {
          ...preferences.data,
          [key]: value,
        });
      });
    },

    toggleShareAnalyticsPreference: {
      creator({
        preferencesBucket,
      }: {
        preferencesBucket: T.Bucket<T.Preferences>;
      }) {
        return (dispatch, getState: () => State) => {
          const {
            appState: {
              preferences: { analyticsEnabled },
            },
          } = getState();

          dispatch(
            this.action('setPreference', {
              key: 'analytics_enabled',
              value: !analyticsEnabled,
              preferencesBucket,
            })
          );
        };
      },
    },
  },
});

export default actionMap;
