import React from 'react';
import replaceToArray from 'string-replace-to-array';

import Checkbox from '../components/checkbox';
import { taskPrefixRegex } from '../note-detail/toggle-task/constants';
import randomString from '..//utils/crypto-random-string';

const generateKey = () => randomString(6);

export const decorateWith = (decorators, text) => {
  let output = text;

  decorators.forEach(({ filter, replacer }) => {
    output = replaceToArray(output, filter, replacer);
  });

  return output;
};

export const checkboxDecorator = {
  filter: taskPrefixRegex,
  replacer: match => {
    const isChecked = /x/i.test(match);
    return <Checkbox checked={isChecked} key={generateKey()} />;
  },
};

export const makeFilterDecorator = filter => ({
  filter,
  replacer: match => {
    if (match.length) {
      return (
        <span className="search-match" key={generateKey()}>
          {match}
        </span>
      );
    }
  },
});
