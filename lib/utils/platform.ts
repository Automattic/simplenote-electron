// https://github.com/atom/electron/issues/22
export const isElectron = !!window?.electron;

export const isMac = isElectron
  ? window?.electron?.isMac
  : navigator.appVersion.indexOf('Mac') !== -1;

export const CmdOrCtrl = isElectron && isMac ? 'Cmd' : 'Ctrl';

export const isSafariUserAgent = (userAgent: string) =>
  /^((?!chrome|android).)*safari/i.test(userAgent);

export const isFirefoxUserAgent = (userAgent: string) =>
  /(firefox|fxios|librewolf|iceweasel)/i.test(userAgent);

export const isSafari = isSafariUserAgent(window.navigator.userAgent);

export const isFirefox = isFirefoxUserAgent(window.navigator.userAgent);

export const canUseMonacoPasteShortcut = (
  useElectron: boolean,
  userAgent: string
) => useElectron || !isFirefoxUserAgent(userAgent);

export const useMonacoPasteShortcut = canUseMonacoPasteShortcut(
  isElectron,
  window.navigator.userAgent
);

export const isLinux = isElectron
  ? window?.electron?.isLinux
  : navigator.appVersion.indexOf('Linux') !== -1;
