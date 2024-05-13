import type * as T from '../types';

export const tagHashOf = (tagName: T.TagName): T.TagHash => {
  const normalized = tagName.normalize('NFC');
  const lowercased = normalized.toLocaleLowerCase('en-US');
  const encoded = encodeURIComponent(lowercased);

  return encoded.replace(
    /[!'()*]/g,
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
      return tags.filter((name) => tagHashOf(name) !== hash);
    }
  }

  return tags;
};
