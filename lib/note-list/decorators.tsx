import React from 'react';
import { escapeRegExp } from 'lodash';
import replaceToArray from 'string-replace-to-array';

import Checkbox from '../components/checkbox';
import { withoutTags } from '../utils/filter-notes';
import { taskPrefixRegex } from '../note-detail/toggle-task/constants';

export const decorateWith = (decorators, text) =>
  decorators
    .reduce((output, { filter, replacer }) => {
      const searchText = 'string' === typeof filter && withoutTags(filter);
      const pattern =
        searchText && searchText.length > 0
          ? new RegExp(escapeRegExp(searchText), 'g')
          : filter;

      return replaceToArray(output, pattern, replacer);
    }, text)
    .map((chunk, key) =>
      chunk && 'string' !== typeof chunk
        ? React.cloneElement(chunk, { key })
        : chunk
    );

export const checkboxDecorator = {
  filter: taskPrefixRegex,
  replacer: match => {
    const isChecked = /x/i.test(match);
    return <Checkbox checked={isChecked} />;
  },
};

export const makeFilterDecorator = filter => ({
  filter,
  replacer: match => {
    if (match.length) {
      return <span className="search-match">{match}</span>;
    }
  },
});
