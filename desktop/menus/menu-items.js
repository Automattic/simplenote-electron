const { app } = require('electron');

const { appCommandSender } = require('./utils');
const updater = require('../updater');

const about = {
  label: '&About ' + app.name,
  click: appCommandSender({
    action: 'showDialog',
    dialog: 'ABOUT',
  }),
};

const checkForUpdates = {
  label: '&Check for Updates…',
  click: updater.pingAndShowProgress.bind(updater),
};

const preferences = (isAuthenticated) => {
  return {
    label: 'P&references…',
    visible: isAuthenticated,
    accelerator: 'CommandOrControl+,',
    click: appCommandSender({
      action: 'showDialog',
      dialog: 'SETTINGS',
    }),
  };
};

module.exports = {
  about,
  checkForUpdates,
  preferences,
};
