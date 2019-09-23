import React from 'react';
import Checkbox from './';
import renderer from 'react-test-renderer';

it('renders Checkbox correctly when checked', () => {
  const tree = renderer.create(<Checkbox checked={false}></Checkbox>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders Checkbox correctly when not checked', () => {
  const tree = renderer.create(<Checkbox checked={true}></Checkbox>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('should call onChange prop when span is clicked', () => {
  const noop = jest.fn();
  const output = renderer.create(<Checkbox onChange={noop}></Checkbox>);
  output.root.findByType('span').props.onClick();
  expect(noop).toHaveBeenCalled();
});
