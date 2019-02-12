import Debug from 'debug';
import { uniq } from 'lodash';

import { getLocalQueue } from '../../simperium/local-queue-store';

const countUnsyncedChanges = bucket => {
  const { queues, sent } = getLocalQueue(bucket);
  const unsyncedNoteIds = uniq([...Object.keys(queues), ...Object.keys(sent)]);
  const count = unsyncedNoteIds.length;

  Debug('sync:countUnsyncedChanges')(count);
  return count;
};

export default countUnsyncedChanges;
