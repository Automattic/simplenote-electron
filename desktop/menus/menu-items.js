const { app } = require('electron');

const { appCommandSender } = require('./utils');
const updater = require('../updater');
const { autoUpdater } = require('electron-updater');

const about = {
  label: '&About ' + app.name,
  click: appCommandSender({
    action: 'showDialog',
    dialog: 'ABOUT',
  }),
};

const checkForUpdates = {
  label: '&Check for Updates…',
  enabled: autoUpdater.isUpdaterActive(),
  click: updater.pingAndShowProgress.bind(updater),
};

const emptyTrash = (isAuthenticated) => {
  return {
    label: '&Empty Trash',
    visible: isAuthenticated,
    click: appCommandSender({ action: 'emptyTrash' }),
  };
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

const signout = (isAuthenticated) => {
  return {
    label: '&Sign Out',
    visible: isAuthenticated,
    click: appCommandSender({
      action: 'logout',
    }),
  };
};

module.exports = {
  about,
  checkForUpdates,
  emptyTrash,
  preferences,
  signout,
};
