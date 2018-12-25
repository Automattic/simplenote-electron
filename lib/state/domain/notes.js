import { store } from '../';
import { noteBucket } from './buckets';
import appState from '../../flux/app-state';
import isEmailTag from '../../utils/is-email-tag';
import { createTag } from './tags';

const { selectNote } = appState.actionCreators;

export const updateNoteTags = ({ note, tags }) => {
  if (note) {
    let state = store.getState().appState;

    note.data.tags = tags;
    note.data.modificationDate = Math.floor(Date.now() / 1000);
    noteBucket().update(note.id, note.data);

    store.dispatch(selectNote({ note }));

    let currentTagNames = state.tags.map(tag => tag.data.name);
    for (let i = 0; i < tags.length; i++) {
      let tag = tags[i];

      if (currentTagNames.indexOf(tag) !== -1) {
        continue;
      }

      if (isEmailTag(tag)) {
        continue;
      }

      createTag({ name: tag });
    }
  }
};
