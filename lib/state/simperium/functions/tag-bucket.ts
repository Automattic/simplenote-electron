import type {
  BucketObject,
  BucketStore,
  EntityCallback,
  EntitiesCallback,
} from 'simperium';
import type * as S from '../../';
import type * as T from '../../../types';

export class TagBucket implements BucketStore<T.Tag> {
  store: S.Store;

  constructor(store: S.Store) {
    this.store = store;
  }

  get(tagId: T.EntityId, callback: EntityCallback<BucketObject<T.Tag>>) {
    const tag = this.store.getState().data.tags.get(tagId);

    callback(null, { id: tagId, data: tag });
  }

  find(query: {}, callback: EntitiesCallback<BucketObject<T.Tag>>) {
    callback(
      null,
      [...this.store.getState().data.tags.entries()].map(([tagHash, tag]) => ({
        id: tagHash,
        data: tag,
      }))
    );
  }

  remove(tagId: T.EntityId, callback: (error: null) => void) {
    this.store.dispatch({
      type: 'TAG_BUCKET_REMOVE',
      tagHash: tagId,
    });
    callback(null);
  }

  update(
    tagId: T.EntityId,
    tag: T.Tag,
    isIndexing: boolean,
    callback: EntityCallback<BucketObject<T.Tag>>
  ) {
    this.store.dispatch({
      type: 'TAG_BUCKET_UPDATE',
      tagHash: tagId,
      tag,
      isIndexing,
    });
    callback(null, { id: tagId, data: tag });
  }
}
