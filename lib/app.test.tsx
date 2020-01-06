import React from 'react';
import { shallow } from 'enzyme';

import App from './app';

window.matchMedia = jest.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
});

describe('App', () => {
  it('should render', () => {
    const app = shallow(<App />);
    expect(app.exists()).toBe(true);
  });
});
