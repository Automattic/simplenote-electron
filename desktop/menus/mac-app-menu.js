const { app } = require('electron');

const menuItems = require('./menu-items');
const build = require('../detect/build');

const buildMacAppMenu = (isAuthenticated) => {
  var submenu = [];
  isAuthenticated = isAuthenticated || false;

  if (isAuthenticated) {
    submenu = [
      menuItems.about,
      ...(build.isMAS() ? [] : [menuItems.checkForUpdates]),
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
    ];
  } else {
    submenu = [
      menuItems.about,
      ...(build.isMAS() ? [] : [menuItems.checkForUpdates]),
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
    ];
  }

  const menu = {
    label: app.name,
    submenu: submenu,
  };

  return menu;
};

module.exports = buildMacAppMenu;
