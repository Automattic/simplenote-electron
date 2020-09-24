const { app } = require('electron');

const menuItems = require('./menu-items');
const build = require('../detect/build');

const buildMacAppMenu = (isAuthenticated) => {
  var submenu = [];
  isAuthenticated = isAuthenticated || false;

  submenu = [
    menuItems.about,
    ...(build.isMAS() ? [] : [menuItems.checkForUpdates]),
    { type: 'separator' },
    menuItems.preferences(isAuthenticated),
    ...(isAuthenticated ? [{ type: 'separator' }] : []),
    {
      role: 'services',
      submenu: [],
    },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideothers' },
    { role: 'unhide' },
    ...(isAuthenticated
      ? [
          { type: 'separator' },
          menuItems.emptyTrash(isAuthenticated),
          menuItems.signout(isAuthenticated),
        ]
      : []),
    { type: 'separator' },
    { role: 'quit' },
  ];

  const menu = {
    label: app.name,
    submenu: submenu,
  };

  return menu;
};

module.exports = buildMacAppMenu;
