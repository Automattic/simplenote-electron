///////////////////////////////////////
// Simplenote Data Model
///////////////////////////////////////

export type EntityId = string;
export type SecondsEpoch = number;

type Entity<T> = {
  id: EntityId;
  data: T;
  version: number;
};

export type TagName = string;
export type SystemTag = 'markdown' | 'pinned' | 'published' | 'shared';

export type Note = {
  content: string;
  creationDate: SecondsEpoch;
  deleted: boolean;
  modificationDate: SecondsEpoch;
  publishURL?: string;
  shareURL?: string;
  systemTags: SystemTag[];
  tags: TagName[];
};

export type NoteEntity = Entity<Note> & { hasRemoteUpdate?: boolean };

export type Tag = {
  index?: number;
  name: TagName;
};

export type TagEntity = Entity<Tag>;

export type Preferences = {
  analytics_enabled: boolean;
};

export type PreferencesEntity = Entity<Preferences>;

export type Bucket<T> = {
  add(
    data: T,
    callback: (error: Error | null, data: Entity<T> | null) => any
  ): void;
  get(
    entityId: EntityId,
    callback: (error: Error | null, data: Entity<T> | null) => any
  ): void;
  getRevisions(
    entityId: EntityId,
    callback: (error: Error, revisions: Entity<T>[]) => any
  ): void;
  query(fn: (db: IDBDatabase) => any): void;
  remove(entityId: EntityId): void;
  update(entityId: EntityId, data: T): void;
};

///////////////////////////////////////
// Application Types
///////////////////////////////////////
export type LineLength = 'full' | 'narrow';
export type ListDisplayMode = 'expanded' | 'comfy' | 'condensed';
export type SortType = 'alphabetical' | 'creationDate' | 'modificationDate';
export type Theme = 'system' | 'light' | 'dark';
export type TranslatableString = string;
