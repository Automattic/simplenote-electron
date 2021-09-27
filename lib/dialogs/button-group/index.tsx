import React from 'react';
import SmallChevronRightIcon from '../../icons/chevron-right-small';
import PropTypes from 'prop-types';

const ButtonGroup = (props) => {
  const { items, onClickItem } = props;

  return (
    <ul className="button-group">
      {items.map((item) => (
        <li key={item.slug} className="button-group__item">
          <button type="button" onClick={() => onClickItem(item)}>
            {item.name}
            <SmallChevronRightIcon />
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
