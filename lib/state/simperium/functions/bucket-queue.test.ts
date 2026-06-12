import { BucketQueue } from './bucket-queue';

import type { Bucket } from 'simperium';

type MockBucket = {
  name: string;
  isIndexing: boolean;
  on: jest.Mock;
  touch: jest.Mock;
  emit: (event: string) => void;
};

const makeBucket = (): MockBucket => {
  const handlers = new Map<string, Array<() => void>>();
  return {
    name: 'note',
    isIndexing: false,
    on: jest.fn((event: string, handler: () => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    touch: jest.fn().mockResolvedValue(undefined),
    emit: (event: string) => handlers.get(event)?.forEach((cb) => cb()),
  };
};

const makeQueue = (bucket: MockBucket) =>
  new BucketQueue(bucket as unknown as Bucket<'note', unknown>);

const setOnline = (onLine: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: onLine,
  });

describe('BucketQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setOnline(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs nothing while the queue is empty', () => {
    const bucket = makeBucket();
    makeQueue(bucket);

    jest.advanceTimersByTime(60000);
    expect(bucket.touch).not.toHaveBeenCalled();
  });

  it('syncs an entity once its deadline passes', () => {
    const bucket = makeBucket();
    const queue = makeQueue(bucket);

    queue.add('note-1', Date.now() + 100);
    expect(queue.has('note-1')).toBe(true);

    jest.advanceTimersByTime(99);
    expect(bucket.touch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(bucket.touch).toHaveBeenCalledTimes(1);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
    expect(queue.has('note-1')).toBe(false);
  });

  it('keeps the earliest deadline when an entity is re-added', () => {
    const bucket = makeBucket();
    const queue = makeQueue(bucket);

    queue.add('note-1', Date.now() + 1000);
    queue.add('note-1', Date.now() + 5000);

    jest.advanceTimersByTime(1000);
    expect(bucket.touch).toHaveBeenCalledTimes(1);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
  });

  it('syncs all due entities', () => {
    const bucket = makeBucket();
    const queue = makeQueue(bucket);

    queue.add('note-1', Date.now() + 10);
    queue.add('note-2', Date.now() + 10);

    jest.advanceTimersByTime(50);
    expect(bucket.touch).toHaveBeenCalledTimes(2);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
    expect(bucket.touch).toHaveBeenCalledWith('note-2');
  });

  it('waits while the bucket is indexing and syncs afterwards', () => {
    const bucket = makeBucket();
    bucket.isIndexing = true;
    const queue = makeQueue(bucket);

    queue.add('note-1', Date.now());

    jest.advanceTimersByTime(9999);
    expect(bucket.touch).not.toHaveBeenCalled();

    bucket.isIndexing = false;
    jest.advanceTimersByTime(1);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
  });

  it('reschedules when indexing finishes', () => {
    const bucket = makeBucket();
    bucket.isIndexing = true;
    const queue = makeQueue(bucket);

    queue.add('note-1', Date.now());

    bucket.isIndexing = false;
    bucket.emit('index');

    jest.advanceTimersByTime(0);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
  });

  it('does not sync while offline and recovers on the online event', () => {
    const bucket = makeBucket();
    const queue = makeQueue(bucket);

    setOnline(false);
    queue.add('note-1', Date.now());

    jest.advanceTimersByTime(30000);
    expect(bucket.touch).not.toHaveBeenCalled();
    expect(queue.has('note-1')).toBe(true);

    setOnline(true);
    window.dispatchEvent(new Event('online'));

    jest.advanceTimersByTime(0);
    expect(bucket.touch).toHaveBeenCalledWith('note-1');
  });
});
