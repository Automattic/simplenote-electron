import { noteBucket } from './buckets';
import isEmailTag from '../../utils/is-email-tag';
import { createTag } from './tags';

export const updateNoteTags = ({ note, tags }) => {
  return (dispatch, getState) => {
    if (!note) {
      return;
    }

    noteBucket().update(note.id, {
      ...note.data,
      tags,
      modificationDate: Math.floor(Date.now() / 1000),
    });

    const existingTagNames = new Set(
      getState().appState.tags.map(tag => tag.data.name)
    );

    tags
      .filter(name => !existingTagNames.has(name))
      .filter(name => !isEmailTag(name))
      .forEach(name => createTag({ name }));
  };
};
