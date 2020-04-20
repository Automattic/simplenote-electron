// https://github.com/atom/electron/issues/22
export const isElectron = !!window?.process?.type;

export const isMac = window?.process?.platform === 'darwin';
