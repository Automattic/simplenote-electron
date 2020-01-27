import { isEmpty } from 'lodash';
import Debug from 'debug';

const debug = Debug('localQueueStore');

function persist(bucket) {
  const { queues, sent } = getLocalQueue(bucket);

  window.localStorage.setItem(getKey(bucket), JSON.stringify({ queues, sent }));
}

function restoreTo(bucket) {
  const key = getKey(bucket);
  const localQueue = getLocalQueue(bucket);
  const { queues = {}, sent = {} } =
    JSON.parse(window.localStorage.getItem(key)) || {};
  window.localStorage.removeItem(key);

  localQueue.queues = queues;

  // Offline changes may be enqueued to `sent`, if it happens before
  // the channel realizes it has been disconnected.
  Object.values(sent)
    .filter(change => isEmpty(queues[change.id])) // avoid duplicate conflicting changes
    .forEach(change => {
      localQueue.queues[change.id] = [change];
    });

  debug(
    `Restored %d offline changes for '${bucket.name}' bucket`,
    Object.keys(localQueue.queues).length
  );
}

export function getKey(bucket) {
  return `localQueue:${bucket.name}`;
}

export function getLocalQueue(bucket) {
  return bucket.channel.localQueue;
}

const localQueueStore = { persist, restoreTo };

export default localQueueStore;
