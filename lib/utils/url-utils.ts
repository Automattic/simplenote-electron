import { has } from 'lodash';

const allowedProtocols = ['http:', 'https:', 'mailto:'];

const state = (() => {
  const getBoundElectronOpener = () => {
    const shell = window.require('electron').shell;
    return shell.openExternal.bind(shell);
  };

  const isRunningElectron = window && has(window, 'process.versions.electron');
  const openExternalUrl = isRunningElectron
    ? getBoundElectronOpener()
    : window.open.bind(window);

  return { isRunningElectron, openExternalUrl };
})();

export const viewExternalUrl = (url: string) => {
  try {
    const protocol = new URL(url).protocol;

    if (!allowedProtocols.some(allowed => allowed === protocol)) {
      return;
    }
  } catch (e) {
    // Invalid Url
    return;
  }

  state.openExternalUrl(url);
};
