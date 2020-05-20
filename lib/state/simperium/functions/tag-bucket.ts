import type {
  BucketObject,
  BucketStore,
  EntityCallback,
  EntitiesCallback,
} from 'simperium';
import * as S from '../../';
import * as T from '../../../types';

export class TagBucket implements BucketStore<T.Tag> {
  store: S.Store;

  constructor(store: S.Store) {
    this.store = store;
  }

  get(tagId: T.EntityId, callback: EntityCallback<BucketObject<T.Tag>>) {
    const tag = this.store.getState().data.tags[0].get(tagId);

    callback(null, { id: tagId, data: tag });
  }

  find(query: {}, callback: EntitiesCallback<BucketObject<T.Tag>>) {
    callback(
      null,
      [...this.store.getState().data.tags[0].entries()].map(([tagId, tag]) => ({
        id: tagId,
        data: tag,
      }))
    );
  }

  remove(tagId: T.EntityId, callback: (error: null) => void) {
    this.store.dispatch({
      type: 'REMOTE_TAG_DELETE',
      tagId,
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
      type: 'REMOTE_TAG_UPDATE',
      tagId,
      tag,
    });
    callback(null, { id: tagId, data: tag });
  }
}
