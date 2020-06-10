const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = [
      'appCommand',
      'clearCookies',
      'setAutoHideMenuBar',
      'settingsUpdate',
      'wpLogin',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['appCommand', 'wpLogin'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => {
        return func(...args);
      });
    }
  },
  isMac: process.platform === 'darwin',
});
