import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const NavigationBarItem = ({
  icon,
  isSelected = false,
  label,
  onClick,
}) => {
  const classes = classNames('navigation-bar-item', {
    'is-selected': isSelected,
  });

  return (
    <div className={classes}>
      <button type="button" className="button" onClick={onClick}>
        <span className="navigation-bar-item__icon">{icon}</span>
        {label}
      </button>
    </div>
  );
};

NavigationBarItem.propTypes = {
  icon: PropTypes.element.isRequired,
  isSelected: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default NavigationBarItem;
