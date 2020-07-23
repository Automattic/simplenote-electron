const menuItems = require('./menu-items');
const platform = require('../detect/platform');
const { appCommandSender } = require('./utils');

const buildFileMenu = (isAuthenticated) => {
  isAuthenticated = isAuthenticated || false;
  const submenu = [
    {
      label: '&New Note',
      visible: isAuthenticated,
      accelerator: 'CommandOrControl+Shift+I',
      click: appCommandSender({ action: 'newNote' }),
    },
    { type: 'separator' },
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
        action: 'exportZipArchive',
      }),
    },
    { type: 'separator' },
    {
      label: '&Print…',
      accelerator: 'CommandOrControl+P',
      click: appCommandSender({ action: 'printNote' }),
    },
  ];

  var defaultSubmenuAdditions = [{ role: 'quit' }];

  if (isAuthenticated) {
    defaultSubmenuAdditions = [
      { type: 'separator' },
      menuItems.preferences,
      { type: 'separator' },
      { role: 'quit' },
    ];
  }

  const fileMenu = {
    label: '&File',
    submenu: platform.isOSX()
      ? submenu
      : submenu.concat(defaultSubmenuAdditions),
  };

  return fileMenu;
};

module.exports = buildFileMenu;
