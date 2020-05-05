const { shell } = require('electron');

const menuItems = require('./menu-items');
const platform = require('../detect/platform');
const build = require('../detect/build');

const { appCommandSender } = require('./utils');

const submenu = [
  {
    label: 'Help && &Support',
    accelerator: platform.isLinux() ? 'F1' : null,
    click: () => shell.openExternal('https://simplenote.com/help'),
  },
  {
    label: '&Keyboard Shortcuts',
    click: appCommandSender({ action: 'showDialog', dialog: 'KEYBINDINGS' }),
  },
  { type: 'separator' },
  {
    label: 'Advanced',
    submenu: [
      {
        label: 'Debugging Console',
        role: 'toggleDevTools',
      },
    ],
  },
];

const defaultSubmenuAdditions = [
  { type: 'separator' },
  ...(build.isWindowsStore() ? [] : [menuItems.checkForUpdates]),
  menuItems.about,
];

const helpMenu = {
  label: '&Help',
  role: 'help',
  submenu: platform.isOSX() ? submenu : submenu.concat(defaultSubmenuAdditions),
};

module.exports = helpMenu;
