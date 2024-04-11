import React from 'react';
import renderer from 'react-test-renderer';
import { fireEvent, render } from '@testing-library/react';

import TagChip from './';

describe('TagChip', () => {
  it('should select tag when clicked', () => {
    const selectIt = jest.fn();

    const { getByText } = render(
      <TagChip tagName="spline" onSelect={selectIt} />
    );

    expect(selectIt).not.toHaveBeenCalled();
    fireEvent.click(getByText('spline'));
    expect(selectIt).toHaveBeenCalled();
  });

  describe('selected state', () => {
    it('should not include the `selected` class by default', () => {
      const { container } = render(<TagChip tagName="spline" />);

      expect(container.firstChild.classList.contains('selected')).toBe(false);
    });

    it('should include the `selected` class when selected', () => {
      const { container } = render(<TagChip tagName="spline" selected />);

      expect(container.firstChild.classList.contains('selected')).toBe(true);
    });

    it('should toggle the `selected` class with prop changes', () => {
      const { container, rerender } = render(<TagChip tagName="spline" />);

      expect(container.firstChild.classList.contains('selected')).toBe(false);

      rerender(<TagChip tagName="spline" selected />);

      expect(container.firstChild.classList.contains('selected')).toBe(true);

      rerender(<TagChip tagName="spline" />);

      expect(container.firstChild.classList.contains('selected')).toBe(false);
    });
  });

  describe('interactive state', () => {
    it('should include the `interactive` class by default', () => {
      const { container } = render(<TagChip tagName="spline" />);

      expect(container.firstChild.classList.contains('interactive')).toBe(true);
    });

    it('should not include the `interactive` class when is not interactive', () => {
      const { container } = render(
        <TagChip tagName="spline" interactive={false} />
      );

      expect(container.firstChild.classList.contains('interactive')).toBe(
        false
      );
    });

    it('should toggle the `interactive` class with prop changes', () => {
      const { container, rerender } = render(<TagChip tagName="spline" />);

      expect(container.firstChild.classList.contains('interactive')).toBe(true);

      rerender(<TagChip tagName="spline" interactive={false} />);

      expect(container.firstChild.classList.contains('interactive')).toBe(
        false
      );

      rerender(<TagChip tagName="spline" interactive={true} />);

      expect(container.firstChild.classList.contains('interactive')).toBe(true);
    });
  });

  it('should not introduce visual regressions', () => {
    const component = renderer.create(<TagChip tagName="spline" />).toJSON();

    expect(component).toMatchSnapshot();
  });
});
