import * as A from '../action-types';
import * as T from '../../types';

export const recordEvent: A.ActionCreator<A.RecordEvent> = (
  eventName: string
) => ({
  type: 'RECORD_EVENT',
  eventName,
});
