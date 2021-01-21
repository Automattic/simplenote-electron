///////////////////////////////////////
// Simplenote Data Model
///////////////////////////////////////

export type EntityId = Brand<string, 'EntityId'>;

export type SecondsEpoch = number;
export type Entity<T> = {
  id: EntityId;
  data: T;
  version: number;
};

export type TagHash = Brand<string, 'TagHash'> | EntityId;
export type TagName = Brand<string, 'TagName'>;
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

export type NoteEntity = Entity<Note>;

export type Tag = {
  index?: number;
  name: TagName;
};

export type TagEntity = Entity<Tag>;

export type Preferences = {
  analytics_enabled: boolean | null;
};

export type AnalyticsRecord = [string, JSONSerializable | undefined];

export type PreferencesEntity = Entity<Preferences>;

export type VerificationState = 'verified' | 'pending' | 'unknown';

///////////////////////////////////////
// Simperium Types
///////////////////////////////////////
export type ConnectionState = 'green' | 'red' | 'offline';

///////////////////////////////////////
// Application Types
///////////////////////////////////////
export type DialogType =
  | 'ABOUT'
  | 'BETA-WARNING'
  | 'CLOSE-WINDOW-CONFIRMATION'
  | 'IMPORT'
  | 'KEYBINDINGS'
  | 'LOGOUT-CONFIRMATION'
  | 'SETTINGS'
  | 'SHARE';
export type LineLength = 'full' | 'narrow';
export type ListDisplayMode = 'expanded' | 'comfy' | 'condensed';
export type SortType = 'alphabetical' | 'creationDate' | 'modificationDate';
export type Theme = 'system' | 'light' | 'dark';
export type TranslatableString = Brand<string, 'TranslatableString'>;

///////////////////////////////////////
// Language and Platform
///////////////////////////////////////

export type Brand<T, Name> = T & { __type__: Name };

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | Array<JSONValue>
  | { [key: string]: JSONValue };

export type JSONSerializable = { [key: string]: JSONValue };

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

// Returns a type with the properties in T not also present in U
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

// Either type T or type U, a powered-up union/sum type
// useful when missing a discriminating property
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;
