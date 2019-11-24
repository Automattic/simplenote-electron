import Heading from './';
import React from 'react';
import { shallow } from 'enzyme';

test.each([1, 2, 3, 4, 5, 6])('renders h%d', level => {
  const wrapped = shallow(<Heading headingLevel={level}>Test</Heading>);
  expect(wrapped.type()).toBe(`h${level}`);
});
