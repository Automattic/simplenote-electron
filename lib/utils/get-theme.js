export default (themeSetting, isElectron) => {
  if (themeSetting === 'system') {
    if (isElectron) {
      const { remote } = __non_webpack_require__('electron'); // eslint-disable-line no-undef
      return remote.systemPreferences.isDarkMode ? 'dark' : 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return themeSetting;
};
