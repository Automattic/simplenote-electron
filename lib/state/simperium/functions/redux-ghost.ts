import { ChangeVersion, EntityId, GhostStore, Ghost } from 'simperium';
import * as S from '../../';

export class ReduxGhost implements GhostStore<unknown> {
  bucketName: string;
  store: S.Store;

  constructor(bucketName: string, store: S.Store) {
    this.bucketName = bucketName;
    this.store = store;
  }

  getChangeVersion(): Promise<ChangeVersion> {
    const cv = this.store.getState().simperium.ghosts[0].get(this.bucketName);

    return Promise.resolve(cv);
  }

  setChangeVersion(version: ChangeVersion): Promise<void> {
    this.store.dispatch({
      type: 'GHOST_SET_CHANGE_VERSION',
      bucketName: this.bucketName,
      version,
    });

    return Promise.resolve();
  }

  get(entityId: EntityId): Promise<Ghost<unknown>> {
    const bucket = this.store
      .getState()
      .simperium.ghosts[1].get(this.bucketName);
    const ghost = bucket?.get(entityId);

    return Promise.resolve(ghost ?? { key: entityId, data: {} });
  }

  put(
    entityId: EntityId,
    version: number,
    data: unknown
  ): Promise<Ghost<unknown>> {
    const ghost = { key: entityId, data, version };
    this.store.dispatch({
      type: 'GHOST_SET_ENTITY',
      bucketName: this.bucketName,
      entityId,
      ghost,
    });

    return Promise.resolve(ghost);
  }

  remove(entityId: EntityId): Promise<Ghost<unknown>> {
    const bucket = this.store
      .getState()
      .simperium.ghosts[1].get(this.bucketName);
    const ghost = bucket?.get(entityId);
    this.store.dispatch({
      type: 'GHOST_REMOVE_ENTITY',
      bucketName: this.bucketName,
      entityId,
    });

    return Promise.resolve(ghost);
  }

  eachGhost(iterator: (ghost: Ghost<unknown>) => void) {
    const bucket =
      this.store.getState().simperium.ghosts[1].get(this.bucketName) ??
      new Map();

    bucket.forEach((ghost) => iterator(ghost));
  }
}
