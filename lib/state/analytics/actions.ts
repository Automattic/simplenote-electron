import * as A from '../action-types';
import * as T from '../../types';

export const withEvent =
  (eventName: string, eventProperties?: T.JSONSerializable) => (action) => ({
    ...action,
    meta: {
      ...action.meta,
      analytics: [
        ...(action.meta?.analytics ?? []),
        [eventName, eventProperties],
      ],
    },
  });

export const recordEvent: A.ActionCreator<A.RecordEvent> = (
  eventName: string,
  eventProperties?: T.JSONSerializable
) =>
  withEvent(
    eventName,
    eventProperties
  )({
    type: 'RECORD_EVENT',
  });
