import type * as T from '../types';

export const MAX_TAG_HASH_LENGTH = 256;

export const tagHashOf = (tagName: T.TagName): T.TagHash => {
  const normalized = tagName.normalize('NFC');
  const lowercased = normalized.toLocaleLowerCase('en-US');
  const encoded = encodeURIComponent(lowercased);

  return encoded.replace(
    /[!'()*\-_~.]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  ) as T.TagHash;
};

export const tagNameOf = (tagHash: T.TagHash): T.TagName =>
  decodeURIComponent(tagHash) as T.TagName;

export const withTag = (tags: T.TagName[], tag: T.TagName): T.TagName[] => {
  const hash = tagHashOf(tag);
  const tagAt = tags.findIndex((tagName) => tagHashOf(tagName) === hash);
  return tagAt > -1 ? tags : [...tags, tag];
};

export const withoutTag = (tags: T.TagName[], tag: T.TagName): T.TagName[] => {
  const hash = tagHashOf(tag);

  for (const tagName of tags) {
    if (tagHashOf(tagName) === hash) {
      return tags.filter((tagName) => tagHashOf(tagName) !== hash);
    }
  }

  return tags;
};

export const isTagInputKey = (key: number) => {
  // Check if a key will add to an input based on keycodes from https://keycode.info
  if (key >= 48 && key <= 90) {
    return true;
  }
  if (key >= 160 && key <= 165) {
    return true;
  }
  if (key >= 170 && key <= 171) {
    return true;
  }
  if (key >= 186 && key <= 194) {
    return true;
  }
  if (key >= 219 && key <= 223) {
    return true;
  }
  if (key >= 225 && key <= 226) {
    return true;
  }

  return false;
};
