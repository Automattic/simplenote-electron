import Checkbox from './';
import CheckmarkIcon from '../../icons/checkmark';
import CircleIcon from '../../icons/circle';
import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';

it("hasn't had its output unintentionally altered", () => {
  const tree = renderer.create(<Checkbox checked={false}></Checkbox>).toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders the circle icon when unchecked', () => {
  const checkbox = shallow(<Checkbox checked={false}></Checkbox>);
  expect(checkbox.find(CircleIcon)).toHaveLength(1);
  expect(checkbox.find(CheckmarkIcon)).toHaveLength(0);
});

it('renders the checkmark icon when checked', () => {
  const checkbox = shallow(<Checkbox checked={true}></Checkbox>);
  expect(checkbox.find(CircleIcon)).toHaveLength(0);
  expect(checkbox.find(CheckmarkIcon)).toHaveLength(1);
});

it('should call onChange prop when span is clicked', () => {
  const noop = jest.fn();
  const output = renderer.create(<Checkbox onChange={noop}></Checkbox>);
  output.root.findByType('span').props.onClick();
  expect(noop).toHaveBeenCalled();
});
