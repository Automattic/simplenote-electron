const { app } = require('electron');

const menuItems = require('./menu-items');

const macAppMenu = {
  label: app.getName(),
  submenu: [
    menuItems.about,
    menuItems.checkForUpdates,
    { type: 'separator' },
    menuItems.preferences,
    { type: 'separator' },
    {
      role: 'services',
      submenu: [],
    },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideothers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ],
};

module.exports = macAppMenu;
