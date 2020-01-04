import Debug from 'debug';
import { uniq } from 'lodash';

import { getLocalQueue } from '../../simperium/local-queue-store';

const getUnsyncedNoteIds = bucket => {
  const { queues, sent } = getLocalQueue(bucket);
  const unsyncedNoteIds = uniq([...Object.keys(queues), ...Object.keys(sent)]);

  Debug('sync:getUnsyncedNoteIds')(unsyncedNoteIds);
  return unsyncedNoteIds;
};

export default getUnsyncedNoteIds;
