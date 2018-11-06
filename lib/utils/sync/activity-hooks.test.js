import activityHooks, { debounceWait } from './activity-hooks';
import { times } from 'lodash';

describe('sync:activityHooks', () => {
  let order, hooks;

  beforeEach(() => {
    order = [];
    hooks = {
      onActive: jest.fn(() => order.push('active')),
      onIdle: jest.fn(() => order.push('idle')),
    };
  });

  it('should call the appropriate hook when syncing becomes active/idle', done => {
    const myActivityHooks = activityHooks('0:mockdata', hooks);

    times(3, myActivityHooks);

    window.setTimeout(() => {
      expect(hooks.onActive).toHaveBeenCalledTimes(1);
      expect(hooks.onIdle).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['active', 'idle']);
      done();
    }, debounceWait);
  });

  it('should ignore heartbeats', done => {
    const myActivityHooks = activityHooks('h:1', hooks);

    times(3, myActivityHooks);

    window.setTimeout(() => {
      expect(hooks.onActive).toHaveBeenCalledTimes(0);
      expect(hooks.onIdle).toHaveBeenCalledTimes(0);
      done();
    }, debounceWait);
  });
});
