import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

type OwnProps = {
  onSelect: () => {};
  selected: boolean;
  tag: string;
};

const TagChip: FunctionComponent<OwnProps> = ({ onSelect, selected, tag }) => (
  <div
    className={classNames('tag-chip', { selected })}
    data-tag-name={tag}
    onClick={onSelect}
  >
    {tag}
  </div>
);

export default TagChip;
