/**
 * Internal dependencies
 */
var user;
require('./tracks');

const analytics = {
  initialize: function(initUser) {
    analytics.setUser(initUser);
    analytics.identifyUser();
  },

  // Return a valid platform prefix when on a platform that should be tracked
  getPlatformPrefix: function() {
    if (!navigator.appVersion.includes('Electron')) {
      return 'spweb';
    }

    if (navigator.appVersion.includes('Win')) {
      return 'spwindows';
    }
    if (navigator.appVersion.includes('Linux')) {
      return 'splinux';
    }

    return null;
  },

  setUser: function(newUser) {
    user = newUser;
  },

  tracks: {
    recordEvent: function(eventName, eventProperties) {
      if (!window.analyticsEnabled || process.env.NODE_ENV === 'development') {
        return;
      }

      const prefix = analytics.getPlatformPrefix();

      if (!prefix) {
        return;
      }

      const fullEventName = `${prefix}_${eventName}`;
      const fullEventProperties = {
        ...eventProperties,
        device_info_app_version: config.version, // eslint-disable-line no-undef
      };

      window._tkq.push(['recordEvent', fullEventName, fullEventProperties]);
    },
  },

  identifyUser: function() {
    // Don't identify the user if we don't have one
    if (user) {
      window._tkq.push(['identifyUser', user, user]);
    }
  },

  clearedIdentity: function() {
    window._tkq.push(['clearIdentity']);
  },
};

// Load tracking script
window._tkq = window._tkq || [];

module.exports = analytics;
