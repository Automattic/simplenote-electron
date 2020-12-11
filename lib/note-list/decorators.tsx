import React from 'react';
import { escapeRegExp } from 'lodash';
import replaceToArray from 'string-replace-to-array';

import { withoutTags } from '../utils/filter-notes';

export const decorateWith = (decorators, text) =>
  decorators.length > 0 && text.length > 0
    ? decorators
        .reduce((output, { filter, replacer }) => {
          const searchText = 'string' === typeof filter && withoutTags(filter);
          const pattern =
            searchText && searchText.length > 0
              ? new RegExp(escapeRegExp(searchText), 'gi')
              : filter;

          return replaceToArray(output, pattern, replacer);
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
