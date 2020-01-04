import { debounce, startsWith } from 'lodash';

const debounceWait = 500;
const key = 'lastSyncedTime';

export const setLastSyncedTime = debounce(data => {
  // Ignore if heartbeat
  if (startsWith(data, 'h:')) {
    return;
  }
  try {
    window.localStorage.setItem(key, Date.now());
  } catch (e) {
    // must be missing localStorage
  }
}, debounceWait);

export const getLastSyncedTime = () => {
  try {
    return parseFloat(window.localStorage.getItem(key));
  } catch (e) {
    // missing localStorage or corruped value
    return -Infinity;
  }
};
