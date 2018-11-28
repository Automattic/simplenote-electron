const { app, dialog } = require('electron');
const path = require('path');

const DialogTypes = require('../../shared/dialog-types');
const menuItems = require('./menu-items');
const platform = require('../platform');
const { appCommandSender } = require('./utils');

const submenu = [
  {
    label: '&New Note',
    accelerator: 'CommandOrControl+N',
    click: appCommandSender({ action: 'newNote' }),
  },
  { type: 'separator' },
  {
    label: '&Import Notes…',
    click: appCommandSender({
      action: 'showDialog',
      dialog: DialogTypes.IMPORT,
    }),
  },
  {
    label: '&Export Notes…',
    accelerator: 'CommandOrControl+Shift+E',
    click(item, focusedWindow) {
      if (focusedWindow) {
        dialog.showSaveDialog(
          focusedWindow,
          {
            title: 'Save export as .zip archive',
            defaultPath: path.join(app.getPath('desktop'), 'notes.zip'),
          },
          filename =>
            focusedWindow.webContents.send('appCommand', {
              action: 'exportZipArchive',
              filename,
            })
        );
      }
    },
  },
  { type: 'separator' },
  {
    label: '&Print…',
    accelerator: 'CommandOrControl+P',
    click: appCommandSender({ action: 'setShouldPrintNote' }),
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
