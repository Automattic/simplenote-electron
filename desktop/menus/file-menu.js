const menuItems = require('./menu-items');
const platform = require('../detect/platform');
const { appCommandSender } = require('./utils');

const buildFileMenu = (isAuthenticated) => {
  isAuthenticated = isAuthenticated || false;

  let submenu = [];

  if (isAuthenticated) {
    submenu = [
      {
        label: '&New Note',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+Shift+I',
        click: appCommandSender({ action: 'newNote' }),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: '&Import Notes…',
        visible: isAuthenticated,
        click: appCommandSender({
          action: 'showDialog',
          dialog: 'IMPORT',
        }),
      },
      {
        label: '&Export Notes…',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+Shift+E',
        click: appCommandSender({
          action: 'exportNotes',
        }),
      },
      ...(isAuthenticated ? [{ type: 'separator' }] : []),
      {
        label: '&Print…',
        visible: isAuthenticated,
        accelerator: 'CommandOrControl+P',
        click: appCommandSender({ action: 'printNote' }),
      },
    ];
  }

  const defaultSubmenuAdditions = [
    { type: 'separator' },
    menuItems.preferences(isAuthenticated),
    ...(isAuthenticated ? [{ type: 'separator' }] : []),
    { role: 'quit' },
  ];

  const fileMenu = {
    label: '&File',
    submenu: platform.isOSX()
      ? submenu
      : submenu.concat(defaultSubmenuAdditions),
  };

  // we have nothing to show in the File menu on OSX logged out
  if (!isAuthenticated && platform.isOSX()) {
    fileMenu.visible = false;
  }

  return fileMenu;
};

module.exports = buildFileMenu;
