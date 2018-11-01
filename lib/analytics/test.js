import analytics from './';

describe('Analytics', () => {
  describe('getPlatformPrefix', () => {
    Object.defineProperty(global.navigator, 'appVersion', {
      configurable: true,
    });

    it('should return "spweb" if not Electron', () => {
      Object.defineProperty(global.navigator, 'appVersion', {
        get: () =>
          '5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
      });
      expect(analytics.getPlatformPrefix()).toBe('spweb');
    });

    it('should return null if Electron on Mac', () => {
      Object.defineProperty(global.navigator, 'appVersion', {
        get: () =>
          '5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Simplenote/1.2.1 Chrome/61.0.3163.100 Electron/2.0.8 Safari/537.36',
      });
      expect(analytics.getPlatformPrefix()).toBe(null);
    });
  });

  describe('tracks', () => {
    beforeEach(() => {
      global._tkq.push = jest.fn();
      global.process.env.NODE_ENV = 'test';
      global.analyticsEnabled = true;
      global.config.version = '1.0.0';
      analytics.getPlatformPrefix = jest.fn().mockReturnValue('spwindows');
    });

    it('should track usage when analytics sharing is enabled', () => {
      analytics.tracks.recordEvent('test_event');
      expect(global._tkq.push).toHaveBeenCalled();
    });

    it('should not track usage when analytics sharing is disabled', () => {
      global.analyticsEnabled = false;

      analytics.tracks.recordEvent('test_event');
      expect(global._tkq.push).toHaveBeenCalledTimes(0);
    });

    it('should not track usage when NODE_ENV is development', () => {
      global.process.env.NODE_ENV = 'development';
      analytics.tracks.recordEvent('test_event');
      expect(global._tkq.push).toHaveBeenCalledTimes(0);
    });

    it('should only send when platform prefix is supplied', () => {
      analytics.getPlatformPrefix.mockReturnValue('my_prefix');
      analytics.tracks.recordEvent('test_event');

      analytics.getPlatformPrefix.mockReturnValue(null);
      analytics.tracks.recordEvent('test_event');

      expect(global._tkq.push).toHaveBeenCalledTimes(1);
    });

    it('should prefix the event name with the result of getPlatformPrefix', () => {
      analytics.tracks.recordEvent('test_event');
      const sentEventName = global._tkq.push.mock.calls[0][0][1];

      expect(sentEventName).toBe('spwindows_test_event');
    });

    it('should send a basic set of properties with each event', () => {
      analytics.tracks.recordEvent('test_event');
      const sentEventProperties = global._tkq.push.mock.calls[0][0][2];

      expect(sentEventProperties).toStrictEqual({
        device_info_app_version: '1.0.0',
      });
    });

    it('should passthru properties sent with the event', () => {
      analytics.tracks.recordEvent('test_event', {
        device_info_app_version: '2.0.0', // this should NOT overwrite
        my_property: 'test_property', // this should passthru
      });
      const sentEventProperties1 = global._tkq.push.mock.calls[0][0][2];

      expect(sentEventProperties1).toStrictEqual({
        device_info_app_version: '1.0.0',
        my_property: 'test_property',
      });
    });
  });
});
