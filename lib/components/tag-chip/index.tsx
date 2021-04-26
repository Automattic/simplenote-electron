import React, { FunctionComponent } from 'react';
import SmallCrossIcon from '../../icons/cross-small';
import classNames from 'classnames';

import type * as T from '../../types';

type OwnProps = {
  onSelect?: (event: React.MouseEvent<HTMLDivElement>) => any;
  selected?: boolean;
  interactive?: boolean;
  deleted?: boolean;
  tagName: T.TagName | undefined;
};

const TagChip: FunctionComponent<OwnProps> = ({
  onSelect,
  selected = false,
  interactive = true,
  deleted = false,
  tagName,
}) => (
  <div
    className={classNames('tag-chip', { selected, interactive, deleted })}
    data-tag-name={tagName}
    onClick={onSelect}
  >
    {tagName}
    {interactive && (
      <span className="remove-tag-icon">
        <SmallCrossIcon />
      </span>
    )}
  </div>
);

export default TagChip;
