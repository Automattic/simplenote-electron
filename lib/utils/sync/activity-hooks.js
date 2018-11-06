import { debounce, isFunction, noop, startsWith } from 'lodash';
import Debug from 'debug';

const debug = Debug('sync:activityHooks');

export const debounceWait = 500;

const onSyncActive = debounce(
  (data, onActive) => {
    debug('Sync active...');

    if (isFunction(onActive)) {
      onActive();
    }
  },
  debounceWait,
  {
    leading: true,
    trailing: false,
  }
);

const onSyncIdle = debounce((data, onIdle) => {
  debug('Sync idle');

  if (isFunction(onIdle)) {
    onIdle();
  }
}, debounceWait);

/**
 * Hook functions to sync active/idle events
 *
 * @param {string} data - The data emitted by the simperium client's 'message' or 'send' event.
 * @param {Object} hooks - The functions to hook.
 * @param {function} onActive - The function to call when syncing becomes active.
 * @param {function} onIdle - The function to call when syncing becomes idle.
 */
const activityHooks = (data, { onActive = noop, onIdle = noop }) => {
  // Ignore if heartbeat
  if (startsWith(data, 'h:')) {
    return;
  }

  onSyncActive(data, onActive);
  onSyncIdle(data, onIdle);
};

export default activityHooks;
