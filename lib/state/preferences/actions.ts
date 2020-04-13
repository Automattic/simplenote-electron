import * as A from '../action-types';

export const toggleAnalytics: A.ActionCreator<A.ToggleAnalytics> = (
  sendAnalytics: boolean
) => ({
  type: 'TOGGLE_ANALYTICS',
  sendAnalytics,
});

export const remotePreferencesUpdate: A.ActionCreator<A.RemotePreferencesUpdate> = (
  sendAnalytics: boolean
) => ({
  type: 'ANALYTICS_REMOTE_UPDATE',
  sendAnalytics,
});
