import 'jest-localstorage-mock';
import simperium from 'simperium';

import localQueueStore, { getKey, getLocalQueue } from './local-queue-store';

describe('localQueueStore', () => {
  const Bucket = () => simperium().bucket('myBucket');

  describe('persist', () => {
    let bucket, key;

    beforeEach(() => {
      localStorage.clear();
      bucket = new Bucket();
      key = getKey(bucket);
    });

    it('should save `queues` and `sent` to localStorage', () => {
      const localQueue = getLocalQueue(bucket);
      localQueue.queues = { foo: [{ id: 'foo' }] };
      localQueue.sent = { foo: 'bar' };
      localQueueStore.persist(bucket);

      const { queues, sent } = localQueue;
      const serializedValue = JSON.stringify({ queues, sent });
      expect(localStorage.getItem(key)).toBe(serializedValue);
    });
  });

  describe('restoreTo', () => {
    let bucket, newBucket, key;

    beforeEach(() => {
      localStorage.clear();
      bucket = new Bucket();
      newBucket = new Bucket();
      key = getKey(bucket);
    });

    it('should not modify `localQueue.sent`', () => {
      getLocalQueue(bucket).sent = { foo: 'foo' };
      localQueueStore.persist(bucket);
      localQueueStore.restoreTo(newBucket);
      expect(getLocalQueue(newBucket).sent).toEqual({});
    });

    it('should not modify the localQueue if persisted data does not exist', () => {
      localQueueStore.restoreTo(newBucket);
      expect(getLocalQueue(newBucket).queues).toEqual({});
    });

    it('should correctly restore empty objects', () => {
      localQueueStore.persist(bucket);
      localQueueStore.restoreTo(newBucket);
      expect(getLocalQueue(newBucket).queues).toEqual({});
    });

    it('should add `sent` changes to `queues`', () => {
      // Offline changes may be enqueued to `sent`, if it happens before
      // the channel realizes it has been disconnected.
      const mockChange = { id: 'foo' };
      getLocalQueue(bucket).sent = { foo: mockChange };
      getLocalQueue(bucket).queues = { foo: [] };
      localQueueStore.persist(bucket);
      localQueueStore.restoreTo(newBucket);
      expect(getLocalQueue(newBucket).queues['foo']).toEqual([mockChange]);
    });

    it('should ignore `sent` changes for entities that have other changes in `queues`', () => {
      // This avoids mangling the data with duplicate conflicting changes
      getLocalQueue(bucket).sent = { foo: { id: 'foo' } };
      const laterChange = ['this change should prevail'];
      getLocalQueue(bucket).queues = { foo: laterChange };
      localQueueStore.persist(bucket);
      localQueueStore.restoreTo(newBucket);
      expect(getLocalQueue(newBucket).queues['foo']).toEqual(laterChange);
    });

    it('should remove the localStorage item when done', () => {
      localQueueStore.persist(bucket);
      localQueueStore.restoreTo(newBucket);
      expect(localStorage.getItem(key)).toBe(null);
    });
  });

  describe('getKey', () => {
    it('should generate a unique key', () => {
      expect(getKey({ name: 'foo' })).not.toBe(getKey({ name: 'bar' }));
    });
  });
});
