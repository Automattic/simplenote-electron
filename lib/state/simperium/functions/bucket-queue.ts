import debugFactory from 'debug';
import type { Bucket, EntityId } from 'simperium';

export class BucketQueue<BucketName, EntityType> {
  log: ReturnType<typeof debugFactory>;
  nextDeadline = Date.now() + 1000;
  bucket: Bucket<BucketName, EntityType>;
  queue: Map<EntityId, number>;
  runTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(bucket: Bucket<BucketName, EntityType>) {
    this.bucket = bucket;
    this.log = debugFactory(`bucket-queue:${bucket.name}`);
    this.queue = new Map();

    // we should be able to send changes as soon as indexing is done
    // so reschedule to cull the 1s delay normally set when indexing
    bucket.on('index', () => this.schedule());

    this.schedule();
  }

  add(entityId: EntityId, deadline: number): void {
    const existingDeadline = this.queue.get(entityId) ?? Infinity;
    const nextDeadline = Math.min(deadline, existingDeadline);
    this.nextDeadline = Math.min(this.nextDeadline, nextDeadline);

    this.log(`added "${entityId}" with deadline ${new Date(nextDeadline)}`);

    this.queue.set(entityId, nextDeadline);
    this.schedule();
  }

  private run(): void {
    this.process();
    this.schedule();
  }

  private schedule(): void {
    this.runTimer && clearTimeout(this.runTimer);
    this.runTimer = setTimeout(
      () => this.run(),
      this.bucket.isIndexing ? 1000 : this.nextDeadline - Date.now()
    );
  }

  private process(): void {
    if (this.bucket.isIndexing) {
      this.log('skipping processing run because bucket is indexing');
      return;
    }

    const entityId = this.getNextNote();
    if (null === entityId) {
      return;
    }

    this.log(`telling bucket to sync ${entityId}`);
    this.queue.delete(entityId);
    this.bucket.touch(entityId).then(() => this.log(`sync'd ${entityId}`));
  }

  private getNextNote(): EntityId | null {
    const now = Date.now();

    for (const [entityId, deadline] of this.queue) {
      if (deadline <= now) {
        return entityId;
      }
    }

    return null;
  }
}
