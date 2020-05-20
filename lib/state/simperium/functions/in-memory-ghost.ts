import { ChangeVersion, EntityId, GhostStore, Ghost } from 'simperium';

export class InMemoryGhost<U> implements GhostStore<U> {
  cv: ChangeVersion;
  entities: Map<EntityId, Ghost<U>>;

  constructor() {
    this.cv = '';
    this.entities = new Map();
  }

  getChangeVersion(): Promise<ChangeVersion> {
    return Promise.resolve(this.cv);
  }

  setChangeVersion(version: ChangeVersion): Promise<void> {
    this.cv = version;
    return Promise.resolve();
  }

  get(entityId: EntityId): Promise<Ghost<U>> {
    return Promise.resolve(
      this.entities.get(entityId) ?? ({ key: entityId, data: {} } as Ghost<U>)
    );
  }

  put(entityId: EntityId, version: number, data: U): Promise<Ghost<U>> {
    const ghost = { key: entityId, data, version };
    this.entities.set(entityId, ghost);

    return Promise.resolve(ghost);
  }

  remove(entityId: EntityId): Promise<Ghost<U>> {
    const ghost = this.entities.get(entityId);
    this.entities.delete(entityId);

    return Promise.resolve(ghost);
  }

  eachGhost(iterator: (ghost: Ghost<U>) => void) {
    this.entities.forEach((ghost) => iterator(ghost));
  }
}
