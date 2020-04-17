const menuItems = require('./menu-items');
const platform = require('../detect/platform');
const { appCommandSender } = require('./utils');

const submenu = [
  {
    label: '&New Note',
    click: appCommandSender({ action: 'newNote' }),
  },
  { type: 'separator' },
  {
    label: '&Import Notes…',
    click: appCommandSender({
      action: 'showDialog',
      dialog: 'IMPORT',
    }),
  },
  {
    label: '&Export Notes…',
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

const defaultSubmenuAdditions = [
  { type: 'separator' },
  menuItems.preferences,
  { type: 'separator' },
  { role: 'quit' },
];

const fileMenu = {
  label: '&File',
  submenu: platform.isOSX() ? submenu : submenu.concat(defaultSubmenuAdditions),
};

module.exports = fileMenu;
