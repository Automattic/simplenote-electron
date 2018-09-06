import React from 'react';
import renderer from 'react-test-renderer';
import { mount, shallow } from 'enzyme';

import TagChip from './';

describe('TagChip', () => {
  it('should select tag when clicked', () => {
    const selectIt = jest.fn();

    const chip = mount(<TagChip tag="spline" onSelect={selectIt} />);

    expect(selectIt).not.toHaveBeenCalled();
    chip.simulate('click');
    expect(selectIt).toHaveBeenCalled();
  });

  it('should not include the `selected` class by default', () => {
    const chip = shallow(<TagChip tag="spline" />);

    expect(chip.hasClass('selected')).toBe(false);
  });

  it('should include the `selected` class when selected', () => {
    const chip = shallow(<TagChip tag="spline" selected />);

    expect(chip.hasClass('selected')).toBe(true);
  });

  it('should toggle the `selected` class with prop changes', () => {
    const chip = shallow(<TagChip tag="spline" />);

    expect(chip.hasClass('selected')).toBe(false);

    chip.setProps({ selected: true });

    expect(chip.hasClass('selected')).toBe(true);

    chip.setProps({ selected: false });

    expect(chip.hasClass('selected')).toBe(false);
  });

  it('should not introduce visual regressions', () => {
    const component = renderer.create(<TagChip tag="spline" />).toJSON();

    expect(component).toMatchSnapshot();
  });
});
