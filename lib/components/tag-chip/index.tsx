import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

type OwnProps = {
  onSelect?: (event: React.MouseEvent<HTMLDivElement>) => any;
  selected: boolean;
  tagName: string;
};

const TagChip: FunctionComponent<OwnProps> = ({
  onSelect,
  selected,
  tagName,
}) => (
  <div
    className={classNames('tag-chip', { selected })}
    data-tag-name={tagName}
    onClick={onSelect}
  >
    {tagName}
  </div>
);

export default TagChip;
