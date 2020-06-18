// https://github.com/atom/electron/issues/22
export const isElectron = !!window?.electron;

export const isMac = window?.electron?.isMac;
