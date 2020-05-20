import type {
  BucketObject,
  BucketStore,
  EntityCallback,
  EntitiesCallback,
} from 'simperium';
import * as S from '../../';
import * as T from '../../../types';
import actions from '../../actions';

export class NoteBucket implements BucketStore<T.Note> {
  store: S.Store;

  constructor(store: S.Store) {
    this.store = store;
  }

  get(noteId: T.EntityId, callback: EntityCallback<BucketObject<T.Note>>) {
    const note = this.store.getState().data.notes.get(noteId);

    callback(null, { id: noteId, data: note });
  }

  find(query: {}, callback: EntitiesCallback<BucketObject<T.Note>>) {
    callback(
      null,
      [...this.store.getState().data.notes.entries()].map(([noteId, note]) => ({
        id: noteId,
        data: note,
      }))
    );
  }

  remove(noteId: T.EntityId, callback: (error: null) => void) {
    this.store.dispatch({
      type: 'REMOTE_NOTE_DELETE_FOREVER',
      noteId,
    });
    callback(null);
  }

  update(
    noteId: T.EntityId,
    note: T.Note,
    isIndexing: boolean,
    callback: EntityCallback<BucketObject<T.Note>>
  ) {
    this.store.dispatch(actions.simperium.remoteNoteUpdate(noteId, note));
    callback(null, { id: noteId, data: note });
  }
}
