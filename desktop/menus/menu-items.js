const { app } = require('electron');

const { appCommandSender } = require('./utils');
const DialogTypes = require('../../shared/dialog-types');

const about = {
  label: '&About ' + app.getName(),
  click: appCommandSender({
    action: 'showDialog',
    dialog: DialogTypes.ABOUT,
  }),
};

const preferences = {
  label: 'P&references',
  accelerator: 'CommandOrControl+,',
  click: appCommandSender({
    action: 'showDialog',
    dialog: DialogTypes.SETTINGS,
  }),
};

module.exports = {
  about,
  preferences,
};
