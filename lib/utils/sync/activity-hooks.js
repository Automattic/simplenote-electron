import { debounce, isFunction, noop, startsWith } from 'lodash';
import Debug from 'debug';

const debug = Debug('sync:activityHooks');

export const onSyncActive = debounce(
  (data, onActive) => {
    debug('Sync active...');

    if (isFunction(onActive)) {
      onActive();
    }
  },
  500,
  {
    leading: true,
    trailing: false,
  }
);

export const onSyncIdle = debounce((data, onIdle) => {
  debug('Sync idle');

  if (isFunction(onIdle)) {
    onIdle();
  }
}, 500);

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
