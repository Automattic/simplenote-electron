const { contextBridge, ipcRenderer, remote } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  confirmLogout: (changes) => {
    return (
      0 ===
      remote.dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Lose Changes and Logout', "Don't Logout Yet"],
        title: 'Unsynced Notes Detected',
        message:
          'Logging out will delete any unsynced notes. ' +
          'Do you want to continue or give it a little more time to finish trying to sync?\n\n' +
          changes,
      })
    );
  },
  send: (channel, data) => {
    // whitelist channels
    let validChannels = [
      'appCommand',
      'clearCookies',
      'setAutoHideMenuBar',
      'settingsUpdate',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['appCommand'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => {
        return func(...args);
      });
    }
  },
  isMac: process.platform === 'darwin',
});
