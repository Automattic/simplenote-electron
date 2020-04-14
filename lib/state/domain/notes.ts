import { noteBucket } from './buckets';
import isEmailTag from '../../utils/is-email-tag';
import { createTag } from './tags';
import * as T from '../../types';

export const toggleSystemTag = (
  note: T.NoteEntity,
  systemTag: T.SystemTag,
  shouldHaveTag: boolean
) => {
  const {
    data: { systemTags = [] },
  } = note;
  const hasTagAlready = systemTags.includes(systemTag);

  return hasTagAlready !== shouldHaveTag
    ? {
        ...note,
        data: {
          ...note.data,
          systemTags: shouldHaveTag
            ? [...systemTags, systemTag]
            : systemTags.filter((tag) => tag !== systemTag),
        },
      }
    : note;
};

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
      getState().appState.tags.map((tag) => tag.data.name)
    );

    tags
      .filter((name) => !existingTagNames.has(name))
      .filter((name) => !isEmailTag(name))
      .forEach((name) => createTag({ name }));
  };
};
