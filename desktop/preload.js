const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
  'appCommand',
  'clearCookies',
  'importNotes',
  'notesImported',
  'setAutoHideMenuBar',
  'settingsUpdate',
  'wpLogin',
];

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // whitelist channels
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
  once: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_, data) => callback(data);
      ipcRenderer.once(channel, newCallback);
    }
  },
  isMac: process.platform === 'darwin',
});
