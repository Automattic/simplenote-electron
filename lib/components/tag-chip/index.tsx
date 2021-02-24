import React, { FunctionComponent } from 'react';
import SmallCrossIcon from '../../icons/cross-small';
import classNames from 'classnames';

import type * as T from '../../types';

type OwnProps = {
  onSelect?: (event: React.MouseEvent<HTMLDivElement>) => any;
  selected: boolean;
  tagName: T.TagName | undefined;
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
    <span className="remove-tag-icon">
      <SmallCrossIcon />
    </span>
  </div>
);

export default TagChip;
