const debug = require('debug')('analytics');

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
      const prefix = analytics.getPlatformPrefix();

      const fullEventName = `${prefix}_${eventName}`;
      const fullEventProperties = {
        ...eventProperties,
        device_info_app_version: config.version, // eslint-disable-line no-undef
      };

      debug(`${fullEventName}: %o`, fullEventProperties);
      analytics.tracks.validateEvent(fullEventName, fullEventProperties);

      if (
        window.analyticsEnabled &&
        prefix &&
        process.env.NODE_ENV !== 'development'
      ) {
        window._tkq.push(['recordEvent', fullEventName, fullEventProperties]);
      }
    },
    validateEvent: function(fullEventName, fullEventProperties) {
      if (process.env.NODE_ENV !== 'development') {
        return;
      }

      const validName = /^[a-z_][a-z0-9_]*$/;

      if (!validName.test(fullEventName)) {
        throw new Error(`Event ${fullEventName} is invalid`);
      }

      for (const propName in fullEventProperties) {
        if (!validName.test(propName)) {
          throw new Error(
            `Property ${propName} in event ${fullEventName} is invalid`
          );
        }
      }
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
