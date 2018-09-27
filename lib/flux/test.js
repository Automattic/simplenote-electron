import { noop } from 'lodash';
import appState from './app-state';

const { loadPreferences } = appState.actionCreators;

describe('appState action creators', () => {
  describe('loadPreferences', () => {
    let preferencesBucket, preferences, dispatch;

    beforeEach(() => {
      dispatch = noop;
      preferences = {
        data: { analytics_enabled: 0 },
      };
      preferencesBucket = {
        get: (key, callback) => {
          callback(null, preferences);
        },
        update: jest.fn(),
      };
    });

    // Necessary for legacy compatibility with the iOS version
    it('should cast 0/1 values for analytics_enabled to boolean', () => {
      loadPreferences({ preferencesBucket })(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(false);
      preferences.data.analytics_enabled = 1;
      loadPreferences({ preferencesBucket })(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(true);
    });

    it('should create a empty preferences object if necessary', () => {
      preferences = undefined;
      loadPreferences({ preferencesBucket })(dispatch);
      expect(preferencesBucket.update).toHaveBeenCalledWith(
        'preferences-key',
        {}
      );
    });
  });
});
