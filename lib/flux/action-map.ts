import { Action, Reducer } from 'redux';

import * as A from '../state/action-types';

type ActionHandler<State> =
  | { creator: Function }
  | ((state: State, ...args: any[]) => any);

type ActionHandlers<State, Handlers> = {
  [P in keyof Handlers]: ActionHandler<State>;
};

type ActionCreators<State, Handlers extends ActionHandlers<State, Handlers>> = {
  [P in keyof Handlers]: (...args: unknown[]) => Action;
};

export class ActionMap<
  State,
  Handlers extends ActionHandlers<State, Handlers>
> {
  actionCreators: ActionCreators<State, Handlers>;
  actionReducers: { [key: string]: Function };
  initialState: State;
  namespace: string;

  constructor({
    namespace,
    initialState,
    handlers,
  }: {
    namespace: string;
    initialState: State;
    handlers: Handlers;
  }) {
    this.namespace = namespace;
    this.initialState = initialState;
    this.actionCreators = {} as ActionCreators<State, Handlers>;
    this.actionReducers = {};

    namespace = namespace ? `${namespace}.` : '';

    (Object.getOwnPropertyNames(handlers) as (keyof Handlers)[]).forEach(
      <T extends keyof Handlers>(name: T) => {
        const handler = handlers[name];

        if (typeof handler === 'function') {
          this.actionCreators[name] = actionCreator.bind(`${namespace}${name}`);
          this.actionReducers[`${namespace}${name}`] = handler as Reducer<
            State,
            any
          >;
        } else {
          this.actionCreators[name] =
            (handler as { creator: Function }).creator.bind(this) ||
            actionCreator.bind(`${namespace}${name}`);
        }
      }
    );
  }

  action<T extends keyof Handlers>(name: T, ...params: unknown[]) {
    return this.actionCreators[name].apply(this, params);
  }

  reducer(state: State | undefined, action: A.ActionType) {
    const oldState = state || this.initialState;

    const fn = this.actionReducers[action.type];
    return typeof fn === 'function'
      ? fn(oldState, action) || oldState
      : oldState;
  }
}

export function actionCreator<T extends []>(...args: T) {
  return Object.assign({ type: this }, ...args);
}

export default ActionMap;
