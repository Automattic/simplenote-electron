import type {
  BucketObject,
  BucketStore,
  EntityCallback,
  EntitiesCallback,
} from 'simperium';
import * as S from '../../';
import * as T from '../../../types';

export class PreferencesBucket implements BucketStore<T.Preferences> {
  store: S.Store;

  constructor(store: S.Store) {
    this.store = store;
  }

  get(id: T.EntityId, callback: EntityCallback<BucketObject<T.Preferences>>) {
    const data = this.store.getState().data.preferences.get(id);

    callback(null, { id, data });
  }

  find(query: {}, callback: EntitiesCallback<BucketObject<T.Preferences>>) {
    callback(
      null,
      [...this.store.getState().data.preferences.entries()].map(
        ([id, data]) => ({ id, data })
      )
    );
  }

  remove(id: T.EntityId, callback: (error: null) => void) {
    this.store.dispatch({
      type: 'PREFERENCES_BUCKET_REMOVE',
      id,
    });
    callback(null);
  }

  update(
    id: T.EntityId,
    data: T.Preferences,
    isIndexing: boolean,
    callback: EntityCallback<BucketObject<T.Preferences>>
  ) {
    this.store.dispatch({
      type: 'PREFERENCES_BUCKET_UPDATE',
      id,
      data,
      isIndexing,
    });
    callback(null, { id, data });
  }
}
