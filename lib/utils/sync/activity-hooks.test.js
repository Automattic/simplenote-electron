import activityHooks, { debounceWait } from './activity-hooks';
import { times } from 'lodash';

describe('sync:activityHooks', () => {
  const delay = debounceWait + 5; // wiggle room
  let order, hooks;

  beforeEach(() => {
    order = [];
    hooks = {
      onActive: jest.fn(() => order.push('active')),
      onIdle: jest.fn(() => order.push('idle')),
    };
  });

  it('should call the appropriate hook when syncing becomes active/idle', () => {
    const myActivityHooks = activityHooks('0:mockdata', hooks);

    times(3, myActivityHooks);
    return new Promise(done => {
      window.setTimeout(() => {
        expect(hooks.onActive).toHaveBeenCalledTimes(1);
        expect(hooks.onIdle).toHaveBeenCalledTimes(1);
        expect(order).toEqual(['active', 'idle']);
        done();
      }, delay);
    });
  });

  it('should ignore heartbeats', () => {
    const myActivityHooks = activityHooks('h:1', hooks);

    times(3, myActivityHooks);
    return new Promise(done => {
      window.setTimeout(() => {
        expect(hooks.onActive).toHaveBeenCalledTimes(0);
        expect(hooks.onIdle).toHaveBeenCalledTimes(0);
        done();
      }, delay);
    });
  });
});
