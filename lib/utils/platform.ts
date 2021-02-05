// https://github.com/atom/electron/issues/22
export const isElectron = !!window?.electron;

export const isMac = isElectron
  ? window?.electron?.isMac
  : navigator.appVersion.indexOf('Mac') !== -1;

export const CmdOrCtrl = isElectron && isMac ? 'Cmd' : 'Ctrl';

export const isSafari = /^((?!chrome|android).)*safari/i.test(
  window.navigator.userAgent
);
