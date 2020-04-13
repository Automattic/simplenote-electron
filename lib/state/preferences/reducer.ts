import * as A from '../action-types';

type Preferences = {
  analytics_enabled: boolean | null;
};

const uninitializedPreferences = {
  analytics_enabled: null,
};

const preferences: A.Reducer<Preferences> = (
  state = uninitializedPreferences,
  action
) => {
  switch (action.type) {
    case 'TOGGLE_ANALYTICS':
      return {
        ...state,
        analytics_enabled:
          typeof action.sendAnalytics !== 'undefined' ||
          !state.analytics_enabled,
      };
    case 'ANALYTICS_REMOTE_UPDATE':
      return { ...state, analytics_enabled: action.sendAnalytics };
    default:
      return state;
  }
};

export default preferences;
