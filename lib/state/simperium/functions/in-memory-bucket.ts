import type {
  BucketObject,
  BucketStore,
  EntityCallback,
  EntitiesCallback,
} from 'simperium';
import type * as T from '../../../types';

export class InMemoryBucket<U> implements BucketStore<U> {
  entities: Map<T.EntityId, U>;

  constructor() {
    this.entities = new Map();
  }

  get(id: T.EntityId, callback: EntityCallback<BucketObject<U>>) {
    callback(null, { id, data: this.entities.get(id) });
  }

  find(query: {}, callback: EntitiesCallback<BucketObject<U>>) {
    callback(
      null,
      [...this.entities].map(([id, data]) => ({ id, data }))
    );
  }

  remove(id: T.EntityId, callback: (error: null) => void) {
    this.entities.delete(id);
    callback(null);
  }

  update(
    id: T.EntityId,
    data: U,
    isIndexing: boolean,
    callback: EntityCallback<BucketObject<U>>
  ) {
    this.entities.set(id, data);
    callback(null, { id, data, isIndexing });
  }
}
