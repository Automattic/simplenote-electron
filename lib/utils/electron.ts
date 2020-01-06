import { noop } from 'lodash';

/**
 * Get ipcRenderer if in Electron, and mock if not
 */
export function getIpcRenderer() {
  try {
    return __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
  } catch (e) {
    return {
      on: noop,
      removeListener: noop,
      send: noop,
    };
  }
}
