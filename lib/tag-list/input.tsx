import React, {
  ChangeEvent,
  FocusEvent,
  FunctionComponent,
  useState,
} from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import actions from '../state/actions';

import type * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  editable: boolean;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => any;
  tagName: T.TagName;
};

type OwnState = {
  value: string;
};

type DispatchProps = {
  renameTag: (oldTagName: T.TagName, newTagName: T.TagName) => any;
};

type Props = OwnProps & DispatchProps;

export const TagListInput: FunctionComponent<Props> = ({
  editable,
  isSelected,
  onClick,
  renameTag,
  tagName,
}) => {
  const [value, setValue] = useState(tagName);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value.replace(/\s/g, ''));
  };
  const onDone = (event: FocusEvent<HTMLInputElement>) => {
    const newTagName = event.target?.value.trim() as T.TagName;

    if (newTagName && newTagName !== tagName) {
      renameTag(tagName, newTagName);
    } else {
      setValue(tagName);
    }
  };
  const classes = classNames('tag-list-input', 'theme-color-fg', {
    'is-selected': isSelected,
  });

  return editable ? (
    <input
      className={classes}
      readOnly={!editable}
      onClick={onClick}
      value={value}
      onChange={onChange}
      onBlur={onDone}
      spellCheck={false}
    />
  ) : (
    <button className={classes} onClick={onClick}>
      {value}
    </button>
  );
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  renameTag: (oldTagName, newTagName) =>
    actions.data.renameTag(oldTagName, newTagName),
};

export default connect(null, mapDispatchToProps)(TagListInput);
