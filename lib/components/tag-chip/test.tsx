import React from 'react';
import renderer from 'react-test-renderer';
import { mount, shallow } from 'enzyme';

import TagChip from './';

describe('TagChip', () => {
  it('should select tag when clicked', () => {
    const selectIt = jest.fn();

    const chip = mount(<TagChip tagName="spline" onSelect={selectIt} />);

    expect(selectIt).not.toHaveBeenCalled();
    chip.simulate('click');
    expect(selectIt).toHaveBeenCalled();
  });

  describe('selected state', () => {
    it('should not include the `selected` class by default', () => {
      const chip = shallow(<TagChip tagName="spline" />);

      expect(chip.hasClass('selected')).toBe(false);
    });

    it('should include the `selected` class when selected', () => {
      const chip = shallow(<TagChip tagName="spline" selected />);

      expect(chip.hasClass('selected')).toBe(true);
    });

    it('should toggle the `selected` class with prop changes', () => {
      const chip = shallow(<TagChip tagName="spline" />);

      expect(chip.hasClass('selected')).toBe(false);

      chip.setProps({ selected: true });

      expect(chip.hasClass('selected')).toBe(true);

      chip.setProps({ selected: false });

      expect(chip.hasClass('selected')).toBe(false);
    });
  });

  describe('interactive state', () => {
    it('should include the `interactive` class by default', () => {
      const chip = shallow(<TagChip tagName="spline" />);

      expect(chip.hasClass('interactive')).toBe(true);
    });

    it('should not include the `interactive` class when is not interactive', () => {
      const chip = shallow(<TagChip tagName="spline" interactive={false} />);

      expect(chip.hasClass('interactive')).toBe(false);
    });

    it('should toggle the `interactive` class with prop changes', () => {
      const chip = shallow(<TagChip tagName="spline" />);

      expect(chip.hasClass('interactive')).toBe(true);

      chip.setProps({ interactive: false });

      expect(chip.hasClass('interactive')).toBe(false);

      chip.setProps({ interactive: true });

      expect(chip.hasClass('interactive')).toBe(true);
    });
  });

  it('should not introduce visual regressions', () => {
    const component = renderer.create(<TagChip tagName="spline" />).toJSON();

    expect(component).toMatchSnapshot();
  });
});
