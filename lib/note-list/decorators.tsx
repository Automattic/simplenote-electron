import React from 'react';
import { escapeRegExp } from 'lodash';
import replaceToArray from 'string-replace-to-array';

import { withoutTags } from '../utils/filter-notes';
import { removeDiacritics } from '../utils/note-utils';

export const decorateWith = (decorators, text) =>
  decorators.length > 0 && text.length > 0
    ? decorators
        .reduce((output, { filter, replacer }) => {
          const searchText = 'string' === typeof filter && withoutTags(filter);
          const pattern =
            searchText && searchText.length > 0
              ? new RegExp(escapeRegExp(searchText), 'gi')
              : filter;

          const res = replaceToArray(output, pattern, replacer);
          const test = replaceToArray(
            removeDiacritics(output),
            pattern,
            replacer
          );
          console.log(res, output, pattern, replacer);
          console.log(test.join(''));
          return res;
        }, text)
        .map((chunk, key) =>
          chunk && 'string' !== typeof chunk
            ? React.cloneElement(chunk, { key })
            : chunk
        )
    : text;

export const makeFilterDecorator = (filter) => ({
  filter,
  replacer: (match) => {
    if (match.length) {
      return <span className="search-match">{match}</span>;
    }
  },
});
