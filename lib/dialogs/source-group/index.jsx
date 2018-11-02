import React from 'react';
import PropTypes from 'prop-types';

const SourceGroup = props => {
  const { items, onClickItem } = props;

  return (
    <ul className="source-group">
      {items.map(item => (
        <li key={item.slug} className="source-group__item theme-color-border">
          <button type="button" onClick={() => onClickItem(item)}>
            {item.name}
          </button>
        </li>
      ))}
    </ul>
  );
};

SourceGroup.propTypes = {
  items: PropTypes.array.isRequired,
  onClickItem: PropTypes.func.isRequired,
};

export default SourceGroup;
