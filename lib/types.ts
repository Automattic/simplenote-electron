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
  deleted: boolean | 0 | 1;
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
  analytics_enabled: boolean | null;
};

export type PreferencesEntity = Entity<Preferences>;

export type Bucket<T = unknown> = {
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
export type DialogType =
  | 'ABOUT'
  | 'KEYBINDINGS'
  | 'IMPORT'
  | 'SETTINGS'
  | 'SHARE';
export type LineLength = 'full' | 'narrow';
export type ListDisplayMode = 'expanded' | 'comfy' | 'condensed';
export type SortType = 'alphabetical' | 'creationDate' | 'modificationDate';
export type Theme = 'system' | 'light' | 'dark';
export type TranslatableString = string;

///////////////////////////////////////
// Language and Platform
///////////////////////////////////////

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | Array<JSONValue>
  | { [key: string]: JSONValue };

export type JSONSerializable = { [key: string]: JSONValue };

// Returns a type with the properties in T not also present in U
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

// Either type T or type U, a powered-up union/sum type
// useful when missing a discriminating property
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;
