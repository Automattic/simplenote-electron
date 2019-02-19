import { debounce, startsWith } from 'lodash';

const debounceWait = 500;
const key = 'lastSyncedTime';

export const setLastSyncedTime = debounce(data => {
  // Ignore if heartbeat
  if (startsWith(data, 'h:')) {
    return;
  }
  window.localStorage.setItem(key, Date.now());
}, debounceWait);

export const getLastSyncedTime = () => {
  return parseFloat(window.localStorage.getItem(key));
};
