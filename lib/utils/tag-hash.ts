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
