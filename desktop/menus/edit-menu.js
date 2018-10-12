const { appCommandSender } = require('./utils');

const buildEditMenu = settings => {
  settings = settings || {};

  return {
    label: '&Edit',
    submenu: [
      {
        label: '&Undo',
        accelerator: 'CommandOrControl+Z',
        role: 'undo',
      },
      {
        label: '&Redo',
        // accelerator: 'Shift+CommandOrControl+Z',
        accelerator: 'CommandOrControl+Y',
        role: 'redo',
      },
      {
        type: 'separator',
      },
      {
        label: '&Cut',
        accelerator: 'CommandOrControl+X',
        role: 'cut',
      },
      {
        label: 'C&opy',
        accelerator: 'CommandOrControl+C',
        role: 'copy',
      },
      {
        label: '&Paste',
        accelerator: 'CommandOrControl+V',
        role: 'paste',
      },
      {
        label: '&Select All',
        accelerator: 'CommandOrControl+A',
        role: 'selectall',
      },
      {
        type: 'separator',
      },
      {
        label: 'Search &Notes ...',
        accelerator: 'CommandOrControl+F',
        click: appCommandSender({ action: 'setSearchFocus' }),
      },
      {
        type: 'separator',
      },
      {
        label: 'C&heck Spelling',
        type: 'checkbox',
        checked: settings.spellCheckEnabled,
        click: appCommandSender({ action: 'toggleSpellCheck' }),
      },
    ],
  };
};

module.exports = buildEditMenu;
