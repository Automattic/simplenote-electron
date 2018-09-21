const editMenu = {
  label: '&Edit',
  submenu: [
    {
      label: '&Undo',
      accelerator: 'CommandOrControl+Z',
      role: 'undo',
    },
    {
      label: '&Redo',
      accelerator: 'Shift+CommandOrControl+Z',
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
      label: 'Search &Notes',
      accelerator: 'CommandOrControl+F',
      click(item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.webContents.send('appCommand', {
            action: 'setSearchFocus',
          });
        }
      },
    },
  ],
};

module.exports = editMenu;
