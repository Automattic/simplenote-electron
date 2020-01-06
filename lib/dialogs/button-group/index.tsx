import React from 'react';
import PropTypes from 'prop-types';

const ButtonGroup = props => {
  const { items, onClickItem } = props;

  return (
    <ul className="button-group">
      {items.map(item => (
        <li key={item.slug} className="button-group__item theme-color-border">
          <button type="button" onClick={() => onClickItem(item)}>
            {item.name}
          </button>
        </li>
      ))}
    </ul>
  );
};

ButtonGroup.propTypes = {
  items: PropTypes.array.isRequired,
  onClickItem: PropTypes.func.isRequired,
};

export default ButtonGroup;
