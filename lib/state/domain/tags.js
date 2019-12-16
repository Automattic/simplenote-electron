import { noteBucket, tagBucket } from './buckets';
import appState from '../../flux/app-state';

const { tagsLoaded } = appState.actionCreators;

export const loadTags = () => (dispatch, getState) => {
  const sortTagsAlpha = getState().settings.sortTagsAlpha;
  tagBucket().query(db => {
    var tags = [];
    db
      .transaction('tag')
      .objectStore('tag')
      .openCursor(null, 'prev').onsuccess = e => {
      var cursor = e.target.result;
      if (cursor) {
        tags.push(cursor.value);
        cursor.continue();
      } else {
        dispatch(tagsLoaded({ tags, sortTagsAlpha }));
      }
    };
  });
};

export const createTag = ({ name }) => {
  // tag.id must be the tag name in lower case and percent escaped
  const tagId = encodeURIComponent(name.toLowerCase());
  tagBucket().update(tagId, { name });
};

export const reorderTags = ({ tags }) => () =>
  tags.forEach((tag, index) =>
    tagBucket().update(tag.id, { ...tag.data, index })
  );

export const renameTag = ({ tag, name: newName }) => (dispatch, getState) => {
  const { notes } = getState().appState;
  const tagName = tag.data.name;

  if (tagName === newName) {
    return;
  }

  tagBucket().update(tag.id, { ...tag.data, name: newName });

  notes
    .filter(({ data: { tags } }) => (tags || []).includes(tagName))
    .map(note => ({
      ...note,
      data: {
        ...note.data,
        tags: note.data.tags.map(noteTag =>
          noteTag === tagName ? name : noteTag
        ),
      },
    }))
    .forEach(note => noteBucket().update(note.id, note.data));
};

export const trashTag = ({ tag }) => (dispatch, getState) => {
  const { notes } = getState().appState;
  const tagName = tag.data.name;

  notes
    .filter(({ data: { tags } }) => (tags || []).includes(tagName))
    .map(note => ({
      ...note,
      data: {
        ...note.data,
        tags: note.data.tags.filter(noteTag => noteTag !== tagName),
      },
    }))
    .forEach(note => noteBucket().update(note.id, note.data));

  tagBucket().remove(tag.id, () => dispatch(loadTags()));
};
