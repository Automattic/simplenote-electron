import analytics from './';

describe('Analytics', () => {
  describe('Tracks', () => {
    beforeEach(() => {
      global._tkq.push = jest.fn();
    });

    it('should track usage when analytics sharing is enabled', () => {
      global.analyticsEnabled = true;

      analytics.tracks.recordEvent('splinux_test_event');
      expect(global._tkq.push).toHaveBeenCalled();
    });

    it('should not track usage when analytics sharing is disabled', () => {
      global.analyticsEnabled = false;

      analytics.tracks.recordEvent('splinux_test_event');
      expect(global._tkq.push).toHaveBeenCalledTimes(0);
    });
  });
});
