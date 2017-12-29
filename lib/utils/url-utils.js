import { has } from 'lodash';

const allowedProtocols = ['http://', 'https://', 'mailto:'];

let state = {
  isRunningElectron: null,
};
init();

function init() {
  const getBoundElectronOpener = () => {
    const shell = window.require('electron').shell;
    return shell.openExternal.bind(shell);
  };

  const isRunningElectron = window && has(window, 'process.versions.electron');
  const openExternalUrl = isRunningElectron
    ? getBoundElectronOpener()
    : window.open.bind(window);

  state = { ...state, isRunningElectron, openExternalUrl };
}

export const viewExternalUrl = url => {
  const lowerCaseUrl = url.toLowerCase().trim();
  const urlStartsWithProtocol = function(protocol) {
    return this.startsWith(protocol);
  };

  if (!allowedProtocols.some(urlStartsWithProtocol, lowerCaseUrl)) {
    return;
  }

  state.openExternalUrl(lowerCaseUrl);
};
