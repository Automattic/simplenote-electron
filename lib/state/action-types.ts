export const AUTH_SET = 'AUTH_SET';
export const FILTER_NOTES = 'FILTER_NOTES';
export const TAG_DRAWER_TOGGLE = 'TAG_DRAWER_TOGGLE';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: unknown }
> = { type: T } & Args;

export type ActionType = never;

export type ActionCreator<A extends ActionType> = (...args: any[]) => A;
export type Reducer<S> = (state: S | undefined, action: ActionType) => S;
