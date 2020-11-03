import React from 'react';
import { escapeRegExp } from 'lodash';
import removeAccents from '../utils/remove-accents';

import { withoutTags } from '../utils/filter-notes';

function replaceToArray(string, regexp, newValueOrFn) {
  console.log(string);
  var output = [];

  var replacerIsFn = typeof newValueOrFn === 'function';

  var storedLastIndex = regexp.lastIndex;
  regexp.lastIndex = 0;

  var result;
  var lastIndex = 0;
  while ((result = regexp.exec(string))) {
    var index = result.index;

    if (result[0] === '') {
      // When the regexp is an empty string
      // we still want to advance our cursor to the next item.
      // This is the behavior of String.replace.
      regexp.lastIndex++;
    }

    if (index !== lastIndex) {
      output.push(string.substring(lastIndex, index));
    }

    var match = result[0];
    lastIndex = index + match.length;

    var out = replacerIsFn
      ? newValueOrFn.apply(this, result.concat(index, result.input))
      : newValueOrFn;
    output.push(out);

    if (!regexp.global) {
      break;
    }
  }

  if (lastIndex < string.length) {
    output.push(string.substring(lastIndex));
  }

  regexp.lastIndex = storedLastIndex;
  return output;
}

export const decorateWith = (decorators, text) => {
  if (!decorators.length > 0) {
    return text;
  }

  return decorators
    .reduce((output, { filter, replacer }) => {
      const searchText =
        'string' === typeof filter && removeAccents(withoutTags(filter));
      const pattern =
        searchText && searchText.length > 0
          ? new RegExp(escapeRegExp(searchText), 'gi')
          : filter;
      console.log(output);
      return replaceToArray(output, pattern, replacer);
    }, removeAccents(text))
    .map((chunk, key) =>
      chunk && 'string' !== typeof chunk
        ? React.cloneElement(chunk, { key })
        : chunk
    );
};
// console.log();
// decorators.length > 0
//   ? decorators
//       .reduce((output, { filter, replacer }) => {
//         const searchText =
//           'string' === typeof filter && removeAccents(withoutTags(filter));
//         const pattern =
//           searchText && searchText.length > 0
//             ? new RegExp(escapeRegExp(searchText), 'gi')
//             : filter;
//         console.log(output);
//         return replaceToArray(output, pattern, replacer);
//       }, removeAccents(text))
//       .map((chunk, key) =>
//         chunk && 'string' !== typeof chunk
//           ? React.cloneElement(chunk, { key })
//           : chunk
//       )
//   : text;

export const makeFilterDecorator = (filter) => ({
  filter,
  replacer: (match) => {
    if (match.length) {
      return <span className="search-match">{match}</span>;
    }
  },
});
