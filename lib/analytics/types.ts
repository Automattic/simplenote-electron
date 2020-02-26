import * as T from '../types';

export type TKQItem =
  | Function
  | [keyof TracksAPI, ...(string | T.JSONSerializable)[]];

export type TracksAPI = {
  storeContext: (c: object) => void;
  identifyUser: (user: string, login: string) => void;
  recordEvent: (name: string, props: T.JSONSerializable) => void;
  setProperties: (properties: object) => void;
  clearIdentity: () => void;
};
