import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { noop } from 'lodash';

export const TagChip = ({ onSelect = noop, selected, tag: tagName }) => (
  <div
    className={classNames('tag-chip', { selected })}
    data-tag-name={tagName}
    onClick={onSelect}
  >
    {tagName}
  </div>
);

TagChip.displayName = 'TagChip';

TagChip.propTypes = {
  onSelect: PropTypes.func,
  selected: PropTypes.bool,
  tag: PropTypes.string.isRequired,
};

export default TagChip;
