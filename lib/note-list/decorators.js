import React from 'react';
import replaceToArray from 'string-replace-to-array';

import Checkbox from '../components/checkbox';
import Heading from '../components/heading';
import { taskPrefixRegex } from '../note-detail/toggle-task/constants';

const headingPrefixRegex = /^([#]{1,6)\s+[^\s]/g;

export const decorateWith = (decorators, text) => {
  let output = text;
  let i = 0;

  decorators.forEach(({ filter, replacer }) => {
    output = replaceToArray(output, filter, replacer(i++));
  });

  return output;
};

export const headingDecorator = {
  filter: headingPrefixRegex,
  replacer: key => match => {
    const headingLevel = match[1].length;
    return <Heading headingLevel={headingLevel} key={key} />;
  },
};

export const checkboxDecorator = {
  filter: taskPrefixRegex,
  replacer: key => match => {
    const isChecked = /x/i.test(match);
    return <Checkbox checked={isChecked} key={key} />;
  },
};

export const makeFilterDecorator = filter => ({
  filter,
  replacer: key => match => {
    if (match.length) {
      return (
        <span className="search-match" key={key}>
          {match}
        </span>
      );
    }
  },
});
