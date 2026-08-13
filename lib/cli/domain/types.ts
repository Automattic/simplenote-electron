// Shared domain shapes for the CLI.
//
// These used to be scattered across auth.ts (Credentials), note-source.ts
// (NoteSource, NewNote) and cli-args.ts (ContentSource). Pulling them here
// gives one home for the vocabulary the whole module speaks and removes the
// inverted dependency where store.ts (a persistence layer) imported a type
// from auth.ts (a network layer).

import type { BucketObject } from '../vendor/types.ts';
import type * as T from '../vendor/types.ts';

export interface Credentials {
  access_token: string;
  username: string;
}

export type NewNote = {
  content: string;
  tags?: T.TagName[];
  systemTags?: T.SystemTag[];
};

export type FindOptions = {
  /**
   * Whether the index fetch should keep trashed notes. Defaults to `true`.
   *
   * `list`/`search`/`add` only ever work with live notes, so letting them
   * pass `false` drops trashed records at the page boundary: they are never
   * parsed, retained in memory or re-filtered downstream. `export` needs both
   * halves and keeps the default.
   */
  includeTrashed?: boolean;
};

export type NoteSource = {
  find(options?: FindOptions): Promise<BucketObject<T.Note>[]>;
  /**
   * A note plus the version the server attached to this read. `version` is
   * the base a subsequent `update` should be computed against (`/v/{v}`), so
   * concurrent edits to other fields merge instead of being clobbered. It is
   * absent when the read carried no usable version header.
   */
  get(
    id: string
  ): Promise<(BucketObject<T.Note> & { version?: number }) | undefined>;
  update(id: string, content: string): Promise<{ version: number }>;
  create(note: NewNote): Promise<{ id: string; version: number }>;
};

export type ContentSource = {
  content: string;
  fromFile: boolean;
};
