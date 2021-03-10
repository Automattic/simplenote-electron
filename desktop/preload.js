const { contextBridge, ipcRenderer, remote } = require('electron');

const validChannels = [
  'appCommand',
  'appStateUpdate',
  'clearCookies',
  'closeWindow',
  'editorCommand',
  'importNotes',
  'noteImportChannel',
  'reallyCloseWindow',
  'setAutoHideMenuBar',
  'tokenLogin',
  'wpLogin',
];

contextBridge.exposeInMainWorld('electron', {
  confirmLogout: (changes) => {
    const response = remote.dialog.showMessageBoxSync({
      type: 'warning',
      buttons: [
        'Export Unsynced Notes',
        "Don't Logout Yet",
        'Lose Changes and Logout',
      ],
      title: 'Unsynced Notes Detected',
      message:
        'Logging out will delete any unsynced notes. ' +
        'Do you want to continue or give it a little more time to finish trying to sync?\n\n' +
        changes,
    });

    switch (response) {
      case 0:
        return 'export';

      case 1:
        return 'reconsider';

      case 2:
        return 'logout';
    }
  },
  send: (channel, data) => {
    // allowed channels
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_, data) => callback(data);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeListener: (channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  isMac: process.platform === 'darwin',
});
