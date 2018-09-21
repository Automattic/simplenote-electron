import appState from './app-state';

const { loadPreferences } = appState.actionCreators;

describe('appState action creators', () => {
  describe('loadPreferences', () => {
    let arg, data, dispatch;

    beforeEach(() => {
      dispatch = jest.fn();
      data = { analytics_enabled: 0 };
      arg = {
        preferencesBucket: {
          get: (key, callback) => {
            callback(null, { data });
          },
        },
      };
    });

    // Necessary for legacy compatibility with the iOS version
    it('should cast 0/1 values for analytics_enabled to boolean', () => {
      loadPreferences(arg)(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(false);
      data.analytics_enabled = 1;
      loadPreferences(arg)(dispatch);
      expect(global.analyticsEnabled).toStrictEqual(true);
    });
  });
});
