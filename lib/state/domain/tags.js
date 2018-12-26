import { noteBucket, tagBucket } from './buckets';
import appState from '../../flux/app-state';
import throttle from '../../utils/throttle';

const typingThrottle = 3000;

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

export const reorderTags = ({ tags }) => () => {
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    tag.data.index = i;
    tagBucket().update(tag.id, tag.data);
  }
};

export const renameTag = ({ tag, name }) => (dispatch, getState) => {
  let oldTagName = tag.data.name;
  if (oldTagName === name) {
    return;
  }

  let { notes } = getState().appState;
  let changedNoteIds = [];

  tag.data.name = name;

  // update the tag bucket but don't fire a sync immediately
  tagBucket().update(tag.id, tag.data, { sync: false });

  // similarly, update the note bucket
  for (let i = 0; i < notes.length; i++) {
    let note = notes[i];
    let noteTags = note.data.tags || [];
    let tagIndex = noteTags.indexOf(oldTagName);

    if (tagIndex !== -1) {
      noteTags.splice(tagIndex, 1, name);
      note.data.tags = noteTags.filter(noteTag => noteTag !== oldTagName);
      noteBucket().update(note.id, note.data, { sync: false });
      changedNoteIds.push(note.id);
    }
  }

  throttle(tag.id, typingThrottle, () => {
    tagBucket().touch(tag.id, () => {
      dispatch(loadTags());

      for (let i = 0; i < changedNoteIds.length; i++) {
        noteBucket().touch(changedNoteIds[i]);
      }
    });
  });
};

export const trashTag = ({ tag }) => (dispatch, getState) => {
  var { notes } = getState().appState;
  var tagName = tag.data.name;

  for (let i = 0; i < notes.length; i++) {
    let note = notes[i];
    let noteTags = note.data.tags || [];
    let newTags = noteTags.filter(noteTag => noteTag !== tagName);

    if (newTags.length !== noteTags.length) {
      note.data.tags = newTags;
      noteBucket().update(note.id, note.data);
    }
  }

  tagBucket().remove(tag.id, () => dispatch(loadTags()));
};
